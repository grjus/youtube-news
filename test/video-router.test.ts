import { checkVideoType, getVideoProcessingRoute } from '../lib/domain/video.router'
import { _testCreateYoutubeDetails } from './utils'

test('STANDARD VIDEO: Should return processing mode as IMMEDIATE', () => {
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: 'PT2H59M59S'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, Date.now())
    expect(processingMode).toBe('IMMEDIATE')
})

test('LIVE VIDEO: Should return processing mode as SCHEDULED', () => {
    const youtubeDetails = _testCreateYoutubeDetails({
        liveBroadcastContent: 'upcoming'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, Date.now())
    expect(processingMode).toBe('SCHEDULED')
})

test('UPCOMING VIDEO: Should return processing mode as SCHEDULED', () => {
    const youtubeDetails = _testCreateYoutubeDetails({
        liveBroadcastContent: 'upcoming'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, Date.now())
    expect(processingMode).toBe('SCHEDULED')
})

test('EARLY ENDED LIVE VIDEO: Should return processing mode as SCHEDULED', () => {
    const videoDuration = 'PT11M32S'
    const date = new Date()
    const pastDate = date.getTime() - 5 * 60 * 1000
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none',
        liveStreamingDetails: { actualEndTime: new Date(pastDate).toISOString() }
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('SCHEDULED')
})

test('LATE ENDED LIVE VIDEO: Should return processing mode as SCHEDULED', () => {
    const videoDuration = 'PT8M32S'
    const date = new Date()
    const pastDate = date.getTime() - 5 * 60 * 1000
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none',
        liveStreamingDetails: { actualEndTime: new Date(pastDate).toISOString() }
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('IMMEDIATE')
})

test('SHORT VIDEO: Should return processing mode as SKIP', () => {
    const videoDuration = 'PT1M32S'
    const date = new Date()
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('SKIP')
})

test('LONG VIDEO: Should return processing mode as SKIP', () => {
    const videoDuration = 'PT3H1M0S'
    const date = new Date()
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('SKIP')
})

test('MEMBERS ONLY VIDEO: Should return processing mode as SKIP', () => {
    const videoDuration = 'PT2H1M0S'
    const date = new Date()
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none',
        liveStreamingDetails: undefined,
        isMembersOnly: true
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('SKIP')
})

test('PRIVATE VIDEO: Should return processing mode as SKIP', () => {
    const videoDuration = 'PT2H1M0S'
    const date = new Date()
    const youtubeDetails = _testCreateYoutubeDetails({
        duration: videoDuration,
        liveBroadcastContent: 'none',
        liveStreamingDetails: undefined,
        isMembersOnly: false,
        privacyStatus: 'private'
    })
    const videoType = checkVideoType(youtubeDetails)
    const processingMode = getVideoProcessingRoute(youtubeDetails, videoType, date.getTime())
    expect(processingMode).toBe('SKIP')
})
