import { AcceptablePK, ERROR_OUTPUT_ATTR_KEY, MainTable, MessageType, VIDEO_GENRE_KEY, VIDEO_TYPE_KEY } from './consts'
import { UUID } from 'node:crypto'
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda'

export type YoutubeNotificationProcessingMode = 'IMMEDIATE' | 'SCHEDULED' | 'SKIP'
export type YoutubeCaptionType = 'AUTO_GENERATED' | 'USER_GENERATED' | 'NONE'

export interface TimeStamps {
    createdAt: number
    updatedAt: number
}

export type AcceptablePKValue =
    | `${AcceptablePK.YOUTUBE_VIDEO}/${string}`
    | `${AcceptablePK.YOUTUBE_NOTIFICATION}/${string}`
    | `${AcceptablePK.TRANSCRIPTION}/${string}`
    | `${AcceptablePK.SUMMARY}/${string}`
    | AcceptablePK.SUBSCRIBED_CHANNEL
    | AcceptablePK.TELEGRAM_CHANNEL

export interface MainItem extends TimeStamps {
    [MainTable.PK]: AcceptablePKValue
    [MainTable.SK]: string
    expireAt?: number
}

export interface YoutubeNotificationItem extends MainItem {
    [MainTable.PK]: `${AcceptablePK.YOUTUBE_NOTIFICATION}/${string}`
    [MainTable.SK]: string
    [MainTable.TIMESTAMP]: number
    videoId: string
    channelId: string
    videoTitle: string
    channelTitle: string
    channelUri: string
    publishedAt: number
    caption: YoutubeCaptionType
    genre: Exclude<VideoGenre, 'ALARM'>
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    processingMode: YoutubeNotificationProcessingMode
}

export interface TelegramChannelItem extends MainItem {
    [MainTable.PK]: AcceptablePK.TELEGRAM_CHANNEL
    [MainTable.SK]: VideoGenre
    channelId: string
}

export interface YoutubeVideoItem extends MainItem {
    [MainTable.PK]: `${AcceptablePK.YOUTUBE_VIDEO}/${string}`
    [MainTable.SK]: string
    [MainTable.TIMESTAMP]: number
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    videoId: string
    channelId: string
    videoTitle: string
    channelTitle: string
    channelUri: string
    publishedAt: number
    captions: YoutubeCaptionType
    processingMode: YoutubeNotificationProcessingMode
}

export interface TranscriptVideoItem extends MainItem {
    [MainTable.PK]: `${AcceptablePK.TRANSCRIPTION}/${string}`
    [MainTable.SK]: UUID
    [MainTable.TIMESTAMP]: number
    videoId: string
    videoTitle: string
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    channelTitle: string
    channelUri: string
    publishedAt: number
    transcript: string
}

export interface VideoSummaryItem<T> extends MainItem {
    [MainTable.PK]: `${AcceptablePK.SUMMARY}/${string}`
    [MainTable.SK]: UUID
    [MainTable.TIMESTAMP]: number
    videoId: string
    videoTitle: string
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    channelTitle: string
    channelUri: string
    summary: T
}

export type LayerDefinition = Readonly<{
    layer: ILayerVersion
    moduleName: string
}>

export interface SubscribedChannelItem extends MainItem {
    [MainTable.PK]: AcceptablePK.SUBSCRIBED_CHANNEL
    [MainTable.SK]: string
    [MainTable.TIMESTAMP]: number
    channelTitle: string
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    nextRenewalAt: number | null
    isActive: boolean
}

export type VideoSummary<T> = Readonly<{
    type: MessageType.SUMMARY
    id: UUID
    videoTitle: string
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    videoId: string
    channelTitle: string
    channelUri: string
    summary: T
}> &
    Message

export type TinfoilSummaryResults = Readonly<{
    summary: string[]
    shortSummary: string
    absurdityLevel: number
}>

export type SoftwareEngineeringSummaryResults = Readonly<{
    summary: string[]
    shortSummary: string
    topics: Array<string>
    technologies: Array<string>
    codePresent: boolean
    languagesMentioned: Array<string>
    difficulty: string
    audience: string
}>

export type PoliticsSummaryResults = Readonly<{
    summary: string[]
    shortSummary: string
    keyActors: string[]
    mainIssues: string[]
    tone: string
    impactAssessment: string
}>

export type ScienceSummaryResults = Readonly<{
    summary: string[]
    shortSummary: string
    keywords: string[]
    complexityLevel: string
}>

export type AcceptableLlmResponse =
    | TinfoilSummaryResults
    | SoftwareEngineeringSummaryResults
    | PoliticsSummaryResults
    | ScienceSummaryResults

export type TranscriptVideo = Readonly<{
    id: string
    channelId: string
    videoId: string
    videoTitle: string
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    channelTitle: string
    channelUri: string
    publishedAt: number
    transcript: string
}> &
    Message

export type YoutubeVideoType = 'SHORT' | 'STANDARD' | 'LIVE' | 'UNKNOWN' | 'UPCOMING' | 'LONG'

export type VideoGenre = 'TINFOIL' | 'SOFTWARE_ENGINEERING' | 'ALARM' | 'POLITICS' | 'SCIENCE'

export type ErrorOutput = Readonly<{
    [ERROR_OUTPUT_ATTR_KEY]: string
    payload: object
    subject: string
}>

export type ChatNewsMessageInputPayload = Readonly<{
    [VIDEO_GENRE_KEY]: VideoGenre
    message: string
}>

export type Message = Readonly<{
    type: MessageType
    createdAt: number
    sendAt: number
}>

export type YoutubeNotification = Readonly<{
    videoId: string
    channelId: string
    videoTitle: string
    channelTitle: string
    channelUri: string
    publishedAt: number
    processingMode: YoutubeNotificationProcessingMode
    captions: YoutubeCaptionType
    genre: Exclude<VideoGenre, 'ALARM'>
    [VIDEO_TYPE_KEY]: YoutubeVideoType
}>

export type YoutubeVideo = Readonly<{
    type: MessageType.YOUTUBE_VIDEO
    id: string
    [VIDEO_TYPE_KEY]: YoutubeVideoType
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    videoId: string
    channelId: string
    videoTitle: string
    channelTitle: string
    channelUri: string
    publishedAt: number
    updatedAt: number
    processingMode: YoutubeNotificationProcessingMode
    caption: YoutubeCaptionType
}> &
    Message

export type SubscribedChannel = Readonly<{
    channelId: string
    channelTitle: string
    [VIDEO_GENRE_KEY]: Exclude<VideoGenre, 'ALARM'>
    nextSubscriptionRenewalAt: string | null
    isActive: boolean
    isAvailableOnYoutube: boolean
}>

export type YoutubeLiveStreamingDetails = Readonly<{
    actualStartTime?: string
    actualEndTime?: string
    scheduledStartTime?: string
    activeLiveChatId?: string
    scheduledEndTime?: string
    concurrentViewers?: string
}>

export type YoutubeLifeBroadcastStatus = 'none' | 'upcoming' | 'live'

export type YoutubeVideoDetails = Readonly<{
    videoId: string
    publishedAt: string
    videoTitle: string
    videoDescription: string
    channelTitle: string
    channelId: string
    channelUri: string
    liveBroadcastContent: YoutubeLifeBroadcastStatus
    duration: string
    durationSeconds: number
    liveStreamingDetails?: YoutubeLiveStreamingDetails
    privacyStatus: 'public' | 'private' | 'unlisted'
    captions: YoutubeCaptionType
    isMembersOnly: boolean
}>
