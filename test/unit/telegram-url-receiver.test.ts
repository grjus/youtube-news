import { APIGatewayProxyEvent } from 'aws-lambda'

const mockSend = jest.fn()
jest.mock('@aws-sdk/client-sfn', () => ({
    SFNClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    StartExecutionCommand: jest.fn().mockImplementation((input) => input)
}))

const makeEvent = (body: unknown): APIGatewayProxyEvent =>
    ({ body: JSON.stringify(body) }) as unknown as APIGatewayProxyEvent

const youtubeUrl = 'https://youtu.be/dQw4w9WgXcQ'

const messageUpdate = (chatId: number, text: string) => ({
    update_id: 1,
    message: { chat: { id: chatId }, text }
})

const channelPostUpdate = (chatId: number, text: string) => ({
    update_id: 2,
    channel_post: { chat: { id: chatId }, text }
})

describe('telegram-url-receiver', () => {
    let handler: (event: APIGatewayProxyEvent) => Promise<{ statusCode: number; body: string }>

    beforeEach(() => {
        jest.resetModules()
        mockSend.mockReset()
    })

    describe('when ALLOWED_CHAT_IDS is set', () => {
        beforeEach(() => {
            process.env.ALLOWED_CHAT_IDS = '-100111,-100222'
            process.env.STATE_MACHINE_ARN = 'arn:aws:states:eu-west-1:123:stateMachine:test'
            handler = require('../../src/lambdas/telegram-url-receiver').handler
        })

        afterEach(() => {
            delete process.env.ALLOWED_CHAT_IDS
            delete process.env.STATE_MACHINE_ARN
        })

        test('allows a message from an authorised chat and starts execution', async () => {
            mockSend.mockResolvedValue({ executionArn: 'arn:exec:1' })
            const result = await handler(makeEvent(messageUpdate(-100111, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).toHaveBeenCalledTimes(1)
        })

        test('ignores a message from an unauthorised chat without starting execution', async () => {
            const result = await handler(makeEvent(messageUpdate(-100999, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).not.toHaveBeenCalled()
        })

        test('allows a channel_post from an authorised chat', async () => {
            mockSend.mockResolvedValue({ executionArn: 'arn:exec:2' })
            const result = await handler(makeEvent(channelPostUpdate(-100222, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).toHaveBeenCalledTimes(1)
        })

        test('ignores a channel_post from an unauthorised chat', async () => {
            const result = await handler(makeEvent(channelPostUpdate(-100999, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).not.toHaveBeenCalled()
        })
    })

    describe('when ALLOWED_CHAT_IDS is empty', () => {
        beforeEach(() => {
            process.env.ALLOWED_CHAT_IDS = ''
            process.env.STATE_MACHINE_ARN = 'arn:aws:states:eu-west-1:123:stateMachine:test'
            handler = require('../../src/lambdas/telegram-url-receiver').handler
        })

        afterEach(() => {
            delete process.env.ALLOWED_CHAT_IDS
            delete process.env.STATE_MACHINE_ARN
        })

        test('allows any chat when ALLOWED_CHAT_IDS is empty', async () => {
            mockSend.mockResolvedValue({ executionArn: 'arn:exec:3' })
            const result = await handler(makeEvent(messageUpdate(-100999, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).toHaveBeenCalledTimes(1)
        })
    })

    describe('when ALLOWED_CHAT_IDS is not set', () => {
        beforeEach(() => {
            delete process.env.ALLOWED_CHAT_IDS
            process.env.STATE_MACHINE_ARN = 'arn:aws:states:eu-west-1:123:stateMachine:test'
            handler = require('../../src/lambdas/telegram-url-receiver').handler
        })

        afterEach(() => {
            delete process.env.STATE_MACHINE_ARN
        })

        test('allows any chat when ALLOWED_CHAT_IDS is not set', async () => {
            mockSend.mockResolvedValue({ executionArn: 'arn:exec:4' })
            const result = await handler(makeEvent(messageUpdate(-100111, youtubeUrl)))
            expect(result.statusCode).toBe(200)
            expect(mockSend).toHaveBeenCalledTimes(1)
        })
    })

    describe('edge cases', () => {
        beforeEach(() => {
            process.env.ALLOWED_CHAT_IDS = '-100111'
            process.env.STATE_MACHINE_ARN = 'arn:aws:states:eu-west-1:123:stateMachine:test'
            handler = require('../../src/lambdas/telegram-url-receiver').handler
        })

        afterEach(() => {
            delete process.env.ALLOWED_CHAT_IDS
            delete process.env.STATE_MACHINE_ARN
        })

        test('returns 200 without execution when body is missing', async () => {
            const result = await handler({ body: null } as unknown as APIGatewayProxyEvent)
            expect(result.statusCode).toBe(200)
            expect(mockSend).not.toHaveBeenCalled()
        })

        test('returns 200 without execution when message has no YouTube URL', async () => {
            const result = await handler(makeEvent(messageUpdate(-100111, 'hello world')))
            expect(result.statusCode).toBe(200)
            expect(mockSend).not.toHaveBeenCalled()
        })

        test('returns 200 without execution when message text is absent', async () => {
            const result = await handler(
                makeEvent({ update_id: 1, message: { chat: { id: -100111 } } })
            )
            expect(result.statusCode).toBe(200)
            expect(mockSend).not.toHaveBeenCalled()
        })
    })
})
