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
    Pass,
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
    allowedChatIds: string[]
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

        const prepareInputStep = new Pass(this, 'Prepare On-Demand Input', {
            parameters: {
                'videoId.$': '$.videoId',
                'chatId.$': '$.chatId',
                'messageId.$': '$.messageId',
                'instruction.$': '$.instruction',
                genre: 'ON_DEMAND',
                captions: 'AUTO_GENERATED',
                videoType: 'STANDARD',
                'videoTitle.$': '$.videoId',
                'channelId.$': '$.videoId',
                channelTitle: 'on-demand',
                channelUri: 'https://youtube.com',
                publishedAt: 0
            }
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

        const injectInstructionStep = new Pass(this, 'Inject Instruction Into Payload', {
            parameters: {
                Payload: {
                    'id.$': '$.transcriptResult.Payload.id',
                    'type.$': '$.transcriptResult.Payload.type',
                    'channelId.$': '$.transcriptResult.Payload.channelId',
                    'videoType.$': '$.transcriptResult.Payload.videoType',
                    'genre.$': '$.transcriptResult.Payload.genre',
                    'videoId.$': '$.transcriptResult.Payload.videoId',
                    'videoTitle.$': '$.transcriptResult.Payload.videoTitle',
                    'channelTitle.$': '$.transcriptResult.Payload.channelTitle',
                    'channelUri.$': '$.transcriptResult.Payload.channelUri',
                    'publishedAt.$': '$.transcriptResult.Payload.publishedAt',
                    'transcript.$': '$.transcriptResult.Payload.transcript',
                    'createdAt.$': '$.transcriptResult.Payload.createdAt',
                    'sendAt.$': '$.transcriptResult.Payload.sendAt',
                    'instruction.$': '$.instruction'
                }
            },
            resultPath: '$.transcriptResult'
        })

        const userSummarySenderStep = new LambdaInvoke(this, 'Send Summary to User', {
            lambdaFunction: userSummarySenderFunction,
            payload: TaskInput.fromObject({
                chatId: JsonPath.stringAt('$.chatId'),
                messageId: JsonPath.numberAt('$.messageId'),
                message: JsonPath.stringAt('$.summaryResult.Payload.message')
            }),
            outputPath: '$.Payload'
        })

        const { onSummaryError, onTranscriptError, onChatError, success } = new YoutubeAlarms(
            this,
            'UserSummaryAlarms',
            { alarmTopic }
        )

        const summaryAndSendFlow = Chain.start(injectInstructionStep)
            .next(transcriptSummarizationStep)
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

        const chain = Chain.start(prepareInputStep).next(transcriptionFlow)

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
