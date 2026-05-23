import { extractInstruction, extractYoutubeVideoId } from '../../src/domain/video/youtube-url'

test('extracts video ID from youtu.be short URL', () => {
    expect(extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from youtu.be URL embedded in text', () => {
    expect(extractYoutubeVideoId('Check this out https://youtu.be/dQw4w9WgXcQ great video')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from youtube.com/watch URL', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from youtube.com/watch URL without www', () => {
    expect(extractYoutubeVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from youtube.com/watch URL with extra params', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?feature=featured&v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from YouTube Shorts URL', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('extracts video ID from YouTube embed URL', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
})

test('returns null when no YouTube URL is present', () => {
    expect(extractYoutubeVideoId('No URL here')).toBeNull()
})

test('returns null for non-YouTube URLs', () => {
    expect(extractYoutubeVideoId('https://vimeo.com/123456789')).toBeNull()
})

test('returns null for empty string', () => {
    expect(extractYoutubeVideoId('')).toBeNull()
})

test('returns first video ID when multiple YouTube URLs are in the text', () => {
    const id = extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ and also https://youtu.be/abcdefghijk')
    expect(id).toBe('dQw4w9WgXcQ')
})

describe('extractInstruction', () => {
    test('returns empty string when message contains only a URL', () => {
        expect(extractInstruction('https://youtu.be/dQw4w9WgXcQ')).toBe('')
    })

    test('returns text that follows the URL', () => {
        expect(extractInstruction('https://youtu.be/dQw4w9WgXcQ focus on AI topics')).toBe('focus on AI topics')
    })

    test('returns text that precedes the URL', () => {
        expect(extractInstruction('summarize in Polish https://youtu.be/dQw4w9WgXcQ')).toBe('summarize in Polish')
    })

    test('returns combined text before and after the URL', () => {
        expect(extractInstruction('please https://youtu.be/dQw4w9WgXcQ briefly')).toBe('please briefly')
    })

    test('returns empty string when no URL is found', () => {
        expect(extractInstruction('no url here')).toBe('')
    })
})
