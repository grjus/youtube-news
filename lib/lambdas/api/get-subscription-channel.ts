import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { badRequestResponse } from '../utils/lambda.utils'
import { getChannel } from '../utils/dynamo.utils'
import { toSubscribedChannelDto } from '../utils/mappers'

const dynamoClient = new DynamoDBClient()

const tableName = process.env.TABLE_NAME!

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const channelId = event.pathParameters?.channelId
    if (!channelId) {
        return badRequestResponse('Missing channelId in path parameters')
    }
    try {
        const channel = await getChannel(channelId, tableName, dynamoClient)
        if (!channel) {
            return badRequestResponse(`Channel not found: [${channelId}]`)
        }
        return {
            statusCode: 200,
            body: JSON.stringify(toSubscribedChannelDto(channel))
        } satisfies APIGatewayProxyResult
    } catch (error) {
        console.error('Error getting channel', error)
        return badRequestResponse(`Error getting channel: [${channelId}]`)
    }
}
