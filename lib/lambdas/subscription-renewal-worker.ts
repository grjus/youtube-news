import { SQSEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { getSecretValue } from './client/sm.client'
import { subscribeOnce } from './utils/youtube.utils'
import { updateSubscriptionChannel } from './utils/dynamo.utils'

const dynamoClient = new DynamoDBClient()
const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!
const apiUrl = process.env.API_URL!

export const handler = async (event: SQSEvent) => {
    const secret = await getSecretValue(secretName)
    const receivedAt = Date.now()

    for (const record of event.Records) {
        const { channelId, leaseDays } = JSON.parse(record.body)
        console.log(`Processing channel ${channelId} for ${leaseDays} days`)
        const ok = await subscribeOnce(channelId, apiUrl, secret.WEBSUB_SECRET)
        if (!ok) {
            throw new Error(`Unexpected hub response for channel ${channelId}`)
        }

        const lease = leaseDays * 24 * 60 * 60 * 1000

        const nextRenewalAt = receivedAt + lease

        await updateSubscriptionChannel(channelId, tableName, dynamoClient, {
            nextRenewalAt,
            isActive: false
        })
    }
}
