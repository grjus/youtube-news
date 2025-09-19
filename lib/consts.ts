import { NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Runtime } from 'aws-cdk-lib/aws-lambda'
import { join } from 'path'

export enum MainTable {
    PK = 'pk',
    SK = 'sk',
    TIMESTAMP = 'timestamp',
    TIMESTAMP_NAME = 'timestampIndex'
}

export const PROCESSING_MODE_INDEX = 'processingModeIndex'

export enum AcceptablePK {
    YOUTUBE_NOTIFICATION = 'YOUTUBE_NOTIFICATION',
    YOUTUBE_VIDEO = 'YOUTUBE_VIDEO',
    TRANSCRIPTION = 'TRANSCRIPTION',
    SUMMARY = 'SUMMARY',
    DEDUP = 'DEDUP',
    SUBSCRIBED_CHANNEL = 'SUBSCRIBED_CHANNEL',
    TELEGRAM_CHANNEL = 'TELEGRAM_CHANNEL'
}

export enum MessageType {
    YOUTUBE_VIDEO = 'YOUTUBE_VIDEO',
    TRANSCRIPTION = 'TRANSCRIPTION',
    SUMMARY = 'SUMMARY'
}

export const awsSdkModuleName = '@aws-sdk'
export const VIDEO_GENRE_KEY = 'genre'
export const VIDEO_TYPE_KEY = 'videoType'
export const ERROR_OUTPUT_ATTR_KEY = 'error'
export const STATE_MACHINE_ARN_ATTR = 'STATE_MACHINE_ARN'

export const globalLambdaProps: Partial<NodejsFunctionProps> = {
    runtime: Runtime.NODEJS_22_X,
    depsLockFilePath: join('lib', 'package-lock.json')
}
