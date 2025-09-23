import { YoutubeCaptionType, YoutubeVideoType } from '../../main.types'
import { get, post } from 'axios-client'

const YOUTUBE_API_VIDEO_URL = 'https://www.googleapis.com/youtube/v3/videos'
const YOUTUBE_API_CAPTIONS_URL = 'https://www.googleapis.com/youtube/v3/captions'
const YOUTUBE_API_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

export const checkVideoType = async (videoId: string, youtubeApiKey: string): Promise<YoutubeVideoType> => {
    const { data } = await get(YOUTUBE_API_VIDEO_URL, {
        params: { id: videoId, key: youtubeApiKey, part: 'snippet,contentDetails,liveStreamingDetails' }
    })

    const v = data.items?.[0]
    if (!v) {
        console.warn(`Video with ID ${videoId} not found.`)
        return 'UNKNOWN'
    }

    const liveBroadcastContent = v.snippet.liveBroadcastContent
    if (liveBroadcastContent === 'live') return 'LIVE'
    if (liveBroadcastContent === 'upcoming') return 'UPCOMING'
    if (liveBroadcastContent === 'none') {
        const dur = v.contentDetails?.duration ?? 'PT0S'
        const seconds = iso8601ToSeconds(dur)
        if (seconds <= 180) {
            return 'SHORT'
        }
        if (seconds > 60 * 60 * 3) {
            return 'LONG'
        }

        const lsd = v.liveStreamingDetails
        if (!lsd) return 'VIDEO'
    }

    return 'UNKNOWN'
}

export const checkVideoCaptions = async (videoId: string, youtubeApiKey: string): Promise<YoutubeCaptionType> => {
    const { data } = await get(YOUTUBE_API_CAPTIONS_URL, {
        params: { videoId: videoId, key: youtubeApiKey, part: 'id,snippet' }
    })
    const v = data.items?.[0]
    if (!v) {
        console.warn(`Captions for video ${videoId} not found. Defaulting to AUTO_GENERATED.`)
        return 'AUTO_GENERATED'
    }
    return v.snippet.trackKind === 'ASR' ? 'AUTO_GENERATED' : 'USER_GENERATED'
}

export const checkVideoDetails = async (
    videoId: string,
    channelId: string,
    youtubeApiKey: string
): Promise<{
    type: YoutubeVideoType
    caption: YoutubeCaptionType
    details: { channelTitle: string; channelUri: string }
}> => {
    const [caption, type, details] = await Promise.all([
        checkVideoCaptions(videoId, youtubeApiKey),
        checkVideoType(videoId, youtubeApiKey),
        checkChannelDetails(channelId, youtubeApiKey)
    ])

    return { type, caption, details }
}

const checkChannelDetails = async (channelId: string, youtubeApiKey: string) => {
    const { data } = await get(YOUTUBE_API_CHANNELS_URL, {
        params: { id: channelId, key: youtubeApiKey, part: 'snippet' }
    })
    const v = data.items?.[0]
    if (!v) {
        console.warn(`Channel with ID ${channelId} not found.`)
        throw new Error('Channel not found')
    }
    return {
        channelTitle: v.snippet.title,
        channelUri: `https://www.youtube.com/channel/${channelId}`
    }
}

export const checkIfChannelExists = async (channelId: string, youtubeApiKey: string): Promise<boolean> => {
    const { data } = await get(YOUTUBE_API_CHANNELS_URL, {
        params: { id: channelId, key: youtubeApiKey, part: 'id' }
    })
    console.log('Channel data:', data)
    return data.items?.length > 0
}

const iso8601ToSeconds = (iso: string): number => {
    const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso) || []
    const h = parseInt(m[1] || '0', 10)
    const min = parseInt(m[2] || '0', 10)
    const s = parseInt(m[3] || '0', 10)
    return h * 3600 + min * 60 + s
}

export const subscribeOnce = async (channelId: string, apiUrl: string, secret: string): Promise<boolean> => {
    const params = new URLSearchParams()
    const hubUrl = 'https://pubsubhubbub.appspot.com/subscribe'
    params.append('hub.mode', 'subscribe')
    params.append('hub.topic', `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`)
    params.append('hub.callback', apiUrl)
    params.append('hub.verify', 'async')
    params.append('hub.secret', secret)
    const resp = await post(hubUrl, params)
    if (resp.status !== 202 && resp.status !== 204) {
        throw new Error(`Subscribe failed: ${channelId} -> ${resp.status} ${resp.statusText}`)
    }
    return true
}
