import { YoutubeVideoType } from '../../main.types'
import { get, post } from 'axios-client'

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos'

export const checkVideoType = async (videoId: string, youtubeApiKey: string): Promise<YoutubeVideoType> => {
    const { data } = await get(YOUTUBE_API_URL, {
        params: { id: videoId, key: youtubeApiKey, part: 'snippet,contentDetails,liveStreamingDetails' }
    })

    const v = data.items?.[0]
    if (!v) {
        console.warn(`Video with ID ${videoId} not found.`)
        return 'UNKNOWN'
    }

    const dur = v.contentDetails?.duration ?? 'PT0S'
    const seconds = iso8601ToSeconds(dur)
    if (seconds <= 180) {
        return 'SHORT'
    }
    if (seconds > 7200) {
        return 'LONG'
    }

    const lsd = v.liveStreamingDetails
    if (!lsd) return 'VIDEO'
    if (lsd) {
        if (lsd.actualEndTime) return 'COMPLETED'
        if (lsd.actualStartTime) return 'LIVE'
        if (lsd.scheduledStartTime) return 'UPCOMING'
    }

    return 'UNKNOWN'
}

const checkIfChannelExists = async (channelId: string, youtubeApiKey: string): Promise<boolean> => {
    const { data } = await get('https://www.googleapis.com/youtube/v3/channels', {
        params: { id: channelId, key: youtubeApiKey, part: 'id' }
    })
    console.log('Channel data:', data)
    return data.items?.length > 0
}

export { checkIfChannelExists }

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
