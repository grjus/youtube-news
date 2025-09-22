import { SQSEvent } from 'aws-lambda'
import { getSecretValue } from './client/sm.client'
import { subscribeOnce } from './utils/youtube.utils'

const secretName = process.env.SECRET_NAME!
const apiUrl = process.env.API_URL!

export const handler = async (event: SQSEvent) => {
    const secret = await getSecretValue(secretName)

    for (const record of event.Records) {
        const { channelId } = JSON.parse(record.body)
        console.log(`Processing channel ${channelId} subscription renewal`)
        const response = await subscribeOnce(channelId, apiUrl, secret.WEBSUB_SECRET)
        if (!response) {
            throw new Error(`Unexpected hub response for channel ${channelId}`)
        }
    }
}
