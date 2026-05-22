const YOUTU_BE_PATTERN = /youtu\.be\/([A-Za-z0-9_-]{11})/
const YOUTUBE_WATCH_PATTERN = /youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{11})/
const YOUTUBE_PATH_PATTERN = /youtube\.com\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})/

export const extractYoutubeVideoId = (text: string): string | null => {
    for (const pattern of [YOUTU_BE_PATTERN, YOUTUBE_WATCH_PATTERN, YOUTUBE_PATH_PATTERN]) {
        const match = text.match(pattern)
        if (match) return match[1]
    }
    return null
}
