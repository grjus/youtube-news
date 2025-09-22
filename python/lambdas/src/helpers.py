import boto3
from boto3.dynamodb.types import TypeSerializer

from schemas import TranscriptVideoEntity


def put_transcription_entity_to_dynamo(
    transcription_entity: TranscriptVideoEntity, dynamo_table: str
):
    dynamodb = boto3.client("dynamodb")
    serializer = TypeSerializer()
    marshalled_entity = {
        key: serializer.serialize(value)
        for key, value in transcription_entity.model_dump().items()
    }

    dynamodb.put_item(TableName=dynamo_table, Item=marshalled_entity)


def to_video_transcript(payload: TranscriptVideoEntity) -> dict:
    return {
        "id": payload.sk,
        "type": "TRANSCRIPTION",
        "channelId": payload.pk.split("/")[1],
        "videoType": payload.videoType,
        "genre": payload.genre,
        "videoId": payload.videoId,
        "videoTitle": payload.videoTitle,
        "channelTitle": payload.channelTitle,
        "channelUri": payload.channelUri,
        "publishedAt": payload.publishedAt,
        "transcript": payload.transcript,
        "createdAt": payload.createdAt,
        "sendAt": payload.createdAt,
    }
