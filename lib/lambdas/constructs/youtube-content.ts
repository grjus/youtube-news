import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { join } from 'path'
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { LayerDefinition } from '../../main.types'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { awsSdkModuleName } from '../../consts'
import { LLMParams } from '../../env.types'
import { PythonFunction, PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha'
import { lambdaFactory } from '../utils/lambda.utils'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'

type YoutubeContentProps = Readonly<{
    table: ITableV2
    logRetention: RetentionDays
    removalPolicy: RemovalPolicy
    secret: ISecret
    axiosLayerDefinition: LayerDefinition
    geminiLayerDefinition: LayerDefinition
    llmParams: LLMParams
}>

export class YoutubeContent extends Construct {
    readonly detailsFunction: NodejsFunction
    readonly transcriptionFunction: NodejsFunction
    readonly pythonTranscriptionFunction: PythonFunction
    readonly transcriptSummaryFunction: NodejsFunction
    readonly chatSenderFunction: NodejsFunction

    constructor(
        scope: Construct,
        id: string,
        {
            table,
            secret,
            removalPolicy,
            logRetention,
            axiosLayerDefinition,
            geminiLayerDefinition,
            llmParams
        }: YoutubeContentProps
    ) {
        super(scope, id)

        const createLambda = (
            id: string,
            entry: string,
            extra?: {
                nodeModules?: string[]
                timeout?: number
                env?: Record<string, string>
                layerDefs?: Array<LayerDefinition>
                memorySize?: number
            }
        ) => {
            const extraLayerDefs = extra?.layerDefs?.length ? extra.layerDefs : []

            const fn = lambdaFactory(this, {
                id,
                removalPolicy,
                retention: logRetention,
                entry: join('lib', 'lambdas', entry),
                handler: 'handler',
                environment: {
                    TABLE_NAME: table.tableName,
                    SECRET_NAME: secret.secretName,
                    ...extra?.env
                },
                memorySize: extra?.memorySize,
                layers: [axiosLayerDefinition.layer, ...extraLayerDefs.map((l) => l.layer)],
                timeoutSeconds: extra?.timeout ?? 60,
                nodeModules: extra?.nodeModules ?? [],
                externalModules: [
                    axiosLayerDefinition.moduleName,
                    awsSdkModuleName,
                    ...extraLayerDefs.map((l) => l.moduleName)
                ]
            })

            table.grantReadWriteData(fn)
            secret.grantRead(fn)
            return fn
        }

        const pythonLayer = new PythonLayerVersion(this, 'PythonTranscriptionLayer', {
            entry: join('python', 'lambdas'),
            compatibleRuntimes: [Runtime.PYTHON_3_12]
        })

        const pythonLambda = new PythonFunction(this, 'PythonTranscription', {
            entry: join('python', 'lambdas', 'src'),
            handler: 'handler',
            runtime: Runtime.PYTHON_3_12,
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName
            },
            timeout: Duration.seconds(60),
            layers: [pythonLayer],
            description: 'Extracts auto generated transcripts from YouTube videos',
            logGroup: new LogGroup(this, 'PythonTranscriptionFuncLogGroup', {
                removalPolicy: RemovalPolicy.DESTROY,
                retention: logRetention
            })
        })
        table.grantReadWriteData(pythonLambda)
        secret.grantRead(pythonLambda)
        this.pythonTranscriptionFunction = pythonLambda

        this.detailsFunction = createLambda('YoutubeDetails', 'youtube-details-provider.ts')
        this.transcriptionFunction = createLambda('YoutubeTranscription', 'transcription-provider.ts', {
            nodeModules: ['@supadata/js'],
            timeout: 300
        })
        const transcriptSummaryFunction = createLambda('TranscriptSummarization', 'transcript-summarizer.ts', {
            timeout: 300,
            layerDefs: [geminiLayerDefinition],
            env: { LLM_PARAMS: JSON.stringify(llmParams) },
            memorySize: 512
        })

        transcriptSummaryFunction.addToRolePolicy(
            new PolicyStatement({
                actions: ['bedrock:InvokeModel'],
                resources: ['*']
            })
        )
        this.transcriptSummaryFunction = transcriptSummaryFunction

        this.chatSenderFunction = createLambda('NewsChatMessageSender', 'news-message-sender.ts')
    }
}
