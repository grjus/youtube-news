import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'
import { getBedrockSystemPrompt, getBedrockToolConfiguration, getSummaryPromptContentBlock } from './bedrock/prompt'
import { AcceptableLlmResponse, VideoGenre } from '../../main-types'
import { LLMParams } from '../../../config/env-types'
import { getSecretValue } from '../../../clients/aws/secrets-manager-client'
import { GoogleGenAI } from 'gemini-client'
import { getPrompt } from './prompts'
import { getGeminiResponseSchema, getGeminiSystemPrompt } from './gemini/prompt'

export const invokeBedrockModel = async (
    genre: Exclude<VideoGenre, 'ALARM'>,
    transcription: string,
    llmParams: LLMParams
) => {
    const bedrockClient = new BedrockRuntimeClient({
        region: llmParams.bedrockProps.region
    })

    const userRole = 'user'

    const systemPrompt = getBedrockSystemPrompt(genre)
    const toolConfiguration = getBedrockToolConfiguration(genre)
    const userPrompt = getSummaryPromptContentBlock(genre, transcription)

    try {
        console.info(`Invoking bedrock with prompt:${JSON.stringify(userPrompt, null, 2)}`)
        const { temperature, maxTokens, topP } = llmParams.inferenceProfile[genre]
        const bedrockResponse = await bedrockClient.send(
            new ConverseCommand({
                modelId: llmParams.bedrockProps.modelId,
                toolConfig: toolConfiguration,
                system: systemPrompt,
                messages: [
                    {
                        role: userRole,
                        content: userPrompt
                    }
                ],
                inferenceConfig: {
                    temperature,
                    maxTokens,
                    topP
                }
            })
        )
        const response = bedrockResponse?.output?.message?.content?.find(
            (content) => content.toolUse?.name === toolConfiguration?.toolChoice?.tool?.name
        )?.toolUse?.input as AcceptableLlmResponse

        if (response) {
            console.info('Bedrock response:', JSON.stringify(response, null, 2))
            return response
        }
        console.error('Invalid bedrock response:', JSON.stringify(bedrockResponse?.output?.message?.content, null, 2))
        return null
    } catch (error) {
        console.error('Error invoking bedrock', error)
        return null
    }
}

export const invokeGeminiModel = async (
    genre: Exclude<VideoGenre, 'ALARM'>,
    transcription: string,
    llmParams: LLMParams,
    secretName: string
) => {
    try {
        const userPrompt = getPrompt(genre, transcription)
        const systemPrompt = getGeminiSystemPrompt(genre)
        const responseSchema = getGeminiResponseSchema(genre)
        const { temperature, maxTokens, topP } = llmParams.inferenceProfile[genre]
        const secret = await getSecretValue(secretName)
        const ai = new GoogleGenAI({ apiKey: secret?.GEMINI_API_KEY })
        const response = await ai.models.generateContent({
            model: llmParams.geminiProps.modelId,
            contents: userPrompt,
            config: {
                temperature,
                topP,
                maxOutputTokens: maxTokens,
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                responseSchema: responseSchema
            }
        })

        if (!response.text) {
            return null
        }
        return JSON.parse(response.text) as AcceptableLlmResponse
    } catch (error) {
        console.log(`Error getting response from Gemini: ${error}`)
        return null
    }
}
