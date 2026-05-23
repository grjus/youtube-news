import { toOnDemandMarkdown } from '../../src/domain/chat/message-formatter'
import { CustomInstructionResult, OnDemandSummaryResults, VideoSummary } from '../../src/domain/main-types'
import { MessageType } from '../../src/domain/consts'

const createOnDemandSummary = (
    overrides: Partial<VideoSummary<OnDemandSummaryResults>> = {}
): VideoSummary<OnDemandSummaryResults> =>
    ({
        type: MessageType.SUMMARY,
        id: '550e8400-e29b-41d4-a716-446655440000' as `${string}-${string}-${string}-${string}-${string}`,
        videoTitle: 'Test Video Title',
        videoType: 'STANDARD',
        genre: 'ON_DEMAND',
        videoId: 'dQw4w9WgXcQ',
        channelTitle: 'Test Channel',
        channelUri: 'https://www.youtube.com/channel/test',
        createdAt: Date.now(),
        sendAt: Date.now(),
        summary: {
            summary: ['Key takeaway 1', 'Key takeaway 2', 'Key takeaway 3'],
            shortSummary: 'This is the main point of the video.'
        },
        ...overrides
    }) as VideoSummary<OnDemandSummaryResults>

test('ON_DEMAND formatter does not include video title', () => {
    const message = createOnDemandSummary()
    const result = toOnDemandMarkdown(message)
    expect(result).not.toContain('Test Video Title')
})

test('ON_DEMAND formatter includes the short summary', () => {
    const message = createOnDemandSummary()
    const result = toOnDemandMarkdown(message)
    expect(result).toContain('This is the main point of the video.')
})

test('ON_DEMAND formatter includes all bullet points', () => {
    const message = createOnDemandSummary()
    const result = toOnDemandMarkdown(message)
    expect(result).toContain('• Key takeaway 1')
    expect(result).toContain('• Key takeaway 2')
    expect(result).toContain('• Key takeaway 3')
})

test('ON_DEMAND formatter does not include the youtu.be URL', () => {
    const message = createOnDemandSummary()
    const result = toOnDemandMarkdown(message)
    expect(result).not.toContain('https://youtu.be/dQw4w9WgXcQ')
})

test('ON_DEMAND formatter truncates bullets when message would exceed 4096 chars', () => {
    const longBullet = 'A'.repeat(600)
    const message = createOnDemandSummary({
        summary: {
            summary: [longBullet, longBullet, longBullet, longBullet, longBullet, longBullet, longBullet],
            shortSummary: 'Short summary'
        }
    })
    const result = toOnDemandMarkdown(message)
    expect(result.length).toBeLessThanOrEqual(4096)
})

test('ON_DEMAND formatter output stays within Telegram limit for typical content', () => {
    const message = createOnDemandSummary({
        summary: {
            summary: Array(7).fill('A concise key takeaway point from the video content.'),
            shortSummary: 'A one-sentence TL;DR about the video.'
        }
    })
    const result = toOnDemandMarkdown(message)
    expect(result.length).toBeLessThanOrEqual(4096)
})

test('ON_DEMAND formatter returns plain text when summary is a custom instruction result', () => {
    const message: VideoSummary<CustomInstructionResult> = {
        type: MessageType.SUMMARY,
        id: '550e8400-e29b-41d4-a716-446655440000' as `${string}-${string}-${string}-${string}-${string}`,
        videoTitle: 'Test Video Title',
        videoType: 'STANDARD',
        genre: 'ON_DEMAND',
        videoId: 'dQw4w9WgXcQ',
        channelTitle: 'Test Channel',
        channelUri: 'https://www.youtube.com/channel/test',
        createdAt: Date.now(),
        sendAt: Date.now(),
        summary: { text: 'This is a free-form answer to the custom instruction.' }
    }
    const result = toOnDemandMarkdown(message)
    expect(result).toBe('This is a free-form answer to the custom instruction.')
})

test('ON_DEMAND formatter does not add bullet points for custom instruction result', () => {
    const message: VideoSummary<CustomInstructionResult> = {
        type: MessageType.SUMMARY,
        id: '550e8400-e29b-41d4-a716-446655440000' as `${string}-${string}-${string}-${string}-${string}`,
        videoTitle: 'Test Video Title',
        videoType: 'STANDARD',
        genre: 'ON_DEMAND',
        videoId: 'dQw4w9WgXcQ',
        channelTitle: 'Test Channel',
        channelUri: 'https://www.youtube.com/channel/test',
        createdAt: Date.now(),
        sendAt: Date.now(),
        summary: { text: 'Custom answer without bullet points.' }
    }
    const result = toOnDemandMarkdown(message)
    expect(result).not.toContain('•')
})
