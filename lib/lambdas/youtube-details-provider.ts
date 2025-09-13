import { ErrorOutput, YoutubeNotification, YoutubeVideoItem } from '../main.types'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'
import { getChannel } from './utils/dynamo.utils'
import { checkVideoType } from './utils/youtube.utils'
import { getSecretValue } from './client/sm.client'
import { AcceptablePK } from '../consts'
import { randomUUID } from 'node:crypto'
import { marshall } from '@aws-sdk/util-dynamodb'
import { toYoutubeVideo } from './utils/mappers'

const dynamoClient = new DynamoDBClient()
const tableName = process.env.TABLE_NAME!
const secretName = process.env.SECRET_NAME!

export const handler = async (payload: YoutubeNotification) => {
    const { channelId, videoId, channelUri, channelTitle, publishedAt, videoTitle } = payload
    const channelDetails = await getChannel(tableName, channelId, dynamoClient)
    if (!channelDetails) {
        return {
            error: `There is no active subscription with provided channel id: [${channelId}]`,
            payload,
            subject: 'Youtube details provider'
        } satisfies ErrorOutput
    }
    const secret = await getSecretValue(secretName)
    const now = Date.now()
    const { genre } = channelDetails
    const videoType = await checkVideoType(videoId, secret.YOUTUBE_API_KEY)
    const youtubeVideoEntity: YoutubeVideoItem = {
        pk: `${AcceptablePK.YOUTUBE_VIDEO}/${channelId}`,
        sk: randomUUID(),
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        channelId,
        channelTitle,
        channelUri,
        publishedAt,
        videoId,
        videoTitle,
        videoType,
        genre
    }
    await dynamoClient.send(
        new PutItemCommand({
            TableName: tableName,
            Item: marshall(youtubeVideoEntity)
        })
    )
    return toYoutubeVideo(youtubeVideoEntity)
}
