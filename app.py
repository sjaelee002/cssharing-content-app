from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.llm_client import api_key_source, has_api_key, set_runtime_api_key
from services.outline_generator import clean_json_response, generate_outline

load_dotenv()

app = FastAPI(title="CS Sharing Content App")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateOutlineRequest(BaseModel):
    user_input: dict[str, Any]


class GenerateOutlineResponse(BaseModel):
    outline: str


class ApiKeyRequest(BaseModel):
    api_key: str = Field(min_length=1)


class ApiKeyStatusResponse(BaseModel):
    configured: bool
    source: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/settings/api-key", response_model=ApiKeyStatusResponse)
def get_api_key_status() -> ApiKeyStatusResponse:
    source = api_key_source()
    return ApiKeyStatusResponse(configured=source != "none", source=source)


@app.post("/api/settings/api-key", response_model=ApiKeyStatusResponse)
def set_api_key(body: ApiKeyRequest) -> ApiKeyStatusResponse:
    set_runtime_api_key(body.api_key)
    return ApiKeyStatusResponse(configured=True, source="session")


@app.post("/api/generate-outline", response_model=GenerateOutlineResponse)
def generate_outline_endpoint(body: GenerateOutlineRequest) -> GenerateOutlineResponse:
    if not has_api_key():
        raise HTTPException(
            status_code=400,
            detail="API key is not configured. Set ANTHROPIC_API_KEY in .env or provide one in the UI.",
        )

    try:
        outline = generate_outline(
            user_input=body.user_input,
            channel="naver_blog",
        )
        outline = clean_json_response(outline)
        return GenerateOutlineResponse(outline=outline)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to generate outline.") from exc
