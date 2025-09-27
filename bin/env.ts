import { RemovalPolicy, StackProps } from 'aws-cdk-lib'
import { EnvConfig } from '../src/config/env-types'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'

const DEFAULT_STACK_NAME = 'YoutubeNewsStack'
const TEST_STACK_NAME = 'YoutubeNewsTestStack'

type BaseConfig = StackProps & EnvConfig

export const env = (): Record<string, BaseConfig> => ({
    [DEFAULT_STACK_NAME]: {
        logRetention: RetentionDays.ONE_WEEK,
        mainDynamoDbParams: {
            removalPolicy: RemovalPolicy.RETAIN
        },
        removalPolicy: RemovalPolicy.RETAIN,
        llmParams: {
            geminiProps: {
                modelId: 'gemini-2.5-flash'
            },
            bedrockProps: {
                modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
                region: 'eu-west-1'
            },
            inferenceProfile: {
                TINFOIL: {
                    temperature: 0.5,
                    maxTokens: 4096,
                    topP: 0.3
                },
                SOFTWARE_ENGINEERING: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                },
                POLITICS: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                },
                SCIENCE: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                }
            }
        },

        layers: {
            axiosClientLayerParams: {
                parameterStoreName: '/youtube-news/lambda-layers/axios-client',
                moduleName: 'axios-client'
            },
            geminiClientLayerParams: {
                parameterStoreName: '/youtube-news/lambda-layers/gemini-client',
                moduleName: 'gemini-client'
            }
        },
        secretParams: {
            name: 'youtube-news/prod'
        }
    } satisfies BaseConfig,
    [TEST_STACK_NAME]: {
        logRetention: RetentionDays.ONE_WEEK,
        mainDynamoDbParams: {
            removalPolicy: RemovalPolicy.DESTROY
        },
        removalPolicy: RemovalPolicy.DESTROY,
        llmParams: {
            geminiProps: {
                modelId: 'gemini-2.5-flash'
            },
            bedrockProps: {
                modelId: 'eu.anthropic.claude-3-7-sonnet-20250219-v1:0',
                region: 'eu-west-1'
            },
            inferenceProfile: {
                TINFOIL: {
                    temperature: 0.5,
                    maxTokens: 4096,
                    topP: 0.3
                },
                SOFTWARE_ENGINEERING: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                },
                POLITICS: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                },
                SCIENCE: {
                    temperature: 0.1,
                    maxTokens: 4096,
                    topP: 0.9
                }
            }
        },
        layers: {
            axiosClientLayerParams: {
                parameterStoreName: '/youtube-news/lambda-layers/axios-client',
                moduleName: 'axios-client'
            },
            geminiClientLayerParams: {
                parameterStoreName: '/youtube-news/lambda-layers/gemini-client',
                moduleName: 'gemini-client'
            }
        },
        secretParams: {
            name: 'youtube-news/prod'
        }
    } satisfies BaseConfig
})
