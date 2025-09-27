import { SQSEvent } from 'aws-lambda'
import { toYoutubeNotification } from '../domain/mappers'
import {
    SubscribedChannelItem,
    YoutubeNotification,
    YoutubeNotificationProcessingMode,
    YoutubeVideoItem
} from '../domain/main-types'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { getSecretValue } from '../clients/aws/secrets-manager-client'
import { AcceptablePK, VIDEO_TYPE_KEY } from '../domain/consts'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getChannel } from '../domain/client/dynamo-utils'
import { checkVideoType, getVideoProcessingMode } from '../domain/video/video-router'
import { getVideoDetails } from '../domain/video/youtube-tools'

let youtubeApiKey: string | undefined = undefined
const secretName = process.env.SECRET_NAME!
const tableName = process.env.TABLE_NAME!
const stateMachineArn = process.env.STATE_MACHINE_ARN!

const dynamoClient = new DynamoDBClient()
const sfnClient = new SFNClient()

export const handler = async (event: SQSEvent) => {
    const apiKey = await ensureYoutubeApiKey()
    const now = Date.now()
    for (const record of event.Records) {
        const baseNotification = await toYoutubeNotification(record.body)
        if (!baseNotification) {
            console.warn(`Invalid video message: ${record.body}`)
            continue
        }
        console.log(`Received notification for videoId: ${baseNotification.videoId}`)
        const videoDetails = await getVideoDetails(baseNotification.videoId, apiKey)
        if (!videoDetails) {
            console.warn(`Video details not found for videoId: ${baseNotification.videoId}, skipping...`)
            continue
        }
        const channelDetails = await verifyYoutubeChannel(videoDetails.channelId)
        if (!channelDetails) {
            continue
        }

        const videoType = checkVideoType(videoDetails)
        const processingMode = getVideoProcessingMode(videoDetails, videoType, now)
        const { channelId, videoId, channelTitle, channelUri, captions } = videoDetails

        const youtubeNotification = {
            ...baseNotification,
            channelTitle: channelTitle,
            channelUri: channelUri,
            genre: channelDetails.genre,
            captions,
            processingMode,
            [VIDEO_TYPE_KEY]: videoType
        } satisfies YoutubeNotification

        if (processingMode !== 'SKIP') {
            try {
                await saveYoutubeVideoItem(youtubeNotification, now)
            } catch {
                console.warn(`Video already processed, skipping: ${videoId} for channelId: ${channelId}`)
                continue
            }
        }
        await processYoutubeNotificationByMode(processingMode, youtubeNotification)
    }
}

const processYoutubeNotificationByMode = async (
    processingMode: YoutubeNotificationProcessingMode,
    youtubeNotification: YoutubeNotification
) => {
    const { channelId, videoId } = youtubeNotification
    switch (processingMode) {
        case 'IMMEDIATE':
            const stateMachineExecution = await sfnClient.send(
                new StartExecutionCommand({
                    input: JSON.stringify(youtubeNotification),
                    stateMachineArn
                })
            )
            console.log(
                `Execution started: ${stateMachineExecution.executionArn}. Start date: ${stateMachineExecution.startDate}`
            )
            return
        case 'SCHEDULED':
            console.log(`Notification stored for scheduled polling: channel=${channelId}, video=${videoId}`)
            return
        case 'SKIP':
            console.log(`Skipping video processing as per route decision: ${videoId} for channelId: ${channelId}`)
            return
        default:
            console.warn(`Unknown processing mode for videoId: ${videoId}. Skipping...`)
    }
}

const verifyYoutubeChannel = async (channelId: string): Promise<SubscribedChannelItem | null> => {
    const channelDetails = await getChannel(tableName, channelId, dynamoClient)
    if (!channelDetails) {
        console.warn(`Channel [${channelId}] is not registered.`)
        return null
    }
    if (!channelDetails.isActive) {
        console.warn(`No active subscription for channel [${channelId}].`)
        return null
    }
    return channelDetails
}

const saveYoutubeVideoItem = async (notification: YoutubeNotification, now: number) => {
    const {
        channelId,
        channelUri,
        channelTitle,
        publishedAt,
        videoId,
        videoTitle,
        captions,
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
        captions,
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

const ensureYoutubeApiKey = async (): Promise<string> => {
    if (!youtubeApiKey) {
        const secret = await getSecretValue(secretName)
        youtubeApiKey = secret.YOUTUBE_API_KEY
    }
    if (!youtubeApiKey) {
        throw new Error('Youtube API key not available')
    }
    return youtubeApiKey
}
