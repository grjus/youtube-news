import { Construct } from 'constructs'
import { join } from 'path'
import {
    AuthorizationType,
    JsonSchemaType,
    LambdaIntegration,
    Model,
    RequestValidator,
    RestApi
} from 'aws-cdk-lib/aws-apigateway'
import * as cdk from 'aws-cdk-lib'
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { lambdaFactory } from '../../utils/lambda-factory'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { awsSdkModuleName } from '../../../src/domain/consts'
import { LayerDefinition, VideoGenre } from '../../../src/domain/main-types'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { IQueue, Queue } from 'aws-cdk-lib/aws-sqs'
import { ITopic } from 'aws-cdk-lib/aws-sns'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions'

export interface YoutubeApiProps {
    domainPrefix: string
    removalPolicy: RemovalPolicy
    retention: RetentionDays
    axiosLayerDef: LayerDefinition
    table: ITable
    secret: ISecret
    deadLetterQueue: IQueue
    youtubeNotificationsTopic: ITopic
}

export class YoutubeNewsApi extends Construct {
    public readonly api: RestApi
    public readonly youtubePubSubUrl: string
    public readonly youtubeNotificationsProcessorFunction: NodejsFunction

    constructor(
        scope: Construct,
        id: string,
        {
            removalPolicy,
            table,
            secret,
            retention,
            axiosLayerDef,
            deadLetterQueue,
            youtubeNotificationsTopic
        }: YoutubeApiProps
    ) {
        super(scope, id)

        const youtubeNotificationsQueue = new Queue(this, 'YoutubeNotificationsQueue', {
            deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 10 },
            retentionPeriod: cdk.Duration.days(14),
            deliveryDelay: cdk.Duration.minutes(10)
        })

        youtubeNotificationsTopic.addSubscription(
            new SqsSubscription(youtubeNotificationsQueue, {
                rawMessageDelivery: true
            })
        )

