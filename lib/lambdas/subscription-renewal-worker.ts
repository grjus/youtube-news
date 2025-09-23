import { SQSEvent } from 'aws-lambda'
import { getSecretValue } from './client/sm.client'
import { subscribeOnce, unsubscribeOnce } from './utils/youtube.utils'

const secretName = process.env.SECRET_NAME!
const apiUrl = process.env.API_URL!

export const handler = async (event: SQSEvent) => {
    const secret = await getSecretValue(secretName)

    for (const record of event.Records) {
        const { channelId, isActive } = JSON.parse(record.body)
        if (isActive) {
            console.log(`Processing channel ${channelId} subscription renewal`)
            const response = await subscribeOnce(channelId, apiUrl, secret.WEBSUB_SECRET)
            if (!response) {
                throw new Error(`[SUBSCRIBE]: Unexpected hub response for channel ${channelId}`)
            }
        }
        console.log(`Processing channel ${channelId} unsubscription`)
        const response = await unsubscribeOnce(channelId, apiUrl, secret.WEBSUB_SECRET)
        if (!response) {
            throw new Error(`[UNSUBSCRIBE]: Unexpected hub response for channel ${channelId}`)
        }
    }
}
