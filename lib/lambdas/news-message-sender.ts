import { ChatNewsMessageInputPayload, ErrorOutput } from '../main.types'
import { sendMessageToTelegramChannel } from './client/telegram.client'
import { getTelegramChannel } from './utils/dynamo.utils'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { getSecretValue } from './client/sm.client'

const tableName = process.env.TABLE_NAME!
const dynamoClient = new DynamoDBClient()
const secretName = process.env.SECRET_NAME!

export const handler = async (payload: ChatNewsMessageInputPayload) => {
    try {
        const secret = await getSecretValue(secretName)
        const telegramChannel = await getTelegramChannel(payload.genre, tableName, dynamoClient)
        if (!telegramChannel) {
            console.error(`Error getting Telegram Channel for genre: ${payload.genre}`)
            return {
                error: `Error getting Telegram Channel for genre: ${payload.genre}`,
                payload,
                subject: `${payload.genre} Chat Message Sender`
            } satisfies ErrorOutput
        }
        await sendMessageToTelegramChannel(payload.message, secret.BOT_API_KEY, telegramChannel.channelId)
        return payload
    } catch (error) {
        console.log('Error sending message to telegram', error)
        return {
            error: 'Error sending message to Telegram',
            payload: { error, payload },
            subject: `${payload.genre} Chat Message Sender`
        } satisfies ErrorOutput
    }
}
