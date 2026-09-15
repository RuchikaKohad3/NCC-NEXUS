from google import genai

from app.config import GEMINI_API_KEY, GEMINI_MODEL

client = None
model_name = GEMINI_MODEL

if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)


def generate_content(prompt: str):
    if client is None:
        return None

    return client.models.generate_content(
        model=model_name,
        contents=prompt
    )
