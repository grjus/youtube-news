import { SQSEvent } from 'aws-lambda'
import { toYoutubeNotification } from './utils/mappers'
import { YoutubeNotification, YoutubeVideoItem } from '../main.types'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { getSecretValue } from './client/sm.client'
import { AcceptablePK, VIDEO_TYPE_KEY } from '../consts'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { getChannel } from './utils/dynamo.utils'
import { checkVideoType, getVideoProcessingRoute } from '../domain/video.router'
import { getVideoDetails } from '../domain/youtube.tools'

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
        const videoDetails = await getVideoDetails(baseNotification.videoId, youtubeApiKey)
        if (!videoDetails) {
            console.warn(`Video details not found for videoId: ${baseNotification.videoId}, skipping...`)
            continue
        }
        const videoType = checkVideoType(videoDetails)
        const routeVideo = getVideoProcessingRoute(videoDetails, videoType, now)
        const { channelId, videoId, channelTitle, channelUri, captions } = videoDetails

        const channelDetails = await getChannel(tableName, channelId, dynamoClient)
        if (!channelDetails) {
            console.warn(`Channel [${channelId}] is not registered. Skipping video [${videoId}]`)
            continue
        }
        if (!channelDetails.isActive) {
            console.warn(`No active subscription for channel [${channelId}], Skipping video [${videoId}]`)
            continue
        }

        const youtubeNotification = {
            ...baseNotification,
            channelTitle: channelTitle,
            channelUri: channelUri,
            genre: channelDetails.genre,
            captions,
            processingMode: routeVideo,
            [VIDEO_TYPE_KEY]: videoType
        } satisfies YoutubeNotification

        try {
            await saveYoutubeVideoItem(youtubeNotification, now)
        } catch {
            console.warn(`Video already processed, skipping: ${videoId} for channelId: ${channelId}`)
            continue
        }

        switch (routeVideo) {
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
                continue
            case 'SCHEDULED':
                console.log(`Notification stored for scheduled polling: channel=${channelId}, video=${videoId}`)
                continue
            case 'SKIP':
                console.log(`Skipping video processing as per route decision: ${videoId} for channelId: ${channelId}`)
                continue
            default:
                console.warn(`Unknown processing mode for videoId: ${videoId}. Skipping...`)
        }
    }
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
