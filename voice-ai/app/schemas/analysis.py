from pydantic import BaseModel


class CommandResult(BaseModel):
    expected: str
    recognized: str
    accuracy: float
    correct: bool


class DeliveryScores(BaseModel):
    pronunciation: float
    clarity: float
    volume: float
    pace: float
    confidence: float


class RawAudioMetrics(BaseModel):
    amplitude: float
    pitch: float
    energy: float
    duration: float


class AIFeedback(BaseModel):
    summary: str
    strengths: list[str]
    improvements: list[str]
    coach_tip: str


class AnalysisResponse(BaseModel):
    overall_score: float
    command: CommandResult
    delivery: DeliveryScores
    raw_audio_metrics: RawAudioMetrics
    ai_feedback: AIFeedback
