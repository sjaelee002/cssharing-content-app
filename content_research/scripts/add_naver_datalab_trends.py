#!/usr/bin/env python3
"""Add Naver DataLab relative trend signals to topic candidates.

This script supplements the existing job/news-based topic research. It does not
replace or rewrite the original topic candidate CSV or Markdown summary.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import json
import re
import ssl
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


CONTENT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = CONTENT_ROOT.parent

TOPIC_CANDIDATES_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_candidates.csv"
BASE_SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_research_summary.md"
RAW_TRENDS_PATH = CONTENT_ROOT / "data" / "raw" / "naver_datalab" / "topic_keyword_trends_raw.json"
TREND_SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "naver_datalab_trend_summary.csv"
TOPICS_WITH_TRENDS_PATH = (
    CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_candidates_with_trends.csv"
)
SUMMARY_WITH_TRENDS_PATH = (
    CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_research_summary_with_trends.md"
)
ENV_PATH = REPO_ROOT / ".env"

NAVER_DATALAB_ENDPOINT = "https://openapi.naver.com/v1/datalab/search"
START_DATE = "2025-01-01"
END_DATE = "2026-06-15"
TIME_UNIT = "month"
MAX_KEYWORDS = 30
MAX_GROUPS_PER_REQUEST = 5

PRIORITY_INDUSTRIES = ["이커머스/쇼핑몰", "렌탈/구독/AS", "병원/헬스케어"]
COMMON_AI_CX_KEYWORDS = [
    "고객센터 운영",
    "CS 대행",
    "고객센터 아웃소싱",
    "AI 상담",
    "AI VOC",
    "CX 관리",
]

TREND_FIELDS = [
    "keyword",
    "keyword_source",
    "priority_industry",
    "api_chunk",
    "period_count",
    "avg_ratio",
    "max_ratio",
    "recent_3m_avg",
    "trend_delta",
    "trend_label",
]


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def load_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def split_keywords(value: str) -> list[str]:
    chunks = re.split(r"[,;/|]", value or "")
    return [clean_text(chunk) for chunk in chunks if clean_text(chunk)]


def normalize_keyword(keyword: str) -> str:
    keyword = clean_text(keyword)
    keyword = keyword.strip(" .,/|;:")
    keyword = re.sub(r"\s+", " ", keyword)
    return keyword


def add_keyword(
    keywords: list[dict[str, str]],
    seen: set[str],
    *,
    keyword: str,
    source: str,
    industry: str = "",
) -> None:
    normalized = normalize_keyword(keyword)
    if not normalized or len(normalized) < 2:
        return
    if len(normalized) > 30:
        return
    key = normalized.lower()
    if key in seen or len(keywords) >= MAX_KEYWORDS:
        return
    seen.add(key)
    keywords.append(
        {
            "keyword": normalized,
            "keyword_source": source,
            "priority_industry": industry,
        }
    )


def build_keyword_candidates(topic_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    keywords: list[dict[str, str]] = []
    seen: set[str] = set()

    # Keep every existing topic directly joinable through its main_keyword.
    for row in topic_rows:
        add_keyword(
            keywords,
            seen,
            keyword=row.get("main_keyword", ""),
            source="topic_main_keyword",
            industry=row.get("target_industry", ""),
        )

    # Add common AI/CX terms as a lightweight cross-industry supplement.
    for keyword in COMMON_AI_CX_KEYWORDS:
        add_keyword(keywords, seen, keyword=keyword, source="ai_cx_common", industry="AI/CX 공통")

    # Balance longtail additions across the priority industries.
    by_industry: dict[str, list[str]] = defaultdict(list)
    for row in topic_rows:
        industry = row.get("target_industry", "")
        if industry not in PRIORITY_INDUSTRIES:
            continue
        for keyword in split_keywords(row.get("longtail_keywords", "")):
            by_industry[industry].append(keyword)

    round_idx = 0
    while len(keywords) < MAX_KEYWORDS:
        added_this_round = False
        for industry in PRIORITY_INDUSTRIES:
            industry_keywords = by_industry.get(industry, [])
            if round_idx < len(industry_keywords):
                before = len(keywords)
                add_keyword(
                    keywords,
                    seen,
                    keyword=industry_keywords[round_idx],
                    source="priority_industry_longtail",
                    industry=industry,
                )
                added_this_round = added_this_round or len(keywords) > before
                if len(keywords) >= MAX_KEYWORDS:
                    break
        if not added_this_round:
            break
        round_idx += 1

    return keywords[:MAX_KEYWORDS]


def load_env_values(path: Path) -> tuple[str, str]:
    values: dict[str, str] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    client_id = values.get("NAVER_CLIENT_ID", "")
    client_secret = values.get("NAVER_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise ValueError("NAVER_CLIENT_ID or NAVER_CLIENT_SECRET is missing in .env")
    return client_id, client_secret


def ssl_context() -> ssl.SSLContext:
    context = ssl.create_default_context()
    if context.get_ca_certs():
        return context
    for cafile in (
        Path("/etc/ssl/cert.pem"),
        Path("/opt/homebrew/etc/openssl@3/cert.pem"),
        Path("/usr/local/etc/openssl@3/cert.pem"),
    ):
        if cafile.exists():
            return ssl.create_default_context(cafile=str(cafile))
    return context


def chunked(values: list[dict[str, str]], size: int) -> Iterable[list[dict[str, str]]]:
    for idx in range(0, len(values), size):
        yield values[idx : idx + size]


def request_datalab_chunk(
    chunk: list[dict[str, str]],
    *,
    client_id: str,
    client_secret: str,
    timeout: int,
) -> dict[str, object]:
    payload = {
        "startDate": START_DATE,
        "endDate": END_DATE,
        "timeUnit": TIME_UNIT,
        "keywordGroups": [
            {"groupName": item["keyword"], "keywords": [item["keyword"]]} for item in chunk
        ],
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(
        NAVER_DATALAB_ENDPOINT,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
            "User-Agent": "cssharing-content-research/0.1",
        },
        method="POST",
    )
    with urlopen(request, timeout=timeout, context=ssl_context()) as response:
        return json.loads(response.read().decode("utf-8"))


def collect_datalab_raw(
    keyword_items: list[dict[str, str]],
    *,
    client_id: str,
    client_secret: str,
    delay_seconds: float,
    timeout: int,
) -> dict[str, object]:
    chunks = list(chunked(keyword_items, MAX_GROUPS_PER_REQUEST))
    raw: dict[str, object] = {
        "created_at": dt.datetime.now().isoformat(timespec="seconds"),
        "api": "Naver DataLab Search Trend",
        "interpretation_note": "All ratios are relative trends from Naver DataLab, not absolute search volume.",
        "period": {"startDate": START_DATE, "endDate": END_DATE, "timeUnit": TIME_UNIT},
        "selected_keywords": keyword_items,
        "requests": [],
    }

    requests: list[dict[str, object]] = []
    for idx, chunk in enumerate(chunks, start=1):
        print(f"[datalab {idx}/{len(chunks)}] keywords={len(chunk)}", flush=True)
        request_payload = {
            "startDate": START_DATE,
            "endDate": END_DATE,
            "timeUnit": TIME_UNIT,
            "keywordGroups": [
                {"groupName": item["keyword"], "keywords": [item["keyword"]]} for item in chunk
            ],
        }
        try:
            response = request_datalab_chunk(
                chunk,
                client_id=client_id,
                client_secret=client_secret,
                timeout=timeout,
            )
            requests.append(
                {
                    "chunk": idx,
                    "request": request_payload,
                    "response": response,
                    "error": "",
                }
            )
            result_count = len(response.get("results", [])) if isinstance(response, dict) else 0
            print(f"  collected result groups: {result_count}", flush=True)
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            requests.append(
                {
                    "chunk": idx,
                    "request": request_payload,
                    "response": {},
                    "error": f"{type(exc).__name__}: {exc}",
                }
            )
            print(f"  skipped chunk: {type(exc).__name__}", flush=True)
        time.sleep(delay_seconds)
    raw["requests"] = requests
    return raw


def save_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_raw_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def average(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def trend_label(recent_3m_avg: float, trend_delta: float) -> str:
    if recent_3m_avg == 0:
        return "데이터 없음"
    if trend_delta >= 10:
        return "상승"
    if trend_delta >= 4:
        return "완만 상승"
    if trend_delta <= -10:
        return "하락"
    if trend_delta <= -4:
        return "완만 하락"
    return "보합"


def round_float(value: float) -> str:
    return f"{value:.2f}"


def build_trend_summary(raw: dict[str, object]) -> list[dict[str, str]]:
    selected = {
        item["keyword"]: item
        for item in raw.get("selected_keywords", [])
        if isinstance(item, dict) and item.get("keyword")
    }
    rows: list[dict[str, str]] = []
    for request_info in raw.get("requests", []):
        if not isinstance(request_info, dict):
            continue
        chunk_no = str(request_info.get("chunk", ""))
        response = request_info.get("response", {})
        if not isinstance(response, dict):
            continue
        for result in response.get("results", []):
            if not isinstance(result, dict):
                continue
            keyword = clean_text(result.get("title", ""))
            data = result.get("data", [])
            ratios = [
                float(point.get("ratio", 0))
                for point in data
                if isinstance(point, dict) and point.get("ratio") is not None
            ]
            recent = ratios[-3:]
            previous = ratios[-6:-3] if len(ratios) >= 6 else ratios[:-3]
            avg_ratio = average(ratios)
            max_ratio = max(ratios) if ratios else 0.0
            recent_3m_avg = average(recent)
            trend_delta = recent_3m_avg - average(previous)
            meta = selected.get(keyword, {})
            rows.append(
                {
                    "keyword": keyword,
                    "keyword_source": str(meta.get("keyword_source", "")),
                    "priority_industry": str(meta.get("priority_industry", "")),
                    "api_chunk": chunk_no,
                    "period_count": str(len(ratios)),
                    "avg_ratio": round_float(avg_ratio),
                    "max_ratio": round_float(max_ratio),
                    "recent_3m_avg": round_float(recent_3m_avg),
                    "trend_delta": round_float(trend_delta),
                    "trend_label": trend_label(recent_3m_avg, trend_delta),
                }
            )
    return rows


def topic_keyword_items(row: dict[str, str]) -> list[dict[str, object]]:
    keywords: list[dict[str, object]] = [
        {"keyword": row.get("main_keyword", ""), "match_source": "main_keyword", "weight": 1.0}
    ]
    keywords.extend(
        {"keyword": keyword, "match_source": "longtail_keyword", "weight": 0.9}
        for keyword in split_keywords(row.get("longtail_keywords", ""))
    )
    industry = row.get("target_industry", "")
    if industry in PRIORITY_INDUSTRIES:
        keywords.extend(
            {"keyword": keyword, "match_source": "ai_cx_common_fallback", "weight": 0.35}
            for keyword in COMMON_AI_CX_KEYWORDS
        )
    output = []
    seen = set()
    for item in keywords:
        keyword = normalize_keyword(str(item["keyword"]))
        if not keyword or keyword.lower() in seen:
            continue
        seen.add(keyword.lower())
        output.append({**item, "keyword": keyword})
    return output


def trend_score(row: dict[str, str]) -> float:
    try:
        recent = float(row.get("recent_3m_avg", "0") or 0)
        delta = float(row.get("trend_delta", "0") or 0)
    except ValueError:
        return 0.0
    return max(0.0, min(100.0, recent + max(delta, 0) * 0.5))


def add_trends_to_topics(
    topic_rows: list[dict[str, str]],
    trend_rows: list[dict[str, str]],
) -> tuple[list[dict[str, str]], list[str]]:
    trend_by_keyword = {row["keyword"].lower(): row for row in trend_rows}
    output_rows: list[dict[str, str]] = []
    for row in topic_rows:
        matches = []
        for item in topic_keyword_items(row):
            keyword = str(item["keyword"])
            trend = trend_by_keyword.get(keyword.lower())
            if trend:
                base_score = trend_score(trend)
                weight = float(item["weight"])
                weighted_score = base_score * weight
                if item["match_source"] == "ai_cx_common_fallback":
                    weighted_score = min(weighted_score, 25.0)
                matches.append((weighted_score, keyword, trend, str(item["match_source"])))
        if matches:
            specific_matches = [match for match in matches if match[3] != "ai_cx_common_fallback" and match[0] > 0]
            match_pool = specific_matches or matches
            score, keyword, trend, match_source = max(match_pool, key=lambda item: item[0])
            note = (
                f"상대 트렌드 기준 '{keyword}'({match_source}): "
                f"recent_3m_avg={trend['recent_3m_avg']}, "
                f"trend_delta={trend['trend_delta']}, label={trend['trend_label']}"
            )
            output = {
                **row,
                "naver_trend_score": round_float(score),
                "trend_note": note,
            }
        else:
            output = {
                **row,
                "naver_trend_score": "0.00",
                "trend_note": "상대 트렌드 보강 키워드에 매칭된 키워드 없음",
            }
        output_rows.append(output)
    fieldnames = list(topic_rows[0].keys()) + ["naver_trend_score", "trend_note"] if topic_rows else []
    return output_rows, fieldnames


def markdown_table(headers: list[str], rows: list[list[object]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(cell).replace("|", "/") for cell in row) + " |")
    return "\n".join(lines)


def build_markdown_appendix(
    trend_rows: list[dict[str, str]],
    topic_rows: list[dict[str, str]],
) -> str:
    sorted_trends = sorted(
        trend_rows,
        key=lambda row: (
            float(row.get("recent_3m_avg", "0") or 0),
            float(row.get("trend_delta", "0") or 0),
        ),
        reverse=True,
    )
    trend_table_rows = [
        [
            row["keyword"],
            row["recent_3m_avg"],
            row["trend_delta"],
            row["trend_label"],
            row["keyword_source"],
        ]
        for row in sorted_trends[:15]
    ]

    sorted_topics = sorted(
        topic_rows,
        key=lambda row: float(row.get("naver_trend_score", "0") or 0),
        reverse=True,
    )
    topic_table_rows = [
        [
            idx,
            row["target_industry"],
            row["content_topic"],
            row["naver_trend_score"],
            row["trend_note"],
        ]
        for idx, row in enumerate(sorted_topics[:20], start=1)
    ]

    return "\n".join(
        [
            "",
            "## 네이버 데이터랩 상대 트렌드 보강",
            "",
            (
                f"기간: {START_DATE} ~ {END_DATE}, 단위: 월. "
                "네이버 데이터랩 값은 절대 검색량이 아니라 상대 트렌드이므로, "
                "아래 점수와 라벨은 콘텐츠 주제 우선순위를 보강하는 참고 신호로만 해석한다."
            ),
            "",
            "### 분석 키워드 구성",
            "",
            (
                f"기존 topic candidate의 main_keyword를 우선 포함하고, "
                f"이커머스/쇼핑몰, 렌탈/구독/AS, 병원/헬스케어 longtail 및 AI/CX 공통 키워드를 더해 "
                f"총 {len(trend_rows)}개 키워드의 상대 트렌드를 확인했다."
            ),
            "",
            "### 상대 트렌드 상위 키워드",
            "",
            markdown_table(
                ["키워드", "최근 3개월 평균", "직전 3개월 대비", "라벨", "출처"],
                trend_table_rows,
            ),
            "",
            "### 상대 트렌드 보강 주제 Top 20",
            "",
            markdown_table(
                ["순위", "산업", "콘텐츠 주제", "트렌드 점수", "트렌드 메모"],
                topic_table_rows,
            ),
            "",
            "### 해석 시 주의",
            "",
            "- 데이터랩 ratio는 선택한 키워드 그룹 안에서 계산되는 상대 트렌드이며, 키워드별 실제 검색량 규모를 의미하지 않는다.",
            "- API 제한 때문에 키워드를 5개 단위로 나누어 호출했으므로, 서로 다른 호출 묶음 간 ratio 비교는 보수적으로 봐야 한다.",
            "- 이번 보강은 기존 채용공고 snapshot 및 뉴스 기반 콘텐츠 리서치를 대체하지 않고, 발행 우선순위를 잡는 보조 신호로만 사용한다.",
            "",
            "### 추가 산출 파일",
            "",
            f"- raw DataLab response: `{RAW_TRENDS_PATH.relative_to(CONTENT_ROOT)}`",
            f"- trend summary: `{TREND_SUMMARY_PATH.relative_to(CONTENT_ROOT)}`",
            f"- topic candidates with trends: `{TOPICS_WITH_TRENDS_PATH.relative_to(CONTENT_ROOT)}`",
        ]
    )


def write_summary_with_trends(topic_rows: list[dict[str, str]], trend_rows: list[dict[str, str]]) -> None:
    base_summary = BASE_SUMMARY_PATH.read_text(encoding="utf-8") if BASE_SUMMARY_PATH.exists() else ""
    appendix = build_markdown_appendix(trend_rows, topic_rows)
    SUMMARY_WITH_TRENDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_WITH_TRENDS_PATH.write_text(base_summary.rstrip() + "\n" + appendix + "\n", encoding="utf-8")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Add Naver DataLab relative trend supplement.")
    parser.add_argument("--reuse-raw", action="store_true", help="Reuse existing raw DataLab JSON.")
    parser.add_argument("--delay", type=float, default=0.35)
    parser.add_argument("--timeout", type=int, default=20)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    topic_rows = load_csv(TOPIC_CANDIDATES_PATH)
    keyword_items = build_keyword_candidates(topic_rows)
    if len(keyword_items) > MAX_KEYWORDS:
        raise RuntimeError(f"Keyword count exceeded {MAX_KEYWORDS}: {len(keyword_items)}")

    if args.reuse_raw and RAW_TRENDS_PATH.exists():
        raw_payload = load_raw_json(RAW_TRENDS_PATH)
    else:
        client_id, client_secret = load_env_values(ENV_PATH)
        raw_payload = collect_datalab_raw(
            keyword_items,
            client_id=client_id,
            client_secret=client_secret,
            delay_seconds=args.delay,
            timeout=args.timeout,
        )
        save_json(RAW_TRENDS_PATH, raw_payload)

    trend_rows = build_trend_summary(raw_payload)
    write_csv(TREND_SUMMARY_PATH, TREND_FIELDS, trend_rows)

    topic_rows_with_trends, topic_fieldnames = add_trends_to_topics(topic_rows, trend_rows)
    write_csv(TOPICS_WITH_TRENDS_PATH, topic_fieldnames, topic_rows_with_trends)
    write_summary_with_trends(topic_rows_with_trends, trend_rows)

    print(f"Selected DataLab keywords: {len(keyword_items)}", flush=True)
    print(f"Trend summary rows: {len(trend_rows)}", flush=True)
    print(f"Wrote {RAW_TRENDS_PATH}", flush=True)
    print(f"Wrote {TREND_SUMMARY_PATH}", flush=True)
    print(f"Wrote {TOPICS_WITH_TRENDS_PATH}", flush=True)
    print(f"Wrote {SUMMARY_WITH_TRENDS_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
