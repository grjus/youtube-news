import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { toSubscribedChannelEntity } from '../../domain/mappers'
import { SubscriptionVideoChannel } from '../../env.types'
import { putItem } from '../../domain/client/dynamo.utils'
import { SubscribedChannelItem } from '../../domain/main.types'
import { badRequestResponse, conflictResponse, createdResponse } from '../../domain/client/lambda.utils'
import { getSecretValue } from '../client/sm.client'
import { checkIfChannelExists } from '../../domain/video/youtube.tools'

const dynamoClient = new DynamoDBClient()

const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const payload = JSON.parse(event.body!) as SubscriptionVideoChannel
        console.log('Getting secret for channel check:', secretName)
        const secret = await getSecretValue(secretName)
        const channelExists = await checkIfChannelExists(payload.channelId, secret.YOUTUBE_API_KEY)
        console.log('Checking if channel exists:', payload.channelId, channelExists)
        if (!channelExists) {
            return badRequestResponse(`Channel: ${payload.channelId} does not exists!`)
        }
        const now = Date.now()
        const subscriptionChannelEntity = toSubscribedChannelEntity({
            ...payload,
            now,
            nextRenewalAt: now,
            isActive: true
        })
        await putItem<SubscribedChannelItem>(subscriptionChannelEntity, tableName, dynamoClient)
        console.log('Channel subscribed:', payload.channelId)
    } catch (error) {
        if ((error as { name?: string }).name === 'ConditionalCheckFailedException') {
            console.log('Channel already subscribed')
            return conflictResponse('Channel already subscribed')
        }
        console.error('Error subscribing to channel', error)
        return badRequestResponse('Error subscribing to channel')
    }

    return createdResponse('Channel subscribed successfully')
}
