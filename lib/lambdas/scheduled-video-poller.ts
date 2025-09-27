import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getSecretValue } from '../infra/client/sm.client'
import { getScheduledNotifications } from '../domain/client/dynamo.utils'
import { MainTable, VIDEO_TYPE_KEY } from '../domain/consts'
import {
    YoutubeNotification,
    YoutubeNotificationProcessingMode,
    YoutubeVideoItem,
    YoutubeVideoType
} from '../domain/main.types'
import { checkVideoType, getVideoProcessingMode } from '../domain/video/video.router'
import { getVideoDetails } from '../domain/video/youtube.tools'

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
            const { videoId } = item
            const { processingMode, videoType: latestVideoType } = await extractProcessingMode(videoId, apiKey, now)
            if (processingMode === 'SCHEDULED') {
                console.log('Video still pending: ', { videoId: item.videoId, latestVideoType })
                continue
            }

            if (processingMode === 'SKIP') {
                await updateProcessingMode(item, now, processingMode)
                console.log('Video not ready for immediate processing', {
                    videoId: item.videoId,
                    latestVideoType,
                    processingMode
                })
                continue
            }

            const notificationPayload: YoutubeNotification = {
                videoId: item.videoId,
                channelId: item.channelId,
                videoTitle: item.videoTitle,
                channelTitle: item.channelTitle,
                channelUri: item.channelUri,
                publishedAt: item.publishedAt,
                processingMode: 'IMMEDIATE',
                captions: item.captions,
                genre: item.genre,
                [VIDEO_TYPE_KEY]: latestVideoType
            }

            const execution = await sfnClient.send(
                new StartExecutionCommand({
                    stateMachineArn,
                    input: JSON.stringify(notificationPayload)
                })
            )

            console.log('Scheduled notification promoted to processing', {
                videoId: item.videoId,
                executionArn: execution.executionArn
            })
            await updateProcessingMode(item, now, processingMode)
        } catch (error) {
            console.error('Failed to process scheduled notification', {
                videoId: item.videoId,
                error
            })
        }
    }
}

const extractProcessingMode = async (
    videoId: string,
    apiKey: string,
    now: number
): Promise<{
    processingMode: YoutubeNotificationProcessingMode
    videoType: YoutubeVideoType
}> => {
    const videoDetails = await getVideoDetails(videoId, apiKey)
    const videoType = checkVideoType(videoDetails)
    const processingMode = getVideoProcessingMode(videoDetails, videoType, now)
    return { processingMode, videoType }
}

const updateProcessingMode = async (
    item: YoutubeVideoItem,
    now: number,
    processingMode: YoutubeNotificationProcessingMode
) => {
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
                ':immediate': processingMode,
                ':updatedAt': now,
                ':scheduled': 'SCHEDULED'
            })
        })
    )
}
