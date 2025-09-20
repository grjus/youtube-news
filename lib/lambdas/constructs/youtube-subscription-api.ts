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
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { lambdaFactory } from '../utils/lambda.utils'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { awsSdkModuleName } from '../../consts'
import { LayerDefinition, VideoGenre } from '../../main.types'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { IQueue } from 'aws-cdk-lib/aws-sqs'

export interface YoutubeApiProps {
    domainPrefix: string
    removalPolicy: RemovalPolicy
    retention: RetentionDays
    axiosLayerDef: LayerDefinition
    table: ITable
    secret: ISecret
    deadLetterQueue: IQueue
}

export class YoutubeNewsApi extends Construct {
    public readonly api: RestApi
    public readonly youtubePubSubUrl: string
    public readonly youtubeNotificationsReceiverFunction: NodejsFunction

    constructor(
        scope: Construct,
        id: string,
        { removalPolicy, table, secret, retention, axiosLayerDef, deadLetterQueue }: YoutubeApiProps
    ) {
        super(scope, id)

        const youtubeChallengeReceiverFunction = lambdaFactory(this, {
            id: 'YoutubeChallengeReceiverFunction',
            removalPolicy,
            retention,
            entry: join('lib', 'lambdas', 'youtube-challenge-receiver.ts'),
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
            entry: join('lib', 'lambdas', 'youtube-notifications-receiver.ts'),
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
        table.grantReadWriteData(youtubeNotificationsReceiverFunction)
        secret.grantRead(youtubeNotificationsReceiverFunction)
        this.youtubeNotificationsReceiverFunction = youtubeNotificationsReceiverFunction

        const createSubscriptionChannelFunction = lambdaFactory(this, {
            id: 'CreateSubscriptionChannel',
            removalPolicy,
            retention,
            entry: join('lib', 'lambdas', 'create-subscription-channel.ts'),
            handler: 'handler',
            memorySize: 512,
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName
            },
            layers: [axiosLayerDef.layer],
            externalModules: [axiosLayerDef.moduleName]
        })
        table.grantReadWriteData(createSubscriptionChannelFunction)
        secret.grantRead(createSubscriptionChannelFunction)

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

        const createSubscriptionChannelResource = this.api.root.addResource('channel')
        createSubscriptionChannelResource.addMethod('POST', new LambdaIntegration(createSubscriptionChannelFunction), {
            requestModels: { 'application/json': requestModel },
            requestValidator: validator,
            apiKeyRequired: true
        })

        new CfnOutput(this, 'ApiUrl', { value: this.api.url })
        new CfnOutput(this, 'YtPubSub', { value: this.api.urlForPath('/ytpubsub') })
    }
}
