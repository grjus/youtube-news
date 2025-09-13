import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { BaseStack } from '../lib/base-stack'
import { env } from './env'

const app = new cdk.App()

const account: string | undefined = process.env.CDK_DEFAULT_ACCOUNT
const region: string | undefined = process.env.CDK_DEFAULT_REGION

if (!account || !region) {
    throw new Error('Must run cdk command with AWS credentials and region set')
}

function requireContextString(app: cdk.App, key: string): string {
    const raw = app.node.tryGetContext(key)
    if (typeof raw !== 'string' || raw.trim() === '') {
        throw new Error(`Must pass a '-c ${key}=<value>' context parameter`)
    }
    return raw.trim()
}

const stackName = requireContextString(app, 'stack')

const allEnvConfigs = env()

const envConfig = allEnvConfigs[stackName]

if (!envConfig) {
    const available = Object.keys(allEnvConfigs)
    throw new Error(
        `No stack definition found with name '${stackName}'. Available: ${available.length ? available.join(', ') : 'none'}`
    )
}

new BaseStack(app, stackName, {
    env: { region, account },
    ...envConfig
})
