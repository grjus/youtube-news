import { post } from 'axios-client'

export const sendMessageToTelegramChannel = async (
    message: string,
    botSecret: string,
    channelId: string
): Promise<void> => {
    const telegramApiUrl = `https://api.telegram.org/bot${botSecret}/sendMessage`
    const botMessage = {
        chat_id: channelId,
        text: message,
        parse_mode: 'HTML'
    }
    await post(telegramApiUrl, botMessage)
    console.log('Message sent to chat successfully.')
}
