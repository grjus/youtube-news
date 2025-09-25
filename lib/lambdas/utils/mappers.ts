import { parseStringPromise } from 'xml2js'
import {
    SubscribedChannel,
    SubscribedChannelItem,
    TranscriptVideo,
    TranscriptVideoItem,
    VideoGenre,
    VideoSummary,
    VideoSummaryItem,
    YoutubeNotification
} from '../../main.types'
import { AcceptablePK, MessageType, VIDEO_TYPE_KEY } from '../../consts'

export const toYoutubeNotification = async (
    xmlPayload: string
): Promise<null | Omit<YoutubeNotification, 'genre' | 'captions' | typeof VIDEO_TYPE_KEY>> => {
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
        } satisfies Omit<YoutubeNotification, 'genre' | 'captions' | typeof VIDEO_TYPE_KEY>
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
    nextRenewalAt = now + 30 * 24 * 60 * 60 * 1000
}: {
    channelId: string
    channelTitle: string
    genre: Exclude<VideoGenre, 'ALARM'>
    now: number
    nextRenewalAt: number
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
    nextRenewalAt: nextRenewalAt
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

export const toSubscribedChannelDto = (
    payload: SubscribedChannelItem,
    isAvailableOnYoutube: boolean
): SubscribedChannel => ({
    channelId: payload.sk,
    channelTitle: payload.channelTitle,
    genre: payload.genre,
    isActive: payload.isActive,
    nextSubscriptionRenewalAt: payload.nextRenewalAt ? new Date(payload.nextRenewalAt).toISOString() : null,
    isAvailableOnYoutube
})
