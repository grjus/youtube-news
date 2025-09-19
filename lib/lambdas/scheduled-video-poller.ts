import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getSecretValue } from './client/sm.client'
import { getScheduledNotifications } from './utils/dynamo.utils'
import { checkVideoType } from './utils/youtube.utils'
import { MainTable } from '../consts'
import { YoutubeNotification, YoutubeNotificationItem } from '../main.types'

const dynamoClient = new DynamoDBClient()
const sfnClient = new SFNClient()
const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!
const stateMachineArn = process.env.STATE_MACHINE_ARN!
const cutoffMs = 60 * 60 * 1000
const parsedBatchSize = parseInt(process.env.SCHEDULED_BATCH_SIZE ?? '25', 10)
const defaultBatchSize = Number.isNaN(parsedBatchSize) ? 25 : Math.max(1, parsedBatchSize)

export const handler = async () => {
    const now = Date.now()
    const cutoffTimestamp = now - cutoffMs
    const candidates = await getScheduledNotifications(dynamoClient, tableName, cutoffTimestamp, defaultBatchSize)
    if (candidates.length === 0) {
        console.log('No scheduled notifications ready for processing')
        return
    }

    const secret = await getSecretValue(secretName)
    const apiKey = secret.YOUTUBE_API_KEY

    for (const item of candidates) {
        try {
            const videoType = await checkVideoType(item.videoId, apiKey)
            const readyForProcessing = videoType !== 'LIVE' && videoType !== 'UPCOMING'
            if (!readyForProcessing) {
                console.log('Video still not ready', { videoId: item.videoId, videoType })
                continue
            }

            const notificationPayload: YoutubeNotification = {
                videoId: item.videoId,
                channelId: item.channelId,
                videoTitle: item.videoTitle,
                channelTitle: item.channelTitle,
                channelUri: item.channelUri,
                publishedAt: item.publishedAt,
                processingMode: 'IMMEDIATE'
            }

            const execution = await sfnClient.send(
                new StartExecutionCommand({
                    stateMachineArn,
                    input: JSON.stringify(notificationPayload)
                })
            )
            await markAsImmediate(item, now)
            console.log('Scheduled notification promoted to processing', {
                videoId: item.videoId,
                executionArn: execution.executionArn
            })
        } catch (error) {
            console.error('Failed to process scheduled notification', {
                videoId: item.videoId,
                error
            })
        }
    }
}

const markAsImmediate = async (item: YoutubeNotificationItem, now: number) => {
    await dynamoClient.send(
        new UpdateItemCommand({
            TableName: tableName,
            Key: marshall({
                [MainTable.PK]: item.pk,
                [MainTable.SK]: item.sk
            }),
            UpdateExpression: 'SET processingMode = :immediate, updatedAt = :updatedAt',
            ConditionExpression: 'processingMode = :scheduled',
            ExpressionAttributeValues: marshall({
                ':immediate': 'IMMEDIATE',
                ':updatedAt': now,
                ':scheduled': 'SCHEDULED'
            })
        })
    )
}
