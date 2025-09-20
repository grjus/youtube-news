import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { toYoutubeNotification, toYoutubeNotificationEntity } from './utils/mappers'
import { getSecretValue } from './client/sm.client'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { marshall } from '@aws-sdk/util-dynamodb'
import { DedupItem, YoutubeNotificationProcessingMode } from '../main.types'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { checkVideoType } from './utils/youtube.utils'

const tableName = process.env.TABLE_NAME!
const stateMachineArn = process.env.STATE_MACHINE_ARN
const secretName = process.env.SECRET_NAME!
const dynamoClient = new DynamoDBClient()
const sfnClient = new SFNClient()
const TTL_SECONDS = 60 * 60 * 24

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const secret = await getSecretValue(secretName)

    const now = Date.now()

    const signatureHeader = event.headers['x-hub-signature'] || event.headers['X-Hub-Signature']
    if (!signatureHeader) {
        console.warn('No X-Hub-Signature. Rejecting request.')
        return { statusCode: 403, body: 'Forbidden' }
    }
    if (!event.body) {
        console.warn('No body in the request. Rejecting request.')
        return { statusCode: 400, body: 'Bad Request' }
    }

    const hmac = createHmac('sha1', secret.WEBSUB_SECRET)
    const calculatedSignature = 'sha1=' + hmac.update(event.body).digest('hex')

    if (!timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signatureHeader))) {
        console.error('Invalid signature. Rejecting request.')
        throw new Error('Invalid signature. Rejecting request: ' + JSON.stringify(event, null, 2))
    }

    console.log('Signature verified successfully.')

    const baseNotification = await toYoutubeNotification(event.body)
    if (!baseNotification) {
        console.warn(`Invalid video message: ${event.body}`)
        return { statusCode: 200, body: 'OK' }
    }

    if (isOlderThan24Hours(baseNotification.publishedAt, now)) {
        throw new Error(`Video older than 24 hours: ${JSON.stringify(baseNotification)}`)
    }

    const videoType = await checkVideoType(baseNotification.videoId, secret.YOUTUBE_API_KEY)
    const processingMode: YoutubeNotificationProcessingMode =
        videoType === 'LIVE' || videoType === 'UPCOMING' ? 'SCHEDULED' : 'IMMEDIATE'
    const videoMessage = {
        ...baseNotification,
        processingMode
    }

    const dedupeKey = `WEBSUB#${videoMessage.channelId}:${videoMessage.videoId}`

    try {
        await dynamoClient.send(
            new PutItemCommand({
                TableName: tableName,
                Item: marshall({
                    pk: `DEDUP/${dedupeKey}`,
                    sk: 'CONST',
                    timestamp: now,
                    expireAt: now + TTL_SECONDS,
                    createdAt: now,
                    updatedAt: now
                } satisfies DedupItem),
                ConditionExpression: 'attribute_not_exists(pk)'
            })
        )
        await dynamoClient.send(
            new PutItemCommand({
                TableName: tableName,
                Item: marshall(toYoutubeNotificationEntity(videoMessage, now))
            })
        )
        if (processingMode === 'IMMEDIATE') {
            const stateMachineExecution = await sfnClient.send(
                new StartExecutionCommand({
                    input: JSON.stringify(videoMessage),
                    stateMachineArn
                })
            )
            console.log(
                `Execution started: ${stateMachineExecution.executionArn}. Start date: ${stateMachineExecution.startDate}`
            )
        } else {
            console.log(
                `Notification stored for scheduled polling: channel=${videoMessage.channelId}, video=${videoMessage.videoId}`
            )
        }
    } catch (err: unknown) {
        if (
            typeof err === 'object' &&
            err !== null &&
            'name' in err &&
            err.name === 'ConditionalCheckFailedException'
        ) {
            console.info('Duplicate suppressed', { dedupeKey })
            return { statusCode: 200, body: 'Duplicate suppressed' }
        }
        console.warn('DDB error (suppressed)', err)
    }
    return {
        statusCode: 200,
        body: 'OK'
    }
}

const isOlderThan24Hours = (publishedAt: number, now: number): boolean => {
    const miliseconds24Hours = 24 * 60 * 60 * 1000
    return now - publishedAt > miliseconds24Hours
}
