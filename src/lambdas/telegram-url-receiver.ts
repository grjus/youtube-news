import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { extractYoutubeVideoId } from '../domain/video/youtube-url'

const stateMachineArn = process.env.STATE_MACHINE_ARN!
const allowedChatIds = new Set(
    (process.env.ALLOWED_CHAT_IDS ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
)

const sfnClient = new SFNClient()

const OK: APIGatewayProxyResult = { statusCode: 200, body: '' }

type TelegramMessage = {
    chat: { id: number }
    text?: string
}

type TelegramUpdate = {
    update_id: number
    message?: TelegramMessage
    channel_post?: TelegramMessage
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(`Received event: ${JSON.stringify(event, null, 2)}`)
    if (!event.body) {
        return OK
    }

    let update: TelegramUpdate
    try {
        update = JSON.parse(event.body)
    } catch {
        console.warn('Failed to parse Telegram update body')
        return OK
    }

    const telegramMessage = update.message ?? update.channel_post
    if (!telegramMessage?.text) {
        return OK
    }

    const chatId = String(telegramMessage.chat.id)

    if (allowedChatIds.size > 0 && !allowedChatIds.has(chatId)) {
        console.warn(`Ignoring message from unauthorised chat: ${chatId}`)
        return OK
    }

    const videoId = extractYoutubeVideoId(telegramMessage.text)
    if (!videoId) {
        console.log('No YouTube URL found in message')
        return OK
    }

    try {
        const execution = await sfnClient.send(
            new StartExecutionCommand({
                stateMachineArn,
                input: JSON.stringify({ chatId, videoId })
            })
        )
        console.log(`Started execution: ${execution.executionArn}`)
    } catch (error) {
        console.error('Failed to start state machine execution', error)
    }

    return OK
}
