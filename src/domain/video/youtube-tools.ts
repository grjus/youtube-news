import { get, post } from 'axios-client'
import { YoutubeCaptionType, YoutubeLifeBroadcastStatus, YoutubeVideoDetails } from '../main-types'
import { iso8601ToSeconds } from './video-router'

const YOUTUBE_API_VIDEO_URL = 'https://www.googleapis.com/youtube/v3/videos'
const YOUTUBE_API_CAPTIONS_URL = 'https://www.googleapis.com/youtube/v3/captions'
const YOUTUBE_API_CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels'

const fetchVideoCaptionsType = async (
    videoId: string,
    youtubeApiKey: string
): Promise<{
    captions: YoutubeCaptionType
}> => {
    try {
        const { data } = await get(YOUTUBE_API_CAPTIONS_URL, {
            params: { videoId: videoId, key: youtubeApiKey, part: 'id,snippet' }
        })
        const v = data.items?.[0]
        if (!v) {
            console.warn(`Captions for video ${videoId} not found. Defaulting to AUTO_GENERATED.`)
            return { captions: 'AUTO_GENERATED' }
        }
        return v.snippet.trackKind.toUpperCase() === 'ASR'
            ? { captions: 'AUTO_GENERATED' }
            : { captions: 'USER_GENERATED' }
    } catch (error) {
        console.error('Error fetching video captions type:', error)
        return { captions: 'AUTO_GENERATED' }
    }
}

const isMembersOnlyVideo = async (videoId: string): Promise<{ isMembersOnly: boolean }> => {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
    const { data: html } = await get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s)
    if (!m) return { isMembersOnly: false }

    let player
    try {
        player = JSON.parse(m[1])
    } catch {
        return { isMembersOnly: false }
    }

    const errorScreen = player?.playabilityStatus?.errorScreen?.playerLegacyDesktopYpcOfferRenderer?.offerId
    return { isMembersOnly: errorScreen === 'sponsors_only_video' }
}

const getVideoDetails = async (videoId: string, youtubeApiKey: string): Promise<YoutubeVideoDetails> => {
    const [details, captions, membersOnly] = await Promise.all([
        fetchVideoDetails(videoId, youtubeApiKey),
        fetchVideoCaptionsType(videoId, youtubeApiKey),
        isMembersOnlyVideo(videoId)
    ])

    return { ...details, ...captions, ...membersOnly }
}

const fetchVideoDetails = async (videoId: string, youtubeApiKey: string) => {
    const { data } = await get(YOUTUBE_API_VIDEO_URL, {
        params: {
            id: videoId,
            key: youtubeApiKey,
            part: 'snippet,contentDetails,player,liveStreamingDetails,status'
        }
    })
    if (!data.items?.length) {
        throw new Error(`Video not found: ${videoId}`)
    }
    const item = data.items[0]
    return {
        videoId: item.id,
        publishedAt: item.snippet.publishedAt,
        videoTitle: item.snippet.title,
        videoDescription: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        channelUri: `https://www.youtube.com/channel/${item.snippet.channelId}`,
        liveBroadcastContent: item.snippet.liveBroadcastContent as YoutubeLifeBroadcastStatus,
        duration: item.contentDetails.duration,
        durationSeconds: iso8601ToSeconds(item.contentDetails.duration),
        liveStreamingDetails: item.liveStreamingDetails,
        privacyStatus: item.status.privacyStatus
    } satisfies Omit<YoutubeVideoDetails, 'captions' | 'isMembersOnly'>
}

const checkIfChannelExists = async (channelId: string, youtubeApiKey: string): Promise<boolean> => {
    const { data } = await get(YOUTUBE_API_CHANNELS_URL, {
        params: { id: channelId, key: youtubeApiKey, part: 'id' }
    })
    console.log('Channel data:', data)
    return data.items?.length > 0
}

const subscribeOnce = async (channelId: string, apiUrl: string, secret: string): Promise<boolean> => {
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

const unsubscribeOnce = async (channelId: string, apiUrl: string, secret: string): Promise<boolean> => {
    const params = new URLSearchParams()
    const hubUrl = 'https://pubsubhubbub.appspot.com/subscribe'
    params.append('hub.mode', 'unsubscribe')
    params.append('hub.topic', `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`)
    params.append('hub.callback', apiUrl)
    params.append('hub.verify', 'async')
    params.append('hub.secret', secret)
    const resp = await post(hubUrl, params)
    if (resp.status !== 202 && resp.status !== 204) {
        throw new Error(`Unsubscribe failed: ${channelId} -> ${resp.status} ${resp.statusText}`)
    }
    return true
}

export { getVideoDetails, checkIfChannelExists, subscribeOnce, unsubscribeOnce }
