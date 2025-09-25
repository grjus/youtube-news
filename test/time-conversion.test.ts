import { iso8601ToSeconds } from '../lib/domain/video.router'

test('Should convert io8601 SHORT to seconds', () => {
    const isoDuration = 'PT3M32S'
    const seconds = iso8601ToSeconds(isoDuration)
    expect(seconds).toBe(3 * 60 + 32)
})

test('Should convert io8601 LONG to seconds', () => {
    const isoDuration = 'PT12H44S'
    const seconds = iso8601ToSeconds(isoDuration)
    expect(seconds).toBe(12 * 3600 + 44)
})

test('Should convert io8601 STANDARD to seconds', () => {
    const isoDuration = 'PT1H15M52S'
    const seconds = iso8601ToSeconds(isoDuration)
    expect(seconds).toBe(3600 + 15 * 60 + 52)
})
