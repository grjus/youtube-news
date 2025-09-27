import { Duration, RemovalPolicy } from 'aws-cdk-lib'
import { Architecture, ILayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs'
import { IQueue } from 'aws-cdk-lib/aws-sqs'
import { Construct } from 'constructs'
import { join } from 'path'

const globalLambdaProps: Partial<NodejsFunctionProps> = {
    runtime: Runtime.NODEJS_22_X,
    depsLockFilePath: join('src', 'package-lock.json')
}

type LambdaFactoryProps = Readonly<{
    id: string
    retention: RetentionDays
    removalPolicy: RemovalPolicy
    entry: string
    handler: string
    environment?: Record<string, string>
    layers?: Array<ILayerVersion>
    timeoutSeconds?: number
    nodeModules?: Array<string>
    externalModules?: Array<string>
    memorySize?: number
    deadLetterQueue?: IQueue
}>

export const lambdaFactory = (
    scope: Construct,
    {
        id,
        entry,
        environment,
        removalPolicy,
        retention,
        layers,
        timeoutSeconds,
        nodeModules,
        externalModules,
        memorySize,
        deadLetterQueue
    }: LambdaFactoryProps
) =>
    new NodejsFunction(scope, id, {
        architecture: Architecture.X86_64,
        runtime: Runtime.NODEJS_22_X,
        entry,
        handler: 'handler',
        environment,
        logGroup: new LogGroup(scope, `${id}LogGroup`, {
            removalPolicy,
            retention
        }),
        layers,
        timeout: Duration.seconds(timeoutSeconds ?? 120),
        memorySize: memorySize ?? 256,
        bundling: {
            nodeModules,
            externalModules,
            minify: true,
            esbuildArgs: { '--tree-shaking': 'true' }
        },
        deadLetterQueue,
        ...globalLambdaProps
    })
