import { Construct } from 'constructs'
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { LayerDefinition } from '../main.types'
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import {
    Chain,
    Choice,
    Condition,
    DefinitionBody,
    IStateMachine,
    LogLevel,
    StateMachine
} from 'aws-cdk-lib/aws-stepfunctions'
import { ITopic } from 'aws-cdk-lib/aws-sns'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { LLMParams } from '../env.types'
import { YoutubeContent } from '../lambdas/constructs/youtube-content'
import { YoutubeAlarms } from '../lambdas/constructs/youtube-alarms'
import { ERROR_OUTPUT_ATTR_KEY } from '../consts'

export type YoutubeVideoProcessorFlowProps = Readonly<{
    mainTable: ITableV2
    logRetention: RetentionDays
    axiosLayerDef: LayerDefinition
    geminiLayerDef: LayerDefinition
    removalPolicy: RemovalPolicy
    alarmTopic: ITopic
    secret: ISecret
    llmParams: LLMParams
    stackName: string
}>

export class YoutubeVideoProcessorFlow extends Construct {
    stateMachine: IStateMachine

    constructor(
        scope: Construct,
        id: string,
        {
            mainTable,
            logRetention,
            axiosLayerDef,
            geminiLayerDef,
            removalPolicy,
            alarmTopic,
            secret,
            llmParams,
            stackName
        }: YoutubeVideoProcessorFlowProps
    ) {
        super(scope, id)

        const { transcriptionFunction, pythonTranscriptionFunction, transcriptSummaryFunction, chatSenderFunction } =
            new YoutubeContent(this, 'YoutubeLambdaFactory', {
                table: mainTable,
                logRetention,
                removalPolicy,
                secret,
                axiosLayerDefinition: axiosLayerDef,
                geminiLayerDefinition: geminiLayerDef,
                llmParams
            })

        const videoPythonTranscriptionStep = new LambdaInvoke(this, 'Python: Transcriptions', {
            lambdaFunction: pythonTranscriptionFunction,
            outputPath: '$.Payload'
        })

        const videoSupadataTranscriptionStep = new LambdaInvoke(this, 'Supadata: Transcriptions', {
            lambdaFunction: transcriptionFunction,
            outputPath: '$.Payload'
        })

        const transcriptSummarizationStep = new LambdaInvoke(this, 'Transcription Summary', {
            lambdaFunction: transcriptSummaryFunction,
            outputPath: '$.Payload'
        })

        const newsMessageSenderStep = new LambdaInvoke(this, 'Sends message to Telegram', {
            lambdaFunction: chatSenderFunction,
            outputPath: '$.Payload'
        })

        const { onSummaryError, onNotProcessed, onTranscriptError, onChatError, success } = new YoutubeAlarms(
            this,
            'YoutubeAlarms',
            {
                alarmTopic
            }
        )

        const supadataFallbackFlow = Chain.start(videoSupadataTranscriptionStep).next(
            new Choice(this, 'Supadata:Transcription available?')
                .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), onTranscriptError)
                .otherwise(transcriptSummarizationStep)
                .afterwards()
        )

        const transcriptionFlow = Chain.start(videoPythonTranscriptionStep).next(
            new Choice(this, 'Python:Transcription available?')
                .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), supadataFallbackFlow)
                .otherwise(transcriptSummarizationStep)
                .afterwards()
        )

        const videoReadyChoice = new Choice(this, 'Video ready for processing?')
            .when(Condition.not(Condition.stringEquals('$.processingMode', 'IMMEDIATE')), onNotProcessed)
            .otherwise(transcriptionFlow)
            .afterwards()

        const chain = videoReadyChoice
            .next(
                new Choice(this, 'Transcript summary available?')
                    .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), onSummaryError)
                    .otherwise(newsMessageSenderStep)
                    .afterwards()
            )
            .next(
                new Choice(this, 'Message sent?')
                    .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), onChatError)
                    .otherwise(success)
            )

        this.stateMachine = new StateMachine(this, 'YoutubeNewsStateMachine', {
            stateMachineName: `${stackName}-YoutubeNewsStateMachine`,
            definitionBody: DefinitionBody.fromChainable(chain),
            timeout: Duration.minutes(2),
            removalPolicy: RemovalPolicy.DESTROY,
            logs: {
                level: LogLevel.ALL,
                destination: new LogGroup(this, 'YoutubeNewsStateMachineLogGroup', {
                    logGroupName: `/aws/vendedlogs/states/${stackName}/${id}/YoutubeNewsStateMachineLogGroup`,
                    retention: logRetention,
                    removalPolicy: removalPolicy
                }),
                includeExecutionData: true
            }
        })
    }
}
