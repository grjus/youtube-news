import { Construct } from 'constructs'
import { Chain, Fail, Succeed, TaskInput } from 'aws-cdk-lib/aws-stepfunctions'
import { SnsPublish } from 'aws-cdk-lib/aws-stepfunctions-tasks'
import { ITopic } from 'aws-cdk-lib/aws-sns'

type YoutubeAlarmsProps = Readonly<{
    alarmTopic: ITopic
}>

export class YoutubeAlarms extends Construct {
    readonly fail: Fail
    readonly success: Succeed
    readonly onDetailsError: Chain
    readonly onTranscriptError: Chain
    readonly onSummaryError: Chain
    readonly onNotProcessed: Chain
    readonly onChatError: Chain

    constructor(scope: Construct, id: string, { alarmTopic }: YoutubeAlarmsProps) {
        super(scope, id)

        this.fail = new Fail(this, 'Error', { cause: 'Unexpected error', error: 'Processing Error' })
        this.success = new Succeed(this, 'Success', { comment: 'Success' })

        this.onDetailsError = new SnsPublish(this, 'Alarm: Youtube Details', {
            topic: alarmTopic,
            subject: 'Error processing youtube details',
            message: TaskInput.fromJsonPathAt('$')
        }).next(this.fail)

        this.onTranscriptError = new SnsPublish(this, 'Alarm: Youtube Transcript', {
            topic: alarmTopic,
            subject: 'Error processing youtube transcript',
            message: TaskInput.fromJsonPathAt('$')
        }).next(this.fail)

        this.onSummaryError = new SnsPublish(this, 'Alarm: Youtube Summary', {
            topic: alarmTopic,
            subject: 'Error processing youtube summary',
            message: TaskInput.fromJsonPathAt('$')
        }).next(this.fail)

        this.onNotProcessed = new SnsPublish(this, 'Alarm: Not Processed Video', {
            topic: alarmTopic,
            subject: 'Youtube video not processed',
            message: TaskInput.fromJsonPathAt('$')
        }).next(this.success)

        this.onChatError = new SnsPublish(this, 'Alarm: Chat Send', {
            topic: alarmTopic,
            subject: 'Error sending message to chat',
            message: TaskInput.fromJsonPathAt('$')
        }).next(this.fail)
    }
}
