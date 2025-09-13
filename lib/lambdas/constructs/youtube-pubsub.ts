import { Construct } from 'constructs'
import { IQueue } from 'aws-cdk-lib/aws-sqs'
import { lambdaFactory } from '../utils/lambda.utils'
import { join } from 'path'
import { RemovalPolicy } from 'aws-cdk-lib'
import { RetentionDays } from 'aws-cdk-lib/aws-logs'
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb'
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager'
import { awsSdkModuleName } from '../../consts'
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources'
import { LayerDefinition } from '../../main.types'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'

type YoutubePubSubProps = Readonly<{
    subscriptionRenewalQueue: IQueue
    removalPolicy: RemovalPolicy
    retention: RetentionDays
    table: ITableV2
    secret: ISecret
    axiosLayerDef: LayerDefinition
    apiUrl: string
}>

export class YoutubePubSub extends Construct {
    public readonly subscriptionRenewalDispatcher: NodejsFunction

    constructor(
        scope: Construct,
        id: string,
        { subscriptionRenewalQueue, removalPolicy, retention, table, secret, axiosLayerDef, apiUrl }: YoutubePubSubProps
    ) {
        super(scope, id)

        const subscriptionRenewalDispatcher = lambdaFactory(this, {
            id: 'SubscriptionRenewalDispatcherFunction',
            removalPolicy,
            retention,
            entry: join('lib', 'lambdas', 'subscription-renewal-dispatcher.ts'),
            handler: 'handler',
            environment: {
                TABLE_NAME: table.tableName,
                QUEUE_URL: subscriptionRenewalQueue.queueUrl
            },
            externalModules: [awsSdkModuleName]
        })
        table.grantReadData(subscriptionRenewalDispatcher)
        subscriptionRenewalQueue.grantSendMessages(subscriptionRenewalDispatcher)
        this.subscriptionRenewalDispatcher = subscriptionRenewalDispatcher

        const subscriptionRenewalWorker = lambdaFactory(this, {
            id: 'SubscriptionRenewalWorkerFunction',
            removalPolicy,
            retention,
            entry: join('lib', 'lambdas', 'subscription-renewal-worker.ts'),
            handler: 'handler',
            environment: {
                TABLE_NAME: table.tableName,
                SECRET_NAME: secret.secretName,
                API_URL: apiUrl
            },
            layers: [axiosLayerDef.layer],
            externalModules: [awsSdkModuleName, axiosLayerDef.moduleName]
        })
        secret.grantRead(subscriptionRenewalWorker)
        table.grantReadWriteData(subscriptionRenewalWorker)
        subscriptionRenewalQueue.grantConsumeMessages(subscriptionRenewalWorker)
        subscriptionRenewalWorker.addEventSource(new SqsEventSource(subscriptionRenewalQueue, { batchSize: 1 }))
    }
}
