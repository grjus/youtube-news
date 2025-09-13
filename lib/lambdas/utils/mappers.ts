import { parseStringPromise } from 'xml2js'
import {
    SubscribedChannelItem,
    TranscriptVideo,
    TranscriptVideoItem,
    VideoGenre,
    VideoSummary,
    VideoSummaryItem,
    YoutubeNotification,
    YoutubeNotificationItem,
    YoutubeVideo,
    YoutubeVideoItem
} from '../../main.types'
import { AcceptablePK, MessageType, VIDEO_TYPE_KEY } from '../../consts'

export const toYoutubeNotification = async (xmlPayload: string): Promise<null | YoutubeNotification> => {
    const parsedXml = await parseStringPromise(xmlPayload)
    const entry = parsedXml['feed']['entry'][0]
    if (!entry || !entry['yt:videoId']) {
        return null
    }
    const videoId = entry['yt:videoId'][0]
    return {
        videoId,
        channelId: entry['yt:channelId'][0],
        videoTitle: entry['title'][0],
        channelTitle: entry['author'][0]['name'][0],
        channelUri: entry['author'][0]['uri'][0],
        publishedAt: new Date(entry['published'][0]).getTime()
    } satisfies YoutubeNotification
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

export const toYoutubeNotificationEntity = (payload: YoutubeNotification, now: number): YoutubeNotificationItem => ({
    pk: `${AcceptablePK.YOUTUBE_NOTIFICATION}/${payload.channelId}`,
    sk: payload.channelId,
    timestamp: now,
    videoId: payload.videoId,
    channelId: payload.channelId,
    videoTitle: payload.videoTitle,
    channelTitle: payload.channelTitle,
    channelUri: payload.channelUri,
    publishedAt: payload.publishedAt,
    createdAt: now,
    updatedAt: now
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
    sendAt: payload.createdAt
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
