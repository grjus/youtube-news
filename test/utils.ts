import { YoutubeLiveStreamingDetails, YoutubeVideoDetails } from '../lib/domain/main.types'
import { iso8601ToSeconds } from '../lib/domain/video/video.router'

const _testCreateYoutubeDetails = ({
    duration = 'PT2M32S',
    liveBroadcastContent = 'none',
    liveStreamingDetails,
    isMembersOnly = false,
    privacyStatus = 'public',
    publishedAt = new Date().toISOString()
}: {
    duration?: string
    liveBroadcastContent?: 'none' | 'live' | 'upcoming'
    liveStreamingDetails?: YoutubeLiveStreamingDetails
    isMembersOnly?: boolean
    privacyStatus?: 'public' | 'private' | 'unlisted'
    publishedAt?: string
}) =>
    ({
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: publishedAt,
        durationSeconds: iso8601ToSeconds(duration),
        isMembersOnly,
        privacyStatus,
        captions: 'AUTO_GENERATED',
        liveStreamingDetails,
        liveBroadcastContent,
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: duration
    }) satisfies YoutubeVideoDetails

export { _testCreateYoutubeDetails }
