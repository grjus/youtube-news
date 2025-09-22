from typing import Literal, TypedDict

from pydantic import BaseModel


class TranscriptVideoEntity(BaseModel):
    pk: str
    sk: str
    createdAt: int
    updatedAt: int
    timestamp: int
    videoId: str
    videoTitle: str
    videoType: str
    genre: str
    channelTitle: str
    channelUri: str
    publishedAt: int
    transcript: str


YoutubeCaption = Literal["AUTO_GENERATED", "USER_GENERATED", "NONE"]


class YoutubeVideo(TypedDict):
    type: Literal["YOUTUBE_VIDEO"]
    id: str
    videoType: Literal[
        "SHORT", "VIDEO", "LIVE", "UNKNOWN", "UPCOMING", "COMPLETED", "LONG"
    ]
    genre: Literal["TINFOIL", "SOFTWARE_ENGINEERING", "POLITICS", "SCIENCE"]
    videoId: str
    channelId: str
    videoTitle: str
    channelTitle: str
    channelUri: str
    publishedAt: int
    updatedAt: int
    createdAt: int
    sendAt: int
    caption: YoutubeCaption


class ErrorOutput(BaseModel):
    error: str
    payload: dict
    subject: str
