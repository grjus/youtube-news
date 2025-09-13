import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { toSubscribedChannelEntity } from './utils/mappers'
import { SubscriptionVideoChannels } from '../env.types'
import { putItem } from './utils/dynamo.utils'
import { SubscribedChannelItem } from '../main.types'
import { badRequestResponse, conflictResponse, createdResponse } from './utils/lambda.utils'
import { checkIfChannelExists } from './utils/youtube.utils'
import { getSecretValue } from './client/sm.client'

const dynamoClient = new DynamoDBClient()

const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    console.log('Lambda handler started', { event })
    try {
        const payload = JSON.parse(event.body!) as SubscriptionVideoChannels
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
            lastSubscribedAt: now,
            leaseDays: 4,
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
