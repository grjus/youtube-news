import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SubscriptionVideoChannel } from '../../env.types'
import { updateSubscriptionChannel } from '../../domain/client/dynamo.utils'
import { badRequestResponse, createdResponse } from '../../domain/client/lambda.utils'

const dynamoClient = new DynamoDBClient()

const tableName = process.env.TABLE_NAME!

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    const now = Date.now()
    try {
        const payload = JSON.parse(event.body!) as Pick<
            SubscriptionVideoChannel,
            'channelTitle' | 'channelId' | 'genre' | 'isActive'
        >
        const { channelId } = payload
        await updateSubscriptionChannel(channelId, tableName, dynamoClient, now, {
            isActive: payload.isActive,
            channelTitle: payload.channelTitle,
            genre: payload.genre,
            nextRenewalAt: now
        })
    } catch (error) {
        if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
            console.log('Channel does not exist in subscription pool')
            return badRequestResponse('Channel does not exist in subscription pool')
        }
        console.error('Error subscribing to channel', error)
        return badRequestResponse('Error subscribing to channel')
    }

    return createdResponse('Channel updated successfully')
}
