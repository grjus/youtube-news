import { ErrorOutput, YoutubeVideo } from '../domain/main-types'
import { getSecretValue } from '../clients/aws/secrets-manager-client'
import { getVideoDetails } from '../domain/video/youtube-tools'
import { MessageType, VIDEO_GENRE_KEY, VIDEO_TYPE_KEY } from '../domain/consts'
import { checkVideoType } from '../domain/video/video-router'
import { randomUUID } from 'node:crypto'

const secretName = process.env.SECRET_NAME!

type VideoDetailsFetcherInput = Readonly<{
    chatId: string
    videoId: string
}>

export type VideoDetailsFetcherOutput = YoutubeVideo & { chatId: string }

export const handler = async (payload: VideoDetailsFetcherInput): Promise<VideoDetailsFetcherOutput | ErrorOutput> => {
    const { chatId, videoId } = payload
    try {
        const secret = await getSecretValue(secretName)
        const videoDetails = await getVideoDetails(videoId, secret.YOUTUBE_API_KEY)

        if (videoDetails.privacyStatus === 'private' || videoDetails.isMembersOnly) {
            return {
                error: `Video [${videoId}] is private or members-only, cannot summarize.`,
                payload: { videoId, chatId },
                subject: 'Video Details Fetcher'
            } satisfies ErrorOutput
        }

        const now = Date.now()
        const videoType = checkVideoType(videoDetails)

        return {
            chatId,
            type: MessageType.YOUTUBE_VIDEO,
            id: randomUUID(),
            [VIDEO_TYPE_KEY]: videoType,
            [VIDEO_GENRE_KEY]: 'ON_DEMAND',
            videoId,
            channelId: videoDetails.channelId,
            videoTitle: videoDetails.videoTitle,
            channelTitle: videoDetails.channelTitle,
            channelUri: videoDetails.channelUri,
            publishedAt: new Date(videoDetails.publishedAt).getTime(),
            updatedAt: now,
            processingMode: 'IMMEDIATE',
            captions: videoDetails.captions,
            createdAt: now,
            sendAt: now
        } satisfies VideoDetailsFetcherOutput
    } catch (error) {
        console.error('Video details fetcher failed', error)
        return {
            error: `Failed to fetch video details for videoId: ${videoId}`,
            payload: { videoId, chatId },
            subject: 'Video Details Fetcher'
        } satisfies ErrorOutput
    }
}
