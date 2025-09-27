import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'

const snsClient: SNSClient = new SNSClient()

export const publishMessage = async (topicArn: string, message: object) => {
    const stringifyMessage = JSON.stringify(message)
    const params = new PublishCommand({
        TopicArn: topicArn,
        Message: stringifyMessage
    })
    const response = await snsClient.send(params)
    console.log(`Message published to SNS topic ${topicArn} with MessageId: ${response.MessageId}`)
}
