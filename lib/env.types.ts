import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { RemovalPolicy } from 'aws-cdk-lib'
import { VideoGenre } from './main.types'

export type SubscriptionVideoChannels = Readonly<{
    channelId: string
    channelTitle: string
    genre: Exclude<VideoGenre, 'ALARM'>
    isActive: boolean
}>

type LambdaLayerParams = Readonly<{
    parameterStoreName: string
    moduleName: string
}>

export type EnvConfig = Readonly<{
    logRetention: RetentionDays
    mainDynamoDbParams: DynamoDbParams
    removalPolicy: RemovalPolicy
    llmParams: LLMParams
    layers: LambdaLayers
    secretParams: NameVal
}>

type DynamoDbParams = {
    removalPolicy: RemovalPolicy
}

type LayerClient = 'axiosClientLayerParams' | 'geminiClientLayerParams'

export type LambdaLayers = Record<LayerClient, LambdaLayerParams>

export type InferenceProfile = Readonly<{
    temperature: number
    maxTokens: number
    topP: number
}>

export type GeminiModelParams = Readonly<{
    modelId: string
}>

export type BedrockModelParams = Readonly<{
    modelId: string
    region: string
}>

export type LLMParams = Readonly<{
    geminiProps: GeminiModelParams
    bedrockProps: BedrockModelParams
    inferenceProfile: Record<Exclude<VideoGenre, 'ALARM'>, InferenceProfile>
}>

export type NameVal = Readonly<{ name: string }>
