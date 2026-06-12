import json
from collections.abc import Callable
from typing import Annotated, Any

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.homepage_magazine_outline_generator import generate_outline as generate_homepage_magazine_outline
from services.json_utils import clean_json_response
from services.linkedin_outline_generator import generate_outline as generate_linkedin_outline
from services.llm_client import api_key_source, has_api_key, set_runtime_api_key
from services.master_content_builder import generate_master_brief
from services.meta_social_outline_generator import generate_outline as generate_meta_social_outline
from services.naver_blog_outline_generator import generate_outline as generate_naver_blog_outline

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
    master_brief: str
    outline: str


class GenerateMasterBriefRequest(BaseModel):
    user_input: dict[str, Any]


class GenerateMasterBriefResponse(BaseModel):
    master_brief: str


class GenerateChannelOutlineRequest(BaseModel):
    user_input: dict[str, Any]
    master_brief: dict[str, Any] | str | None = None


class GenerateChannelOutlineResponse(BaseModel):
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


def _parse_master_brief_payload(master_brief: dict[str, Any] | str) -> dict[str, Any]:
    if isinstance(master_brief, str):
        cleaned = clean_json_response(master_brief)
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid master_brief JSON.",
            ) from exc
        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=400,
                detail="master_brief must be a JSON object.",
            )
        return parsed
    return master_brief


def _require_master_brief(body: GenerateChannelOutlineRequest) -> dict[str, Any]:
    if body.master_brief is None:
        raise HTTPException(
            status_code=400,
            detail="master_brief is required. Generate or provide a Master Brief first.",
        )

    if isinstance(body.master_brief, str) and not body.master_brief.strip():
        raise HTTPException(
            status_code=400,
            detail="master_brief is required. Generate or provide a Master Brief first.",
        )

    return _parse_master_brief_payload(body.master_brief)


def _run_channel_outline_generation(
    body: GenerateChannelOutlineRequest,
    generate_fn: Callable[..., str],
    failure_detail: str,
    api_key: str | None,
) -> GenerateChannelOutlineResponse:
    if not has_api_key(api_key):
        raise HTTPException(
            status_code=400,
            detail="API key is not configured. Set ANTHROPIC_API_KEY in .env or provide one in the UI.",
        )

    try:
        master_brief = _require_master_brief(body)
        outline = generate_fn(
            user_input=body.user_input,
            api_key=api_key,
            master_brief=master_brief,
        )
        outline = clean_json_response(outline)
        return GenerateChannelOutlineResponse(outline=outline)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=failure_detail) from exc


@app.post("/api/generate-outline", response_model=GenerateOutlineResponse)
def generate_outline_endpoint(
    body: GenerateOutlineRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateOutlineResponse:
    """Legacy combined flow: generates Master Brief and Naver Blog Outline in one request."""
    if not has_api_key(x_anthropic_api_key):
        raise HTTPException(
            status_code=400,
            detail="API key is not configured. Set ANTHROPIC_API_KEY in .env or provide one in the UI.",
        )

    try:
        master_brief_text = generate_master_brief(
            user_input=body.user_input,
            api_key=x_anthropic_api_key,
        )
        master_brief_text = clean_json_response(master_brief_text)

        try:
            master_brief = json.loads(master_brief_text)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=500,
                detail="Failed to parse master brief JSON.",
            ) from exc

        outline = generate_naver_blog_outline(
            user_input=body.user_input,
            api_key=x_anthropic_api_key,
            master_brief=master_brief,
        )
        outline = clean_json_response(outline)
        return GenerateOutlineResponse(
            master_brief=master_brief_text,
            outline=outline,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to generate outline.") from exc


@app.post("/api/generate-master-brief", response_model=GenerateMasterBriefResponse)
def generate_master_brief_endpoint(
    body: GenerateMasterBriefRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateMasterBriefResponse:
    if not has_api_key(x_anthropic_api_key):
        raise HTTPException(
            status_code=400,
            detail="API key is not configured. Set ANTHROPIC_API_KEY in .env or provide one in the UI.",
        )

    try:
        master_brief = generate_master_brief(
            user_input=body.user_input,
            api_key=x_anthropic_api_key,
        )
        master_brief = clean_json_response(master_brief)
        return GenerateMasterBriefResponse(master_brief=master_brief)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to generate master brief.") from exc


@app.post("/api/generate-naver-blog-outline", response_model=GenerateChannelOutlineResponse)
def generate_naver_blog_outline_endpoint(
    body: GenerateChannelOutlineRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateChannelOutlineResponse:
    return _run_channel_outline_generation(
        body=body,
        generate_fn=generate_naver_blog_outline,
        failure_detail="Failed to generate Naver Blog outline.",
        api_key=x_anthropic_api_key,
    )


@app.post("/api/generate-homepage-magazine-outline", response_model=GenerateChannelOutlineResponse)
def generate_homepage_magazine_outline_endpoint(
    body: GenerateChannelOutlineRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateChannelOutlineResponse:
    return _run_channel_outline_generation(
        body=body,
        generate_fn=generate_homepage_magazine_outline,
        failure_detail="Failed to generate Homepage Magazine outline.",
        api_key=x_anthropic_api_key,
    )


@app.post("/api/generate-linkedin-outline", response_model=GenerateChannelOutlineResponse)
def generate_linkedin_outline_endpoint(
    body: GenerateChannelOutlineRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateChannelOutlineResponse:
    return _run_channel_outline_generation(
        body=body,
        generate_fn=generate_linkedin_outline,
        failure_detail="Failed to generate LinkedIn outline.",
        api_key=x_anthropic_api_key,
    )


@app.post("/api/generate-meta-social-outline", response_model=GenerateChannelOutlineResponse)
def generate_meta_social_outline_endpoint(
    body: GenerateChannelOutlineRequest,
    x_anthropic_api_key: Annotated[str | None, Header(alias="X-Anthropic-API-Key")] = None,
) -> GenerateChannelOutlineResponse:
    return _run_channel_outline_generation(
        body=body,
        generate_fn=generate_meta_social_outline,
        failure_detail="Failed to generate Meta Social outline.",
        api_key=x_anthropic_api_key,
    )
