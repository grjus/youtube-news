import { APIGatewayProxyHandlerV2, APIGatewayProxyResult } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { badRequestResponse } from '../../domain/client/lambda.utils'
import { getChannel } from '../../domain/client/dynamo.utils'
import { toSubscribedChannelDto } from '../../domain/mappers'
import { getSecretValue } from '../client/sm.client'
import { checkIfChannelExists } from '../../domain/video/youtube.tools'

const dynamoClient = new DynamoDBClient()

const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const channelId = event.pathParameters?.channelId
    if (!channelId) {
        return badRequestResponse('Missing channelId in path parameters')
    }
    try {
        const secret = await getSecretValue(secretName)
        const [channel, isAvailableOnYoutube] = await Promise.all([
            getChannel(tableName, channelId, dynamoClient),
            checkIfChannelExists(channelId, secret.YOUTUBE_API_KEY)
        ])
        if (!channel) {
            return badRequestResponse(`Channel not found: [${channelId}]`)
        }
        return {
            statusCode: 200,
            body: JSON.stringify(toSubscribedChannelDto(channel, isAvailableOnYoutube))
        } satisfies APIGatewayProxyResult
    } catch (error) {
        console.error('Error getting channel', error)
        return badRequestResponse(`Error getting channel: [${channelId}]`)
    }
}
