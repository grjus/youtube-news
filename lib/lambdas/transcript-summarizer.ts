import {
    AcceptableLlmResponse,
    ChatNewsMessageInputPayload,
    ErrorOutput,
    TranscriptVideo,
    VideoSummaryItem
} from '../domain/main.types'
import { LLMParams } from '../env.types'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { AcceptablePK } from '../domain/consts'
import { randomUUID } from 'node:crypto'
import { toVideoSummary } from '../domain/mappers'
import { marshall } from '@aws-sdk/util-dynamodb'
import { invokeBedrockModel, invokeGeminiModel } from '../domain/client/llm/llm.client'
import { toChatMessageMarkdown } from '../domain/chat/message.formatter'

const llmParams = JSON.parse(process.env.LLM_PARAMS!) as LLMParams
const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!
const dynamoClient = new DynamoDBClient()

export const handler = async (payload: TranscriptVideo) => {
    try {
        let llmResponse: AcceptableLlmResponse | null
        llmResponse = await invokeGeminiModel(payload.genre, payload.transcript, llmParams, secretName)
        if (!llmResponse) {
            console.info('Using Bedrock model')
            llmResponse = await invokeBedrockModel(payload.genre, payload.transcript, llmParams)
        }
        if (!llmResponse) {
            console.error('LLM response is null or undefined')
            return {
                error: `YoutubeNews Bot: LLM response is null or undefined for video ID: ${payload.videoId}`,
                payload,
                subject: 'Transcript summarizer'
            } satisfies ErrorOutput
        }

        const { channelId, channelTitle, channelUri, videoId, videoTitle, videoType, genre } = payload
        const now = Date.now()

        const videoSummaryEntity: VideoSummaryItem<AcceptableLlmResponse> = {
            pk: `${AcceptablePK.SUMMARY}/${channelId}`,
            sk: randomUUID(),
            channelTitle,
            channelUri,
            createdAt: now,
            summary: { ...llmResponse },
            timestamp: now,
            updatedAt: now,
            videoId,
            videoTitle,
            videoType,
            genre
        }
        await dynamoClient.send(
            new PutItemCommand({
                TableName: tableName,
                Item: marshall(videoSummaryEntity)
            })
        )

        const videoSummary = toVideoSummary(videoSummaryEntity)
        const message = toChatMessageMarkdown(videoSummary)
        return {
            genre: videoSummary.genre,
            message
        } satisfies ChatNewsMessageInputPayload
    } catch (error) {
        console.error(error)
        return {
            error: `YoutubeNews Bot: LLM response is null or undefined for video ID: ${payload.videoId}`,
            payload: {
                channelTitle: payload.channelTitle,
                videoTitle: payload.videoTitle,
                error: error
            },
            subject: `${payload.genre} Summarizer`
        } satisfies ErrorOutput
    }
}
