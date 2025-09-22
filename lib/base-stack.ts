import * as cdk from 'aws-cdk-lib'
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { EnvConfig } from './env.types'
import { Topic } from 'aws-cdk-lib/aws-sns'
import { awsSdkModuleName, MainTable, PROCESSING_MODE_INDEX, STATE_MACHINE_ARN_ATTR } from './consts'
import { AttributeType, Billing, TableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { Rule, Schedule } from 'aws-cdk-lib/aws-events'
import { StringParameter } from 'aws-cdk-lib/aws-ssm'
import { LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { YoutubeVideoProcessorFlow } from './process/youtube-news.processor'
import { Secret } from 'aws-cdk-lib/aws-secretsmanager'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { join } from 'path'
import { LogGroup } from 'aws-cdk-lib/aws-logs'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { YoutubeNewsApi } from './lambdas/constructs/youtube-subscription-api'
import { YoutubePubSub } from './lambdas/constructs/youtube-pubsub'
import { lambdaFactory } from './lambdas/utils/lambda.utils'

export class BaseStack extends Stack {
    constructor(
        scope: Construct,
        id: string,
        { mainDynamoDbParams, llmParams, logRetention, removalPolicy, layers, secretParams }: StackProps & EnvConfig
    ) {
        super(scope, id)

        const { axiosClientLayerParams, geminiClientLayerParams } = layers

        const geminiClientArn = StringParameter.valueForStringParameter(
            this,
            geminiClientLayerParams.parameterStoreName
        )

        const geminiLayer = LayerVersion.fromLayerVersionArn(this, 'GeminiClientLayer', geminiClientArn)

        const axiosLayerArn = StringParameter.valueForStringParameter(this, axiosClientLayerParams.parameterStoreName)

        const axiosLayer = LayerVersion.fromLayerVersionArn(this, 'AxiosClientLayer', axiosLayerArn)

        const alarmTopic = new Topic(this, 'AlarmTopic', {
            displayName: 'Alarm Topic'
        })

        const deadLetterQueue = new Queue(this, 'DeadLetterQueue', {
            retentionPeriod: cdk.Duration.days(14),
            visibilityTimeout: cdk.Duration.seconds(300)
        })

        const youtubeNotificationsQueue = new Queue(this, 'YoutubeNotificationsQueue', {
            deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 10 },
            retentionPeriod: cdk.Duration.days(14),
            visibilityTimeout: cdk.Duration.seconds(300)
        })

        const subscriptionRenewalQueue = new Queue(this, 'SubscriptionRenewalQueue', {
            visibilityTimeout: cdk.Duration.seconds(120),
            deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 10 }
        })

        alarmTopic.addSubscription(new SqsSubscription(deadLetterQueue))

        const mainTable = new TableV2(this, 'MainTable', {
            partitionKey: {
                name: MainTable.PK,
                type: AttributeType.STRING
            },
            sortKey: {
                name: MainTable.SK,
                type: AttributeType.STRING
            },
            billing: Billing.onDemand(),
            ...mainDynamoDbParams
        })
        mainTable.addLocalSecondaryIndex({
            indexName: MainTable.TIMESTAMP_NAME,
            sortKey: {
                name: MainTable.TIMESTAMP,
                type: AttributeType.NUMBER
            }
        })

        mainTable.addGlobalSecondaryIndex({
            indexName: PROCESSING_MODE_INDEX,
            partitionKey: {
                name: 'processingMode',
                type: AttributeType.STRING
            },
            sortKey: {
                name: MainTable.TIMESTAMP,
                type: AttributeType.NUMBER
            }
        })

        const secret = Secret.fromSecretNameV2(this, 'YoutubeNewsSecret', secretParams.name)

        const { stateMachine } = new YoutubeVideoProcessorFlow(this, 'YoutubeVideoProcessorFlow', {
            mainTable,
            logRetention,
            axiosLayerDef: {
                layer: axiosLayer,
                moduleName: axiosClientLayerParams.moduleName
            },
            geminiLayerDef: {
                layer: geminiLayer,
                moduleName: geminiClientLayerParams.moduleName
            },
            removalPolicy,
            alarmTopic,
            secret,
            llmParams,
            stackName: this.stackName
        })

        const alarmMessageSenderFunction = new NodejsFunction(this, 'AlarmMessageSenderFunction', {
            runtime: Runtime.NODEJS_22_X,
            handler: 'handler',
            entry: join('lib', 'lambdas', 'alarm-message-sender.ts'),
            logGroup: new LogGroup(this, `AlarmMessageSenderLogGroup`, {
                removalPolicy,
                retention: logRetention
            }),
            environment: {
                TABLE_NAME: mainTable.tableName,
                SECRET_NAME: secret.secretName
            },
            memorySize: 256,
            timeout: Duration.seconds(120),
            retryAttempts: 2,
            layers: [axiosLayer],
            bundling: {
                externalModules: [axiosClientLayerParams.moduleName, awsSdkModuleName],
                minify: true,
                esbuildArgs: { '--tree-shaking': 'true' }
            }
        })
        mainTable.grantReadWriteData(alarmMessageSenderFunction)
        secret.grantRead(alarmMessageSenderFunction)
        deadLetterQueue.grantSendMessages(alarmMessageSenderFunction)

        alarmMessageSenderFunction.addEventSource(
            new SqsEventSource(deadLetterQueue, {
                batchSize: 10,
                maxBatchingWindow: cdk.Duration.seconds(5),
                reportBatchItemFailures: true
            })
        )

        const rule = new Rule(this, 'EveryFullHour', {
            schedule: Schedule.cron({ minute: '0' }),
            description: 'Run every full hour'
        })

        const { youtubeNotificationsProcessorFunction, youtubePubSubUrl } = new YoutubeNewsApi(this, 'YoutubeNewsApi', {
            domainPrefix: 'youtube-news-api',
            removalPolicy: removalPolicy,
            table: mainTable,
            retention: logRetention,
            secret,
            axiosLayerDef: {
                layer: axiosLayer,
                moduleName: axiosClientLayerParams.moduleName
            },
            deadLetterQueue,
            youtubeNotificationsQueue
        })
        const { subscriptionRenewalDispatcher } = new YoutubePubSub(this, 'YoutubePubSub', {
            subscriptionRenewalQueue,
            apiUrl: youtubePubSubUrl,
            removalPolicy,
            retention: logRetention,
            table: mainTable,
            secret,
            axiosLayerDef: {
                layer: axiosLayer,
                moduleName: axiosClientLayerParams.moduleName
            }
        })

        youtubeNotificationsProcessorFunction.addEnvironment(STATE_MACHINE_ARN_ATTR, stateMachine.stateMachineArn)
        stateMachine.grantStartExecution(youtubeNotificationsProcessorFunction)

        const scheduledNotificationPoller = lambdaFactory(this, {
            id: 'ScheduledNotificationPollerFunction',
            removalPolicy,
            retention: logRetention,
            entry: join('lib', 'lambdas', 'scheduled-video-poller.ts'),
            handler: 'handler',
            environment: {
                TABLE_NAME: mainTable.tableName,
                SECRET_NAME: secret.secretName,
                STATE_MACHINE_ARN: stateMachine.stateMachineArn
            },
            layers: [axiosLayer],
            externalModules: [awsSdkModuleName, axiosClientLayerParams.moduleName]
        })
        secret.grantRead(scheduledNotificationPoller)
        mainTable.grantReadWriteData(scheduledNotificationPoller)
        stateMachine.grantStartExecution(scheduledNotificationPoller)

        rule.addTarget(new LambdaFunction(subscriptionRenewalDispatcher))
        rule.addTarget(new LambdaFunction(scheduledNotificationPoller))

        new CfnOutput(this, 'MainTableArn', {
            value: mainTable.tableName,
            description: 'ARN of the DynamoDB table for main data'
        })

        new CfnOutput(this, 'StateMachineArn', {
            value: stateMachine.stateMachineArn,
            description: 'ARN of the youtube flow state machine'
        })

        new CfnOutput(this, 'GeminiLayerArnOutput', {
            value: geminiClientArn,
            description: 'ARN of the Axios client layer'
        })

        new CfnOutput(this, 'AxiosLayerArnOutput', {
            value: axiosLayerArn,
            description: 'ARN of the Axios client layer'
        })

        new CfnOutput(this, 'YoutubeNotificationsQueueUrl', {
            value: youtubeNotificationsQueue.queueUrl,
            description: 'URL of the SQS queue for YouTube notifications'
        })
    }
}
