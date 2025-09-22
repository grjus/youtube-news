import { parseStringPromise } from 'xml2js'
import {
    SubscribedChannelItem,
    TranscriptVideo,
    TranscriptVideoItem,
    VideoGenre,
    VideoSummary,
    VideoSummaryItem,
    YoutubeNotification,
    YoutubeVideo,
    YoutubeVideoItem
} from '../../main.types'
import { AcceptablePK, MessageType, VIDEO_TYPE_KEY } from '../../consts'

export const toYoutubeNotification = async (
    xmlPayload: string
): Promise<null | Omit<YoutubeNotification, 'genre' | 'caption' | typeof VIDEO_TYPE_KEY>> => {
    try {
        const parsedXml = await parseStringPromise(xmlPayload)
        console.log('Parsed XML:', JSON.stringify(parsedXml, null, 2))
        const entry = parsedXml['feed']['entry'][0]
        if (!entry || !entry['yt:videoId']) {
            return null
        }
        const videoId = entry['yt:videoId'][0]
        const publishedAt = new Date(entry['published'][0]).getTime()
        return {
            videoId,
            channelId: entry['yt:channelId'][0],
            videoTitle: entry['title'][0],
            channelTitle: 'n/a',
            channelUri: 'n/a',
            publishedAt,
            processingMode: 'IMMEDIATE'
        } satisfies Omit<YoutubeNotification, 'genre' | 'caption' | typeof VIDEO_TYPE_KEY>
    } catch (error) {
        console.error('Failed to parse XML payload', error)
        return null
    }
}

export const toVideoTranscript = (payload: TranscriptVideoItem): TranscriptVideo => ({
    id: payload.sk,
    type: MessageType.TRANSCRIPTION,
    channelId: payload.pk.split('/')[1],
    videoType: payload.videoType,
    genre: payload.genre,
    videoId: payload.videoId,
    videoTitle: payload.videoTitle,
    channelTitle: payload.channelTitle,
    channelUri: payload.channelUri,
    publishedAt: payload.publishedAt,
    transcript: payload.transcript,
    createdAt: payload.createdAt,
    sendAt: payload.createdAt
})

export const toSubscribedChannelEntity = ({
    channelId,
    channelTitle,
    genre,
    isActive,
    now = Date.now(),
    lastSubscribedAt = now,
    nextRenewalAt = now + 30 * 24 * 60 * 60 * 1000,
    leaseDays = 4
}: {
    channelId: string
    channelTitle: string
    genre: Exclude<VideoGenre, 'ALARM'>
    now: number
    lastSubscribedAt: number
    nextRenewalAt: number
    leaseDays: number
    isActive: boolean
}): SubscribedChannelItem => ({
    pk: AcceptablePK.SUBSCRIBED_CHANNEL,
    sk: channelId,
    timestamp: now,
    channelTitle,
    genre,
    isActive,
    createdAt: now,
    updatedAt: now,
    lastSubscribedAt: lastSubscribedAt,
    nextRenewalAt: nextRenewalAt,
    leaseDays: leaseDays
})

export const toYoutubeVideo = (payload: YoutubeVideoItem): YoutubeVideo => ({
    videoId: payload.videoId,
    channelId: payload.channelId,
    videoTitle: payload.videoTitle,
    channelTitle: payload.channelTitle,
    channelUri: payload.channelUri,
    publishedAt: payload.publishedAt,
    videoType: payload[VIDEO_TYPE_KEY],
    genre: payload.genre,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    type: MessageType.YOUTUBE_VIDEO,
    id: payload.sk,
    sendAt: payload.createdAt,
    caption: payload.caption,
    processingMode: payload.processingMode
})

export const toVideoSummary = <T>(payload: VideoSummaryItem<T>): VideoSummary<T> => ({
    type: MessageType.SUMMARY,
    id: payload['sk'],
    videoTitle: payload.videoTitle,
    videoType: payload.videoType,
    genre: payload.genre,
    videoId: payload.videoId,
    channelTitle: payload.channelTitle,
    channelUri: payload.channelUri,
    summary: payload.summary,
    createdAt: payload.createdAt,
    sendAt: payload.createdAt
})
