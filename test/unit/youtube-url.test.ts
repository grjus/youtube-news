import { extractYoutubeVideoId } from '../../src/domain/video/youtube-url'

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
