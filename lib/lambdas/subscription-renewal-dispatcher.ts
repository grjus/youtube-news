import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'
import { getChannelsForSubscriptionRenewal } from './utils/dynamo.utils'
import { MainTable } from '../consts'

const ddb = new DynamoDBClient()
const sqs = new SQSClient()
const tableName = process.env.TABLE_NAME!
const queueUrl = process.env.QUEUE_URL!

export const handler = async () => {
    const now = Date.now()
    const channels = await getChannelsForSubscriptionRenewal(ddb, tableName, now)
    console.log(`Channels to renew: ${channels.length}`)
    for (const ch of channels) {
        await sqs.send(
            new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify({ channelId: ch[MainTable.SK], leaseDays: ch.leaseDays })
            })
        )
    }
}
