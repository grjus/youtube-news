import { SQSEvent } from 'aws-lambda'
import { toYoutubeNotification } from './utils/mappers'
import { checkVideoDetails } from './utils/youtube.utils'
import { YoutubeNotification, YoutubeNotificationProcessingMode, YoutubeVideoItem } from '../main.types'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { getSecretValue } from './client/sm.client'
import { AcceptablePK, VIDEO_TYPE_KEY } from '../consts'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getChannel } from './utils/dynamo.utils'

let youtubeApiKey: string | undefined = undefined
const secretName = process.env.SECRET_NAME!
const tableName = process.env.TABLE_NAME!
const stateMachineArn = process.env.STATE_MACHINE_ARN!

const dynamoClient = new DynamoDBClient()
const sfnClient = new SFNClient()

export const handler = async (event: SQSEvent) => {
    const xmlNotifications = event.Records
    const now = Date.now()
    const secret = await getSecretValue(secretName)
    if (!youtubeApiKey) {
        youtubeApiKey = secret.YOUTUBE_API_KEY
    }
    for (const record of xmlNotifications) {
        const baseNotification = await toYoutubeNotification(record.body)
        if (!baseNotification) {
            console.warn(`Invalid video message: ${record.body}`)
            continue
        }
        console.log(`Received notification for videoId: ${baseNotification.videoId}`)
        const { type, caption, details } = await checkVideoDetails(
            baseNotification.videoId,
            baseNotification.channelId,
            secret.YOUTUBE_API_KEY
        )
        const processingMode: YoutubeNotificationProcessingMode =
            type === 'LIVE' || type === 'UPCOMING' ? 'SCHEDULED' : 'IMMEDIATE'

        if (isOlderThan24Hours(baseNotification.publishedAt, now) && type !== 'UPCOMING') {
            console.warn(`Video older than 24 hours: ${JSON.stringify(baseNotification)}`)
            continue
        }

        const { channelId, videoId } = baseNotification

        const channelDetails = await getChannel(tableName, channelId, dynamoClient)
        if (!channelDetails) {
            console.error(`No active subscription for channelId: ${channelId}`)
            continue
        }

        const youtubeNotification = {
            ...baseNotification,
            channelTitle: details.channelTitle,
            channelUri: details.channelUri,
            genre: channelDetails.genre,
            caption,
            processingMode,
            [VIDEO_TYPE_KEY]: type
        } satisfies YoutubeNotification

        try {
            await saveYoutubeVideoItem(youtubeNotification, now)
        } catch {
            console.warn(`Video already processed, skipping: ${videoId} for channelId: ${channelId}`)
            continue
        }

        if (processingMode === 'IMMEDIATE') {
            const stateMachineExecution = await sfnClient.send(
                new StartExecutionCommand({
                    input: JSON.stringify(youtubeNotification),
                    stateMachineArn
                })
            )
            console.log(
                `Execution started: ${stateMachineExecution.executionArn}. Start date: ${stateMachineExecution.startDate}`
            )
        } else {
            console.log(`Notification stored for scheduled polling: channel=${channelId}, video=${videoId}`)
        }
    }
}

const isOlderThan24Hours = (publishedAt: number, now: number): boolean => {
    const miliseconds24Hours = 24 * 60 * 60 * 1000
    return now - publishedAt > miliseconds24Hours
}

const saveYoutubeVideoItem = async (notification: YoutubeNotification, now: number) => {
    const {
        channelId,
        channelUri,
        channelTitle,
        publishedAt,
        videoId,
        videoTitle,
        caption,
        genre,
        videoType,
        processingMode
    } = notification
    const youtubeVideoItem: YoutubeVideoItem = {
        pk: `${AcceptablePK.YOUTUBE_VIDEO}/${channelId}`,
        sk: videoId,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        channelId,
        channelTitle,
        channelUri,
        publishedAt,
        videoId,
        videoTitle,
        videoType,
        caption,
        processingMode,
        genre
    }
    await dynamoClient.send(
        new PutItemCommand({
            TableName: tableName,
            Item: marshall(youtubeVideoItem),
            ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        })
    )
}
