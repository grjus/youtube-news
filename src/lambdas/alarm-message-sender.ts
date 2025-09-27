import { SQSEvent } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { getTelegramChannel } from '../domain/client/dynamo-utils'
import { sendMessageToTelegramChannel } from '../clients/aws/telegram-client'
import { getSecretValue } from '../clients/aws/secrets-manager-client'
import { toAlarmMessage } from '../domain/chat/message-formatter'

const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

const dynamoClient = new DynamoDBClient()
let alarmChannelId: string
let botApiKey: string

export const handler = async (event: SQSEvent) => {
    if (!alarmChannelId) {
        const alarmChannel = await getTelegramChannel('ALARM', tableName, dynamoClient)
        if (!alarmChannel) {
            console.error('Missing telegram channel for ALARM')
            return
        }
        alarmChannelId = alarmChannel.channelId
    }
    if (!botApiKey) {
        const secret = await getSecretValue(secretName)
        botApiKey = secret.BOT_API_KEY
    }

    const tasks = event.Records.map(async (rec) => {
        try {
            let message: string
            const parsedBody = JSON.parse(rec.body)
            if (!parsedBody['Message']) {
                message = rec.body
            } else {
                message = JSON.stringify(parsedBody['Message'])
            }

            await sendMessageToTelegramChannel(toAlarmMessage(message), botApiKey, alarmChannelId)
        } catch (err) {
            console.error('Failed to send DLQ message to Telegram', {
                messageId: rec.messageId,
                error: err
            })
        }
    })

    await Promise.allSettled(tasks)
}
