import { ErrorOutput, TranscriptVideoItem, YoutubeVideo } from '../main.types'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { getSecretValue } from './client/sm.client'
import { AcceptablePK } from '../consts'
import { marshall } from '@aws-sdk/util-dynamodb'
import { Supadata, Transcript, TranscriptChunk, TranscriptOrJobId } from '@supadata/js'
import { randomUUID } from 'node:crypto'
import { toVideoTranscript } from './utils/mappers'
import type { Context } from 'aws-lambda'

const dynamoClient = new DynamoDBClient({})
const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function isTranscript(obj: unknown): obj is Transcript {
    return !!obj && typeof obj === 'object' && 'content' in (obj as Record<string, unknown>)
}

function isTranscriptChunkArray(arr: unknown): arr is TranscriptChunk[] {
    return (
        Array.isArray(arr) && arr.every((x) => x && typeof x === 'object' && 'text' in (x as Record<string, unknown>))
    )
}

function normalizeTranscriptContent(t: Transcript): string | null {
    const c = (t as Transcript).content as unknown
    if (typeof c === 'string') return c
    if (isTranscriptChunkArray(c)) return c.map((ch) => ch.text).join('')
    return null
}

type PollConfig = Readonly<{
    initialDelayMs: number
    maxDelayMs: number
    maxTotalWaitMs: number
    safetyMs: number
}>

function nextBackoff(attempt: number, cfg: PollConfig): number {
    const exp = Math.min(cfg.maxDelayMs, cfg.initialDelayMs * Math.pow(2, attempt - 1))
    const jitter = Math.floor(Math.random() * exp)
    return Math.max(100, jitter)
}

function serializeErr(err: unknown) {
    if (err instanceof Error) {
        const e = err as Error & { code?: string; status?: number }
        return { name: e.name, message: e.message, stack: e.stack, code: e.code, status: e.status }
    }
    try {
        return JSON.parse(JSON.stringify(err))
    } catch {
        return { message: String(err) }
    }
}

export const handler = async (payload: YoutubeVideo, context?: Context) => {
    if (payload.captions === 'NONE') {
        console.log(`Video [${payload.videoTitle}] has no captions, skipping transcription.`)
        return {
            error: 'Video has no captions, skipping transcription.',
            payload: { videoId: payload.videoId, channelTitle: payload.channelTitle, videoTitle: payload.videoTitle },
            subject: `Transcription Provider, channel:[${payload.channelTitle}], video:[${payload.videoTitle}]`
        } satisfies ErrorOutput
    }
    try {
        const { channelId, videoId, channelUri, channelTitle, publishedAt, videoTitle, genre, videoType } = payload

        const secret = await getSecretValue(secretName)

        const supadata = new Supadata({ apiKey: secret.TRANSCRIPT_API_KEY })

        const startRes: TranscriptOrJobId = await supadata.transcript({
            url: `https://youtu.be/${videoId}`,
            text: true,
            mode: payload.captions === 'USER_GENERATED' ? 'native' : 'auto'
        })

        let transcript: Transcript | null | undefined = null

        if ('jobId' in startRes) {
            const remaining = context?.getRemainingTimeInMillis?.() ?? 120_000
            const cfg: PollConfig = {
                initialDelayMs: 500,
                maxDelayMs: 6_000,
                maxTotalWaitMs: Math.max(5_000, Math.min(180_000, remaining - 4_000)),
                safetyMs: 3_500
            }

            let waited = 0
            let attempt = 1

            while (waited + cfg.safetyMs < cfg.maxTotalWaitMs) {
                const job = await supadata.transcript.getJobStatus(startRes.jobId)
                console.log(`Status of the job: ${job.status}`)

                if (job.status === 'completed') {
                    transcript = job.result
                    break
                }
                if (job.status === 'failed') {
                    console.error('Transcript failed', job.error ?? 'unknown error')
                    break
                }

                const delay = nextBackoff(attempt++, cfg)
                waited += delay
                await sleep(delay)
            }
        } else {
            transcript = startRes
        }

        if (!transcript || !isTranscript(transcript)) {
            return {
                error: 'Transcript missing or invalid.',
                payload: { videoId, channelTitle, videoTitle },
                subject: `Transcription Provider, channel:[${channelTitle}], video:[${videoTitle}]`
            } satisfies ErrorOutput
        }

        const content = normalizeTranscriptContent(transcript)
        if (!content) {
            return {
                error: 'Transcript content is not a string or TranscriptChunk[].',
                payload: { videoId, transcriptSample: String((transcript as Transcript).content ?? '') },
                subject: `Transcription Provider, channel:[${channelTitle}], video:[${videoTitle}]`
            } satisfies ErrorOutput
        }

        const now = Date.now()
        const entity: TranscriptVideoItem = {
            channelTitle,
            channelUri,
            createdAt: now,
            genre,
            pk: `${AcceptablePK.TRANSCRIPTION}/${channelId}`,
            publishedAt,
            sk: randomUUID(),
            timestamp: now,
            transcript: content,
            updatedAt: now,
            videoId,
            videoTitle,
            videoType
        }

        await dynamoClient.send(
            new PutItemCommand({
                TableName: tableName,
                Item: marshall(entity, { removeUndefinedValues: true })
            })
        )

        return toVideoTranscript(entity)
    } catch (e) {
        const info = serializeErr(e)
        console.error('Transcript provider failed', info)
        return {
            error: 'Transcript provider failed.',
            payload: info,
            subject: 'Transcription Provider'
        } satisfies ErrorOutput
    }
}
