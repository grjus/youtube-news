import {
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    PutItemCommand,
    QueryCommand,
    QueryCommandInput
} from '@aws-sdk/client-dynamodb'
import { marshall, NativeAttributeValue, unmarshall } from '@aws-sdk/util-dynamodb'
import { AcceptablePK, MainTable, PROCESSING_MODE_INDEX } from '../../consts'
import { MainItem, SubscribedChannelItem, TelegramChannelItem, VideoGenre, YoutubeVideoItem } from '../../main.types'
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb'

export const putItem = async <T extends MainItem>(
    item: T,
    tableName: string,
    dynamoClient: DynamoDBClient
): Promise<void> => {
    const params = {
        TableName: tableName,
        Item: marshall(item),
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }
    const command = new PutItemCommand(params)
    await dynamoClient.send(command)
}

const getItem = async <T>(
    pk: string,
    sk: string,
    tableName: string,
    dynamoClient: DynamoDBClient
): Promise<T | null> => {
    const params: GetItemCommandInput = {
        TableName: tableName,
        Key: {
            pk: { S: pk },
            sk: { S: sk }
        }
    }

    const command = new GetItemCommand(params)
    const { Item } = await dynamoClient.send(command)

    if (!Item) {
        return null
    }

    return unmarshall(Item) as T
}

/*
const getItems = async <T>(pk: string, tableName: string, dynamoClient: DynamoDBClient): Promise<T[]> => {
    const allItems: T[] = []
    let lastEvaluatedKey: Record<string, AttributeValue> | undefined = undefined
    do {
        const params: QueryCommandInput = {
            TableName: tableName,
            KeyConditionExpression: 'pk = :pk',
            ExpressionAttributeValues: {
                ':pk': { S: pk }
            },
            ExclusiveStartKey: lastEvaluatedKey
        }

        const command = new QueryCommand(params)
        const { Items, LastEvaluatedKey } = await dynamoClient.send(command)

        if (Items) {
            for (const item of Items) {
                allItems.push(unmarshall(item) as T)
            }
        }

        lastEvaluatedKey = LastEvaluatedKey
    } while (lastEvaluatedKey)

    return allItems
}
 */

export const updateSubscriptionChannel = async (
    channelId: string,
    tableName: string,
    dynamoClient: DynamoDBClient,
    now: number,
    payload: Partial<SubscribedChannelItem>
): Promise<SubscribedChannelItem | null> => {
    if (!channelId) throw new Error('channelId is required')
    if (!payload || Object.keys(payload).length === 0) {
        throw new Error('payload must contain at least one property')
    }

    const docClient = DynamoDBDocumentClient.from(dynamoClient)

    const updates: Partial<SubscribedChannelItem> = {
        ...payload,
        updatedAt: now
    }

    const setExpressions: string[] = []
    const attributeNames: Record<string, string> = { '#pk': MainTable.PK, '#sk': MainTable.SK }
    const attributeValues: Record<string, NativeAttributeValue> = {}

    let idx = 0
    for (const [key, value] of Object.entries(updates)) {
        idx += 1
        const nameToken = `#n${idx}`
        const valueToken = `:v${idx}`
        attributeNames[nameToken] = key
        attributeValues[valueToken] = value as NativeAttributeValue
        setExpressions.push(`${nameToken} = ${valueToken}`)
    }

    const command = new UpdateCommand({
        TableName: tableName,
        Key: {
            [MainTable.PK]: AcceptablePK.SUBSCRIBED_CHANNEL,
            [MainTable.SK]: channelId
        },
        ConditionExpression: 'attribute_exists(#pk) AND attribute_exists(#sk)',
        UpdateExpression: `SET ${setExpressions.join(', ')}`,
        ExpressionAttributeNames: attributeNames,
        ExpressionAttributeValues: attributeValues,
        ReturnValues: 'ALL_NEW'
    })

    const { Attributes } = await docClient.send(command)
    if (!Attributes) {
        return null
    }

    return Attributes as unknown as SubscribedChannelItem
}

export const getChannelsForSubscriptionRenewal = async (
    dynamoClient: DynamoDBClient,
    tableName: string,
    now: number
) => {
    const params: QueryCommandInput = {
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeNames: {
            '#nra': 'nextRenewalAt'
        },
        ExpressionAttributeValues: {
            ':pk': { S: AcceptablePK.SUBSCRIBED_CHANNEL },
            ':now': { N: now.toString() }
        },
        FilterExpression: 'attribute_exists(#nra) AND #nra <= :now'
    }

    const command = new QueryCommand(params)
    const { Items } = await dynamoClient.send(command)

    if (!Items) return []
    return Items.map((item) => unmarshall(item) as SubscribedChannelItem)
}

export const getChannel = (
    tableName: string,
    channelId: string,
    dynamoClient: DynamoDBClient
): Promise<SubscribedChannelItem | null> => getItem(AcceptablePK.SUBSCRIBED_CHANNEL, channelId, tableName, dynamoClient)

export const getTelegramChannel = async (
    genre: VideoGenre,
    tableName: string,
    dynamoClient: DynamoDBClient
): Promise<TelegramChannelItem | null> => getItem(AcceptablePK.TELEGRAM_CHANNEL, genre, tableName, dynamoClient)

export const getScheduledNotifications = async (
    dynamoClient: DynamoDBClient,
    tableName: string,
    cutoffTimestamp: number,
    limit = 25
): Promise<YoutubeVideoItem[]> => {
    const params: QueryCommandInput = {
        TableName: tableName,
        IndexName: PROCESSING_MODE_INDEX,
        KeyConditionExpression: '#pm = :pm AND #ts <= :cutoff',
        ExpressionAttributeNames: {
            '#pm': 'processingMode',
            '#ts': MainTable.TIMESTAMP
        },
        ExpressionAttributeValues: {
            ':pm': { S: 'SCHEDULED' },
            ':cutoff': { N: cutoffTimestamp.toString() }
        },
        Limit: limit
    }

    const command = new QueryCommand(params)
    const { Items } = await dynamoClient.send(command)
    if (!Items) {
        return []
    }

    return Items.map((item) => unmarshall(item) as YoutubeVideoItem)
}
