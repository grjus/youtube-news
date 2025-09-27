import { YoutubeVideoDetails } from '../lib/domain/main.types'
import { checkVideoType } from '../lib/domain/video/video.router'

test('Should detect STANDARD video', () => {
    const youtubeDetails = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: '2009-10-25T06:57:33Z',
        durationSeconds: 212,
        isMembersOnly: false,
        privacyStatus: 'public',
        captions: 'AUTO_GENERATED',
        liveStreamingDetails: undefined,
        liveBroadcastContent: 'none',
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: 'PT3M32S'
    } satisfies YoutubeVideoDetails
    const videoType = checkVideoType(youtubeDetails)
    expect(videoType).toBe('STANDARD')
})

test('Should detect LIVE video', () => {
    const youtubeDetails = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: '2009-10-25T06:57:33Z',
        durationSeconds: 212,
        isMembersOnly: false,
        privacyStatus: 'public',
        captions: 'AUTO_GENERATED',
        liveStreamingDetails: undefined,
        liveBroadcastContent: 'live',
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: 'PT3M32S'
    } satisfies YoutubeVideoDetails
    const videoType = checkVideoType(youtubeDetails)
    expect(videoType).toBe('LIVE')
})

test('Should detect UPCOMING video', () => {
    const youtubeDetails = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: '2009-10-25T06:57:33Z',
        durationSeconds: 212,
        isMembersOnly: false,
        privacyStatus: 'public',
        captions: 'AUTO_GENERATED',
        liveStreamingDetails: undefined,
        liveBroadcastContent: 'upcoming',
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: 'PT3M32S'
    } satisfies YoutubeVideoDetails
    const videoType = checkVideoType(youtubeDetails)
    expect(videoType).toBe('UPCOMING')
})

test('Should detect LONG video', () => {
    const youtubeDetails = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: '2009-10-25T06:57:33Z',
        durationSeconds: 212,
        isMembersOnly: false,
        privacyStatus: 'public',
        captions: 'AUTO_GENERATED',
        liveStreamingDetails: undefined,
        liveBroadcastContent: 'none',
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: 'PT4H3M32S'
    } satisfies YoutubeVideoDetails
    const videoType = checkVideoType(youtubeDetails)
    expect(videoType).toBe('LONG')
})

test('Should detect SHORT video', () => {
    const youtubeDetails = {
        videoId: 'dQw4w9WgXcQ',
        channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
        channelTitle: 'RickAstleyVEVO',
        channelUri: 'https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw',
        videoTitle: 'Rick Astley - Never Gonna Give You Up (Video)',
        publishedAt: '2009-10-25T06:57:33Z',
        durationSeconds: 212,
        isMembersOnly: false,
        privacyStatus: 'public',
        captions: 'AUTO_GENERATED',
        liveStreamingDetails: undefined,
        liveBroadcastContent: 'none',
        videoDescription:
            "Rick Astley's official music video for “Never Gonna Give You Up” Listen to Rick Astley: https://RickAstley.lnk.to/_listenYD Subscribe to the official Rick Astley YouTube channel: https://RickAstley.lnk.to/subscribeYD Follow Rick Astley: Facebook: https://RickAstley.lnk.to/followFI Twitter: https://RickAstley.lnk.to/followTI Instagram: https://RickAstley.lnk.to/followII Website: https://RickAstley.lnk.to/followWI Spotify: https://RickAstley.lnk.to/followSI iTunes: https://RickAstley.lnk.to/followIIY Music video by Rick Astley performing Never Gonna Give You Up. (C) 2009 RCA Records, a division of Sony Music Entertainment",
        duration: 'PT2M32S'
    } satisfies YoutubeVideoDetails
    const videoType = checkVideoType(youtubeDetails)
    expect(videoType).toBe('SHORT')
})
