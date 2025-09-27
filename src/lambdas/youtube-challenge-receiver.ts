import { APIGatewayProxyEventQueryStringParameters, APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { updateSubscriptionChannel } from '../domain/client/dynamo-utils'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const tableName = process.env.TABLE_NAME!
const dynamoClient = new DynamoDBClient()
const safetyMarginSeconds = 12 * 60 * 60

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const now = Date.now()
    console.log('Received event:', JSON.stringify(event, null, 2))
    const queryParams = parseYoutubeQueryParams(event.queryStringParameters)
    if (!queryParams) {
        return { statusCode: 400, body: 'Bad Request: Missing query parameters' }
    }
    const { mode, challenge, channelId } = queryParams

    if (mode === 'subscribe') {
        const nextRenewalAt = queryParams.leaseSeconds
            ? now + (parseInt(queryParams.leaseSeconds) - safetyMarginSeconds) * 1000
            : now + 60 * 60 * 24 * 4 * 1000

        console.log(`Received [subscription] verification request. Responding with challenge: ${challenge}`)
        await updateSubscriptionChannel(channelId, tableName, dynamoClient, now, {
            isActive: true,
            nextRenewalAt
        })
        console.log(`[Subscription] for channelId ${channelId} is active until ${new Date(nextRenewalAt)}`)
        return {
            statusCode: 200,
            body: challenge
        }
    }
    if (mode === 'unsubscribe') {
        console.log(`Received [unsubscription] verification request. Responding with challenge: ${challenge}`)
        await updateSubscriptionChannel(channelId, tableName, dynamoClient, now, {
            isActive: false,
            nextRenewalAt: null
        })
        console.log(`[Unsubscription] for channelId ${channelId} processed.`)
        return {
            statusCode: 200,
            body: challenge
        }
    }
    return {
        statusCode: 400,
        body: 'Bad Request: Invalid mode'
    }
}

type YoutubeSubscriptionChallengeParams = Readonly<{
    challenge: string
    leaseSeconds?: string
    mode: string
    topic: string
    channelId: string
}>

const parseYoutubeQueryParams = (
    queryStringParameters: APIGatewayProxyEventQueryStringParameters | undefined
): YoutubeSubscriptionChallengeParams | null => {
    const response = {
        challenge: queryStringParameters?.['hub.challenge'],
        mode: queryStringParameters?.['hub.mode'],
        topic: queryStringParameters?.['hub.topic']
    }
    const allParamsPresent = Object.values(response).every((param) => param !== undefined)
    if (!allParamsPresent) {
        return null
    }
    const url = new URL(response.topic!)
    const channelId = url.searchParams.get('channel_id')
    if (!channelId) {
        return null
    }
    const leaseSeconds = queryStringParameters?.['hub.lease_seconds']
    return {
        ...response,
        channelId,
        leaseSeconds
    } as YoutubeSubscriptionChallengeParams
}
