import { post } from 'axios-client'

export const sendMessageToTelegramChannel = async (
    message: string,
    botSecret: string,
    channelId: string,
    replyToMessageId?: number
): Promise<void> => {
    const telegramApiUrl = `https://api.telegram.org/bot${botSecret}/sendMessage`
    const botMessage: Record<string, unknown> = {
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML'
    }
    if (replyToMessageId !== undefined) {
        botMessage.reply_to_message_id = replyToMessageId
    }
    await post(telegramApiUrl, botMessage)
    console.log('Message sent to chat successfully.')
}
