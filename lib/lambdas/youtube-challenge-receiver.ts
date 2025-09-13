import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { updateSubscriptionChannel } from './utils/dynamo.utils'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const tableName = process.env.TABLE_NAME!
const dynamoClient = new DynamoDBClient()

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const challenge = event.queryStringParameters?.['hub.challenge']
    const topic = event.queryStringParameters?.['hub.topic']

    if (challenge && topic) {
        const url = new URL(topic)
        const channelId = url.searchParams.get('channel_id')
        if (!channelId) {
            return { statusCode: 400, body: 'Bad Request: Missing channel_id' }
        }
        console.log(`Received verification request. Responding with challenge: ${challenge}`)
        await updateSubscriptionChannel(channelId, tableName, dynamoClient, {
            isActive: true
        })
        console.log(`Channel ${channelId} marked as active`)
        return {
            statusCode: 200,
            body: challenge
        }
    }
    return { statusCode: 400, body: 'Bad Request' }
}
