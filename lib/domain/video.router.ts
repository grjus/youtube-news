import { YoutubeNotificationProcessingMode, YoutubeVideoDetails, YoutubeVideoType } from '../main.types'
import { assertNever } from '../lambdas/utils/lambda.utils'

const SHORT_VIDEO_MAX_DURATION_SECONDS = 180
const LONG_VIDEO_MIN_DURATION_SECONDS = 60 * 60 * 3

const getVideoProcessingRoute = (
    youtubeVideoDetails: YoutubeVideoDetails,
    videoType: YoutubeVideoType,
    now: number
): YoutubeNotificationProcessingMode => {
    switch (videoType) {
        case 'LIVE':
            return 'SCHEDULED'
        case 'UPCOMING':
            return 'SCHEDULED'
        case 'LONG':
            return 'SKIP'
        case 'SHORT':
            return 'SKIP'
        case 'STANDARD':
            if (youtubeVideoDetails.isMembersOnly || youtubeVideoDetails.privacyStatus === 'private') {
                console.log(`Skipping members-only or private video: ${youtubeVideoDetails.videoId}`)
                return 'SKIP'
            }
            if (!youtubeVideoDetails.liveStreamingDetails) return 'IMMEDIATE'
            if (youtubeVideoDetails.liveStreamingDetails.actualEndTime) {
                const delayBetweenEndAndNow =
                    now - new Date(youtubeVideoDetails.liveStreamingDetails.actualEndTime).getTime()
                if (delayBetweenEndAndNow > (youtubeVideoDetails.durationSeconds * 1000) / 2) {
                    console.log(
                        `Video ended a while ago (${delayBetweenEndAndNow}ms). Marking as IMMEDIATE: ${youtubeVideoDetails.videoId}`
                    )
                    return 'IMMEDIATE'
                }
                console.log(
                    `Video ended recently (${delayBetweenEndAndNow}ms). Marking as SCHEDULED: ${youtubeVideoDetails.videoId}`
                )
                return 'SCHEDULED'
            }
            return 'IMMEDIATE'
        case 'UNKNOWN':
            return 'SKIP'
        default:
            assertNever(videoType)
    }
    return 'SKIP'
}

const checkVideoType = (videoDetails: YoutubeVideoDetails): YoutubeVideoType => {
    switch (videoDetails.liveBroadcastContent) {
        case 'live':
            return 'LIVE'
        case 'upcoming':
            return 'UPCOMING'
        case 'none': {
            const dur = videoDetails.duration ?? 'PT0S'
            const seconds = iso8601ToSeconds(dur)
            console.log(`Video duration in seconds: ${seconds}. ISO: ${dur}`)
            if (seconds <= SHORT_VIDEO_MAX_DURATION_SECONDS) {
                return 'SHORT'
            }
            if (seconds > LONG_VIDEO_MIN_DURATION_SECONDS) {
                return 'LONG'
            }
            return 'STANDARD'
        }
        default:
            console.log(`UNKNOWN VIDEO TYPE: ${JSON.stringify(videoDetails)}`)
            return 'UNKNOWN'
    }
}

const iso8601ToSeconds = (iso: string): number => {
    const m = iso.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
    if (!m) throw new Error(`Invalid ISO 8601 duration: ${iso}`)
    const [, years, months, weeks, days, hours, minutes, seconds] = m
    if (years || months) throw new Error('Years or months not supported')
    const d = parseInt(weeks || '0', 10) * 7 + parseInt(days || '0', 10)
    const h = parseInt(hours || '0', 10)
    const min = parseInt(minutes || '0', 10)
    const s = parseInt(seconds || '0', 10)
    return ((d * 24 + h) * 60 + min) * 60 + s
}

export { getVideoProcessingRoute, checkVideoType, iso8601ToSeconds }
