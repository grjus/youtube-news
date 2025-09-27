import { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda'
import { getSecretValue } from '../clients/aws/secrets-manager-client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'

const secretName = process.env.SECRET_NAME!
const topicArn = process.env.YOUTUBE_NOTIFICATIONS_TOPIC_ARN!
const snsClient = new SNSClient()

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
    const secret = await getSecretValue(secretName)

    const signatureHeader = event.headers['x-hub-signature'] || event.headers['X-Hub-Signature']
    if (!signatureHeader) {
        console.warn('No X-Hub-Signature. Rejecting request.')
        return { statusCode: 403, body: 'Forbidden' }
    }
    if (!event.body) {
        console.warn('No body in the request. Rejecting request.')
        return { statusCode: 400, body: 'Bad Request' }
    }

    const hmac = createHmac('sha1', secret.WEBSUB_SECRET)
    const calculatedSignature = 'sha1=' + hmac.update(event.body).digest('hex')

    if (!timingSafeEqual(Buffer.from(calculatedSignature), Buffer.from(signatureHeader))) {
        console.error('Invalid signature. Rejecting request.')
        throw new Error('Invalid signature. Rejecting request: ' + JSON.stringify(event, null, 2))
    }

    console.log('Signature verified successfully.')

    await snsClient.send(
        new PublishCommand({
            TopicArn: topicArn,
            Message: event.body
        })
    )
    console.log('Notification forwarded to SNS topic.')

    return { statusCode: 200, body: 'OK' }
}
