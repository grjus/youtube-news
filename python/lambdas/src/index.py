import json
import logging
import os
from datetime import datetime
from uuid import uuid4

import boto3
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptList
from youtube_transcript_api.proxies import WebshareProxyConfig

from helpers import put_transcription_entity_to_dynamo, to_video_transcript
from schemas import YoutubeVideo, ErrorOutput, TranscriptVideoEntity, YoutubeCaption

ytt_api = YouTubeTranscriptApi()
LANG_CODES = ["en", "pl"]

dynamo_db_client = boto3.client("dynamodb")
sm_client = boto3.client("secretsmanager")
table_name = os.getenv("TABLE_NAME")
secret_name = os.getenv("SECRET_NAME")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()


def handler(event: YoutubeVideo, _):
    try:
        secret = get_secret_from_ssm(secret_name)
        ytt_api = YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=secret.get("WEBSHARE_USERNAME"),
                proxy_password=secret.get("WEBSHARE_PASSWORD"),
            )
        )
        av_transcripts = ytt_api.list(event.get("videoId"))
        transcript = _find_transcript(av_transcripts, event.get("captions"))
        if not transcript:
            return ErrorOutput(
                error="No transcripts found",
                payload=event,
                subject="No transcript found",
            ).model_dump()
        text = "".join([each.text for each in transcript.snippets])
        if text:
            now = int(datetime.now().timestamp() * 1000)
            transcription_entity = TranscriptVideoEntity(
                pk=f"TRANSCRIPTION/{event.get('channelId')}",
                sk=str(uuid4()),
                createdAt=now,
                updatedAt=now,
                timestamp=now,
                videoId=event.get("videoId"),
                videoTitle=event.get("videoTitle"),
                videoType=event.get("videoType"),
                genre=event.get("genre"),
                channelTitle=event.get("channelTitle"),
                channelUri=event.get("channelUri"),
                publishedAt=event.get("publishedAt"),
                transcript=text,
            )
            put_transcription_entity_to_dynamo(transcription_entity, table_name)
            return to_video_transcript(transcription_entity)
        return ErrorOutput(
            error="No transcript found",
            payload=event,
            subject="Python youtube_transcript_api error",
        ).model_dump()
    except Exception as e:
        return ErrorOutput(
            error=str(e), payload=event, subject="Python youtube_transcript_api error"
        ).model_dump()


def _find_transcript(av_transcripts: TranscriptList, captions: YoutubeCaption):
    match captions:
        case "AUTO_GENERATED":
            logger.info("Searching for auto-generated transcript")
            return av_transcripts.find_generated_transcript(LANG_CODES).fetch()
        case "USER_GENERATED":
            logger.info("Searching for user-generated transcript")
            return av_transcripts.find_manually_created_transcript(LANG_CODES).fetch()
        case "NONE":
            logger.info("No transcript available as per caption type 'NONE'")
            return None


def get_secret_from_ssm(secret_name: str) -> dict:
    try:
        response = sm_client.get_secret_value(SecretId=secret_name)
        secret_string = response.get("SecretString")
        if secret_string:
            return json.loads(secret_string)
        raise ValueError("SecretString is empty or not found in the response.")
    except Exception as e:
        raise RuntimeError(f"Failed to retrieve secret from SSM: {str(e)}")
