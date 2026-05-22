import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'
import { extractYoutubeVideoId } from '../domain/video/youtube-url'

const stateMachineArn = process.env.STATE_MACHINE_ARN!

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

    const videoId = extractYoutubeVideoId(telegramMessage.text)
    if (!videoId) {
        console.log('No YouTube URL found in message')
        return OK
    }

    const chatId = String(telegramMessage.chat.id)

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
