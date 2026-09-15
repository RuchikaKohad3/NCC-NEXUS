from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.config import VOICE_AI_CORS_ORIGINS

app = FastAPI(
    title="NCC Voice AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=VOICE_AI_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(router)
