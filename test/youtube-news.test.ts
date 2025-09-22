import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs'

const sqsClient = new SQSClient()
const queueUrl =
    'https://sqs.eu-west-1.amazonaws.com/089248270251/YoutubeNewsStack-YoutubeNotificationsQueue8374D168-2lACi5CD4xrc'

const notification = `
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>YouTube Channel Name</title>
  <updated>2023-03-15T14:30:00Z</updated>
  <link rel="hub" href="https://pubsubhubbub.appspot.com"/>
  <link rel="self" href="https://www.youtube.com/xml/feeds/videos.xml?channel_id=UC1yNl2E66ZzKApQdRuTQ4tw"/>
  <entry>
    <id>tag:youtube.com,2023:video/3rymtVbzR7M</id>
    <yt:channelId>UC1yNl2E66ZzKApQdRuTQ4tw</yt:channelId>
    <yt:videoId>3rymtVbzR7M</yt:videoId>
    <title>Quantum Computers Could Test Free Will, Researchers Claim</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=3rymtVbzR7M"/>
    <published>2025-09-22T14:30:00Z</published>
    </entry>
</feed>
`

test('Need to test....', async () => {
    const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: notification
    })
    await sqsClient.send(command)
}, 160_000)
