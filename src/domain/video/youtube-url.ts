const YOUTU_BE_PATTERN = /youtu\.be\/([A-Za-z0-9_-]{11})/
const YOUTUBE_WATCH_PATTERN = /youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{11})/
const YOUTUBE_PATH_PATTERN = /youtube\.com\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})/

const YOUTUBE_URL_PATTERN = /https?:\/\/[^\s]+/

export const extractYoutubeVideoId = (text: string): string | null => {
    for (const pattern of [YOUTU_BE_PATTERN, YOUTUBE_WATCH_PATTERN, YOUTUBE_PATH_PATTERN]) {
        const match = text.match(pattern)
        if (match) return match[1]
    }
    return null
}

export const extractInstruction = (text: string): string => {
    const match = text.match(YOUTUBE_URL_PATTERN)
    if (!match) return ''
    const before = text.slice(0, match.index).trim()
    const after = text.slice(match.index! + match[0].length).trim()
    return [before, after].filter(Boolean).join(' ')
}
