import { Construct } from 'constructs'
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { IFunction } from 'aws-cdk-lib/aws-lambda'
import { LayerDefinition } from '../../src/domain/main-types'
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import {
    Chain,
    Choice,
    Condition,
    DefinitionBody,
    IStateMachine,
    JsonPath,
    LogLevel,
    StateMachine,
    TaskInput
} from 'aws-cdk-lib/aws-stepfunctions'
import { ITopic } from 'aws-cdk-lib/aws-sns'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { LLMParams } from '../../src/config/env-types'
import { YoutubeAlarms } from './youtube-alarms'
import { awsSdkModuleName, ERROR_OUTPUT_ATTR_KEY } from '../../src/domain/consts'
import { lambdaFactory } from '../utils/lambda-factory'
import { join } from 'path'

export type UserSummaryRequestFlowProps = Readonly<{
    mainTable: ITableV2
    logRetention: RetentionDays
    axiosLayerDef: LayerDefinition
    geminiLayerDef: LayerDefinition
    removalPolicy: RemovalPolicy
    alarmTopic: ITopic
    secret: ISecret
    llmParams: LLMParams
    stackName: string
    transcriptionFunction: IFunction
    pythonTranscriptionFunction: IFunction
    transcriptSummaryFunction: IFunction
}>

export class UserSummaryRequestFlow extends Construct {
    stateMachine: IStateMachine

    constructor(
        scope: Construct,
        id: string,
        {
            logRetention,
            axiosLayerDef,
            removalPolicy,
            alarmTopic,
            secret,
            stackName,
            transcriptionFunction,
            pythonTranscriptionFunction,
            transcriptSummaryFunction
        }: UserSummaryRequestFlowProps
    ) {
        super(scope, id)

        const videoDetailsFetcherFunction = lambdaFactory(this, {
            id: 'VideoDetailsFetcher',
            removalPolicy,
            retention: logRetention,
            entry: join('src', 'lambdas', 'video-details-fetcher.ts'),
            handler: 'handler',
            environment: {
                SECRET_NAME: secret.secretName
            },
            layers: [axiosLayerDef.layer],
            timeoutSeconds: 30,
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName]
        })
        secret.grantRead(videoDetailsFetcherFunction)

        const userSummarySenderFunction = lambdaFactory(this, {
            id: 'UserSummarySender',
            removalPolicy,
            retention: logRetention,
            entry: join('src', 'lambdas', 'user-summary-sender.ts'),
            handler: 'handler',
            environment: {
                SECRET_NAME: secret.secretName
            },
            layers: [axiosLayerDef.layer],
            timeoutSeconds: 30,
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName]
        })
        secret.grantRead(userSummarySenderFunction)

        const videoDetailsFetcherStep = new LambdaInvoke(this, 'Fetch Video Details', {
            lambdaFunction: videoDetailsFetcherFunction,
            outputPath: '$.Payload'
        })

        const videoPythonTranscriptionStep = new LambdaInvoke(this, 'Python: Transcriptions', {
            lambdaFunction: pythonTranscriptionFunction,
            resultPath: '$.transcriptResult'
        })

        const videoSupadataTranscriptionStep = new LambdaInvoke(this, 'Supadata: Transcriptions', {
            lambdaFunction: transcriptionFunction,
            resultPath: '$.transcriptResult'
        })

        const transcriptSummarizationStep = new LambdaInvoke(this, 'Transcription Summary', {
            lambdaFunction: transcriptSummaryFunction,
            payload: TaskInput.fromJsonPathAt('$.transcriptResult.Payload'),
            resultPath: '$.summaryResult'
        })

        const userSummarySenderStep = new LambdaInvoke(this, 'Send Summary to User', {
            lambdaFunction: userSummarySenderFunction,
            payload: TaskInput.fromObject({
                chatId: JsonPath.stringAt('$.chatId'),
                genre: JsonPath.stringAt('$.summaryResult.Payload.genre'),
                message: JsonPath.stringAt('$.summaryResult.Payload.message')
            }),
            outputPath: '$.Payload'
        })

        const { onSummaryError, onTranscriptError, onChatError, success } = new YoutubeAlarms(
            this,
            'UserSummaryAlarms',
            { alarmTopic }
        )

        const summaryAndSendFlow = Chain.start(transcriptSummarizationStep)
            .next(
                new Choice(this, 'Transcript summary available?')
                    .when(Condition.isPresent(`$.summaryResult.Payload.${ERROR_OUTPUT_ATTR_KEY}`), onSummaryError)
                    .otherwise(userSummarySenderStep)
                    .afterwards()
            )
            .next(
                new Choice(this, 'Message sent?')
                    .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), onChatError)
                    .otherwise(success)
            )

        const supadataFallbackFlow = Chain.start(videoSupadataTranscriptionStep).next(
            new Choice(this, 'Supadata:Transcription available?')
                .when(Condition.isPresent(`$.transcriptResult.Payload.${ERROR_OUTPUT_ATTR_KEY}`), onTranscriptError)
                .otherwise(summaryAndSendFlow)
                .afterwards()
        )

        const transcriptionFlow = Chain.start(videoPythonTranscriptionStep).next(
            new Choice(this, 'Python:Transcription available?')
                .when(Condition.isPresent(`$.transcriptResult.Payload.${ERROR_OUTPUT_ATTR_KEY}`), supadataFallbackFlow)
                .otherwise(summaryAndSendFlow)
                .afterwards()
        )

        const chain = Chain.start(videoDetailsFetcherStep)
            .next(
                new Choice(this, 'Video details available?')
                    .when(Condition.isPresent(`$.${ERROR_OUTPUT_ATTR_KEY}`), onTranscriptError)
                    .otherwise(transcriptionFlow)
                    .afterwards()
            )
            .next(summaryAndSendFlow)

        this.stateMachine = new StateMachine(this, 'UserSummaryStateMachine', {
            stateMachineName: `${stackName}-UserSummaryStateMachine`,
            definitionBody: DefinitionBody.fromChainable(chain),
            timeout: Duration.minutes(5),
            removalPolicy: RemovalPolicy.DESTROY,
            logs: {
                level: LogLevel.ALL,
                destination: new LogGroup(this, 'UserSummaryStateMachineLogGroup', {
                    logGroupName: `/aws/vendedlogs/states/${stackName}/${id}/UserSummaryStateMachineLogGroup`,
                    retention: logRetention,
                    removalPolicy: removalPolicy
                }),
                includeExecutionData: true
            }
        })
    }
}