        const youtubeChallengeReceiverFunction = lambdaFactory(this, {
            id: 'YoutubeChallengeReceiverFunction',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'youtube-challenge-receiver.ts'),
            handler: 'handler',
            externalModules: [awsSdkModuleName],
            environment: {
                TABLE_NAME: table.tableName
            },
            deadLetterQueue
        })

        table.grantWriteData(youtubeChallengeReceiverFunction)

        const youtubeNotificationsReceiverFunction = lambdaFactory(this, {
            id: 'YoutubeNotificationsReceiverFunction',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'youtube-notifications-receiver.ts'),
            handler: 'handler',
            environment: {
                YOUTUBE_NOTIFICATIONS_TOPIC_ARN: youtubeNotificationsTopic.topicArn,
                SECRET_NAME: secret.secretName
            },
            externalModules: [awsSdkModuleName],
            deadLetterQueue
        })
        table.grantReadWriteData(youtubeNotificationsReceiverFunction)
        secret.grantRead(youtubeNotificationsReceiverFunction)
        youtubeNotificationsTopic.grantPublish(youtubeNotificationsReceiverFunction)

        const youtubeNotificationsProcessorFunction = lambdaFactory(this, {
            id: 'YoutubeNotificationsProcessorFunction',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'youtube-notification-processor.ts'),
            handler: 'handler',
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName
            },
            nodeModules: ['xml2js'],
            layers: [axiosLayerDef.layer],
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName],
            deadLetterQueue
        })

        table.grantReadWriteData(youtubeNotificationsProcessorFunction)
        secret.grantRead(youtubeNotificationsProcessorFunction)

        youtubeNotificationsProcessorFunction.addEventSource(
            new SqsEventSource(youtubeNotificationsQueue, { batchSize: 5 })
        )

        this.youtubeNotificationsProcessorFunction = youtubeNotificationsProcessorFunction

        const createSubscriptionChannelFunction = lambdaFactory(this, {
            id: 'CreateSubscriptionChannel',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'api', 'create-subscription-channel.ts'),
            handler: 'handler',
            memorySize: 512,
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName
            },
            layers: [axiosLayerDef.layer],
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName]
        })
        table.grantReadWriteData(createSubscriptionChannelFunction)
        secret.grantRead(createSubscriptionChannelFunction)

        const patchSubscriptionChannelFunction = lambdaFactory(this, {
            id: 'PatchSubscriptionChannel',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'api', 'patch-subscription-channel.ts'),
            handler: 'handler',
            memorySize: 512,
            environment: {
                TABLE_NAME: table.tableName
            },
            externalModules: [awsSdkModuleName]
        })
        table.grantReadWriteData(patchSubscriptionChannelFunction)

        const getSubscriptionChannelFunction = lambdaFactory(this, {
            id: 'GetSubscriptionChannel',
            removalPolicy,
            retention,
            entry: join('src', 'lambdas', 'api', 'get-subscription-channel.ts'),
            handler: 'handler',
            memorySize: 512,
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName
            },
            layers: [axiosLayerDef.layer],
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName]
        })
        table.grantReadData(getSubscriptionChannelFunction)
        secret.grantRead(getSubscriptionChannelFunction)
        this.api = new RestApi(this, 'Api', {
            restApiName: 'YoutubeNewsApi',
            deployOptions: { stageName: 'prod' }
        })

        const apiKey = this.api.addApiKey('AdminApiKey', {
            apiKeyName: 'youtube-news-admin'
        })

        const plan = this.api.addUsagePlan('YoutubeNewsUsagePlan', {
            name: 'YoutubeNewsAdminPlan',
            apiStages: [{ api: this.api, stage: this.api.deploymentStage }]
        })
        plan.addApiKey(apiKey)

        const youtubePubSubResource = this.api.root.addResource('ytpubsub')
        youtubePubSubResource.addMethod('GET', new LambdaIntegration(youtubeChallengeReceiverFunction), {
            authorizationType: AuthorizationType.NONE,
            apiKeyRequired: false
        })
        youtubePubSubResource.addMethod('POST', new LambdaIntegration(youtubeNotificationsReceiverFunction), {
            authorizationType: AuthorizationType.NONE,
            apiKeyRequired: false
        })

        this.youtubePubSubUrl = this.api.urlForPath('/ytpubsub')

        const requestModel = new Model(this, 'CreateSubscriptionChannelModel', {
            restApi: this.api,
            contentType: 'application/json',
            schema: {
                type: JsonSchemaType.OBJECT,
                required: ['channelId', 'channelTitle', 'genre', 'isActive'],
                properties: {
                    channelId: { type: JsonSchemaType.STRING },
                    channelTitle: { type: JsonSchemaType.STRING },
                    genre: {
                        type: JsonSchemaType.STRING,
                        enum: ['TINFOIL', 'SOFTWARE_ENGINEERING', 'POLITICS', 'SCIENCE'] satisfies Array<VideoGenre>
                    },
                    isActive: { type: JsonSchemaType.BOOLEAN }
                }
            }
        })

        const validator = new RequestValidator(this, 'CreateSubscriptionChannelValidator', {
            restApi: this.api,
            validateRequestBody: true,
            validateRequestParameters: false
        })

        const subscriptionChannelsResource = this.api.root.addResource('channels')
        subscriptionChannelsResource.addMethod('POST', new LambdaIntegration(createSubscriptionChannelFunction), {
            requestModels: { 'application/json': requestModel },
            requestValidator: validator,
            apiKeyRequired: true
        })

        subscriptionChannelsResource.addMethod('PATCH', new LambdaIntegration(patchSubscriptionChannelFunction), {
            requestModels: { 'application/json': requestModel },
            requestValidator: validator,
            apiKeyRequired: true
        })

        const subscriptionChannelResource = subscriptionChannelsResource.addResource('{channelId}')
        subscriptionChannelResource.addMethod('GET', new LambdaIntegration(getSubscriptionChannelFunction), {
            apiKeyRequired: true,
            authorizationType: AuthorizationType.NONE
        })

        new CfnOutput(this, 'ApiUrl', { value: this.api.url })
        new CfnOutput(this, 'YtPubSub', { value: this.api.urlForPath('/ytpubsub') })
    }
}
