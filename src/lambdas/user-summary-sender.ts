import { ErrorOutput } from '../domain/main-types'
import { sendMessageToTelegramChannel } from '../clients/aws/telegram-client'
import { getSecretValue } from '../clients/aws/secrets-manager-client'

const secretName = process.env.SECRET_NAME!

export type UserSummaryMessagePayload = Readonly<{
    chatId: string
    message: string
}>

export const handler = async (payload: UserSummaryMessagePayload): Promise<UserSummaryMessagePayload | ErrorOutput> => {
    try {
        const secret = await getSecretValue(secretName)
        await sendMessageToTelegramChannel(payload.message, secret.BOT_API_KEY, payload.chatId)
        return payload
    } catch (error) {
        console.error('Error sending summary to user', error instanceof Error ? error.message : String(error))
        return {
            error: 'Error sending summary to user',
            payload: { chatId: payload.chatId },
            subject: 'User Summary Sender'
        } satisfies ErrorOutput
    }
}
