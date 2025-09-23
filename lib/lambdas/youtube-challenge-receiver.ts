import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { updateSubscriptionChannel } from './utils/dynamo.utils'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const tableName = process.env.TABLE_NAME!
const dynamoClient = new DynamoDBClient()
const safetyMarginSeconds = 12 * 60 * 60

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const now = Date.now()
    console.log('Received event:', JSON.stringify(event, null, 2))
    const challenge = event.queryStringParameters?.['hub.challenge']
    const topic = event.queryStringParameters?.['hub.topic']
    const leaseSeconds = event.queryStringParameters?.['hub.lease_seconds']
    const nextRenewalAt = leaseSeconds
        ? now + (parseInt(leaseSeconds) - safetyMarginSeconds) * 1000
        : now + 60 * 60 * 24 * 4 * 1000

    if (challenge && topic) {
        const url = new URL(topic)
        const channelId = url.searchParams.get('channel_id')
        if (!channelId) {
            return { statusCode: 400, body: 'Bad Request: Missing channel_id' }
        }
        console.log(`Received verification request. Responding with challenge: ${challenge}`)
        await updateSubscriptionChannel(channelId, tableName, dynamoClient, now, {
            isActive: true,
            nextRenewalAt
        })
        console.log(`Subscription for channelId ${channelId} is active until ${new Date(nextRenewalAt)}`)
        return {
            statusCode: 200,
            body: challenge
        }
    }
    return { statusCode: 400, body: 'Bad Request' }
}
