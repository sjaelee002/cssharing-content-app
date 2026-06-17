#!/usr/bin/env python3
"""Collect a small CS job-posting snapshot from Saramin and JobKorea.

The script intentionally uses only Python's standard library so it can run in a
lightweight research folder without installing crawler dependencies. It reads no
environment files, does not log in, and skips pages that fail or change shape.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import html
import random
import re
import ssl
import sys
import time
import traceback
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Callable, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT_DIR / "data" / "raw" / "jobs" / "job_posts_raw.csv"
DEFAULT_ERROR_LOG = ROOT_DIR / "data" / "raw" / "jobs" / "job_posts_errors.log"

DEFAULT_KEYWORDS = [
    "고객센터",
    "고객상담",
    "고객지원",
    "CS",
    "CS 운영",
    "인바운드",
    "상담원",
    "고객응대",
    "VOC",
    "AS 상담",
    "클레임",
]

CSV_FIELDS = [
    "collected_at",
    "source",
    "search_keyword",
    "page",
    "result_rank",
    "sort_requested",
    "small_company_filter",
    "request_url",
    "posting_company_name",
    "title_bracket_text",
    "preferred_company_name",
    "job_title",
    "job_url",
    "company_url",
    "location",
    "experience",
    "education",
    "employment_type",
    "salary",
    "deadline",
    "job_sector_text",
    "metadata_text",
    "industry_signals",
    "cs_terms",
    "raw_card_text",
    "dedupe_key",
    "is_duplicate_within_run",
]

CS_TERMS = [
    "고객센터",
    "고객상담",
    "고객지원",
    "고객 응대",
    "고객응대",
    "상담원",
    "상담사",
    "인바운드",
    "아웃바운드",
    "콜센터",
    "컨택센터",
    "CS",
    "VOC",
    "클레임",
    "AS",
    "A/S",
    "민원",
    "해피콜",
    "채팅상담",
    "전화상담",
]

INDUSTRY_RULES = {
    "ecommerce_shopping": [
        "쇼핑몰",
        "이커머스",
        "e커머스",
        "온라인몰",
        "오픈마켓",
        "스마트스토어",
        "마켓플레이스",
        "상품문의",
        "교환",
        "반품",
    ],
    "logistics_delivery": ["배송", "택배", "물류", "풀필먼트", "운송", "배차", "퀵서비스"],
    "rental_subscription_as": [
        "렌탈",
        "구독",
        "정기배송",
        "설치",
        "수리",
        "A/S",
        "AS",
        "가전",
        "케어",
    ],
    "healthcare_medical": ["병원", "의원", "의료", "치과", "성형", "피부과", "한의원", "검진"],
    "education": ["교육", "학원", "강의", "수강", "입시", "어학", "에듀", "러닝"],
    "finance_insurance": ["금융", "보험", "카드", "대출", "증권", "은행", "캐피탈", "핀테크"],
    "it_platform_saas": [
        "플랫폼",
        "솔루션",
        "SaaS",
        "saas",
        "소프트웨어",
        "앱",
        "IT",
        "CRM",
        "ERP",
        "클라우드",
    ],
    "travel_leisure": ["여행", "항공", "호텔", "숙박", "레저", "예약", "관광"],
    "beauty_fashion": ["뷰티", "화장품", "패션", "의류", "잡화", "쥬얼리", "주얼리"],
    "food_beverage": ["식품", "푸드", "외식", "프랜차이즈", "카페", "음료", "배달"],
    "manufacturing_after_service": ["제조", "부품", "기계", "장비", "전자", "제품문의", "품질"],
    "telecom_media": ["통신", "인터넷", "방송", "미디어", "유선", "무선"],
    "real_estate_housing": ["부동산", "분양", "임대", "주거", "인테리어", "건설"],
    "mobility_auto": ["자동차", "차량", "렌터카", "모빌리티", "정비"],
    "public_association": ["공공", "공단", "공사", "기관", "협회", "재단", "지자체"],
}

SARMDOMAIN = "https://www.saramin.co.kr"
JOBKOREA_DOMAIN = "https://www.jobkorea.co.kr"


@dataclass
class Node:
    tag: str
    attrs: dict[str, str] = field(default_factory=dict)
    children: list["Node | str"] = field(default_factory=list)
    parent: "Node | None" = None


class TreeBuilder(HTMLParser):
    VOID_TAGS = {
        "area",
        "base",
        "br",
        "col",
        "embed",
        "hr",
        "img",
        "input",
        "link",
        "meta",
        "param",
        "source",
        "track",
        "wbr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k.lower(): v or "" for k, v in attrs}, parent=self.stack[-1])
        self.stack[-1].children.append(node)
        if node.tag not in self.VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k.lower(): v or "" for k, v in attrs}, parent=self.stack[-1])
        self.stack[-1].children.append(node)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for idx in range(len(self.stack) - 1, 0, -1):
            if self.stack[idx].tag == tag:
                del self.stack[idx:]
                break

    def handle_data(self, data: str) -> None:
        if data:
            self.stack[-1].children.append(data)


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def text_content(node: Node | None) -> str:
    if node is None:
        return ""
    parts: list[str] = []

    def walk(item: Node | str) -> None:
        if isinstance(item, str):
            parts.append(item)
            return
        if item.tag in {"script", "style", "noscript"}:
            return
        for child in item.children:
            walk(child)

    walk(node)
    return normalize_space(" ".join(parts))


def class_text(node: Node) -> str:
    return node.attrs.get("class", "")


def class_tokens(node: Node) -> set[str]:
    return set(class_text(node).split())


def has_class(node: Node, needle: str) -> bool:
    classes = class_text(node)
    return needle in class_tokens(node) or needle in classes


def has_any_class(node: Node, needles: Iterable[str]) -> bool:
    return any(has_class(node, needle) for needle in needles)


def iter_nodes(node: Node) -> Iterable[Node]:
    yield node
    for child in node.children:
        if isinstance(child, Node):
            yield from iter_nodes(child)


def find_all(node: Node, predicate: Callable[[Node], bool]) -> list[Node]:
    return [candidate for candidate in iter_nodes(node) if predicate(candidate)]


def find_first(node: Node | None, predicate: Callable[[Node], bool]) -> Node | None:
    if node is None:
        return None
    for candidate in iter_nodes(node):
        if predicate(candidate):
            return candidate
    return None


def first_text_by_class(node: Node, classes: Iterable[str]) -> str:
    return text_content(find_first(node, lambda n: has_any_class(n, classes)))


def first_link_by_predicate(node: Node | None, predicate: Callable[[Node], bool]) -> Node | None:
    return find_first(node, lambda n: n.tag == "a" and predicate(n))


def all_texts_by_tags(node: Node | None, tags: set[str]) -> list[str]:
    if node is None:
        return []
    texts = []
    for candidate in iter_nodes(node):
        if candidate.tag in tags:
            value = text_content(candidate)
            if value and value not in texts:
                texts.append(value)
    return texts


def parse_html(raw_html: str) -> Node:
    parser = TreeBuilder()
    parser.feed(raw_html)
    return parser.root


def fetch_html(url: str, timeout: int) -> tuple[str, str]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.6,en;q=0.5",
        "Connection": "close",
    }
    request = Request(url, headers=headers)
    context = ssl.create_default_context()
    if not context.get_ca_certs():
        for cafile in (
            Path("/etc/ssl/cert.pem"),
            Path("/opt/homebrew/etc/openssl@3/cert.pem"),
            Path("/usr/local/etc/openssl@3/cert.pem"),
        ):
            if cafile.exists():
                context = ssl.create_default_context(cafile=str(cafile))
                break
    with urlopen(request, timeout=timeout, context=context) as response:
        body = response.read()
        encoding = response.headers.get_content_charset() or "utf-8"
        return body.decode(encoding, errors="replace"), response.geturl()


def build_saramin_url(keyword: str, page: int, page_count: int) -> str:
    params = {
        "searchword": keyword,
        "search_optional_item": "y",
        "panel_count": "y",
        "recruitPage": str(page),
        # Saramin currently uses relation in the sample URL. reg_dt is requested
        # because the research asks for newest-first where the site supports it.
        "recruitSort": "reg_dt",
        "recruitPageCount": str(page_count),
        "inner_com_type": "scale003",
        "company_cd": "0,1,2,3,4,5,6,7,9,10",
        "show_applied": "",
        "quick_apply": "",
        "except_read": "",
        "ai_head_hunting": "",
        "mainSearch": "n",
    }
    return f"{SARMDOMAIN}/zf_user/search/recruit?{urlencode(params, quote_via=quote)}"


def build_jobkorea_url(keyword: str, page: int) -> str:
    params = {
        "stext": keyword,
        "tabType": "recruit",
        "cotype": "15",
        "Page_No": str(page),
        # Extra newest-first hints. If the site ignores one, the request still
        # falls back to its public search result page.
        "ord": "RegDtDesc",
    }
    return f"{JOBKOREA_DOMAIN}/Search?{urlencode(params, quote_via=quote)}"


def extract_bracket_text(title: str) -> str:
    match = re.match(r"^\s*[\[\(（【](.{1,40}?)[\]\)）】]", title)
    if not match:
        return ""
    value = normalize_space(match.group(1))
    generic_terms = {
        "긴급",
        "급구",
        "채용",
        "정규직",
        "계약직",
        "파트타임",
        "주말",
        "재택",
        "인바운드",
        "아웃바운드",
    }
    return "" if value in generic_terms else value


def split_meta_parts(text: str) -> list[str]:
    if not text:
        return []
    text = re.sub(r"\s*[|·∙ㆍ]\s*", " | ", text)
    parts = [normalize_space(part) for part in re.split(r"\s+\|\s+|(?<=\S)\s{2,}(?=\S)", text)]
    return [part for part in parts if part]


def classify_meta_parts(parts: list[str]) -> dict[str, str]:
    fields = {
        "location": "",
        "experience": "",
        "education": "",
        "employment_type": "",
        "salary": "",
    }
    locations = [
        "서울",
        "경기",
        "인천",
        "부산",
        "대구",
        "광주",
        "대전",
        "울산",
        "세종",
        "강원",
        "충북",
        "충남",
        "전북",
        "전남",
        "경북",
        "경남",
        "제주",
        "전국",
        "재택",
        "해외",
    ]
    experience_terms = ["경력", "신입", "무관", "년", "인턴"]
    education_terms = ["학력", "졸업", "고졸", "초대졸", "대졸", "석사", "박사", "무관"]
    employment_terms = ["정규직", "계약직", "파견", "인턴", "아르바이트", "프리랜서", "위촉", "기간제"]
    salary_terms = ["만원", "연봉", "월급", "급여", "시급", "면접후", "회사내규"]

    for part in parts:
        if not fields["location"] and any(term in part for term in locations):
            fields["location"] = part
        elif not fields["experience"] and any(term in part for term in experience_terms):
            fields["experience"] = part
        elif not fields["education"] and any(term in part for term in education_terms):
            fields["education"] = part
        elif not fields["employment_type"] and any(term in part for term in employment_terms):
            fields["employment_type"] = part
        elif not fields["salary"] and any(term in part for term in salary_terms):
            fields["salary"] = part
    return fields


def matched_terms(text: str, terms: Iterable[str]) -> list[str]:
    matches = []
    for term in terms:
        if re.fullmatch(r"[A-Za-z0-9/+.-]{1,4}", term):
            found = bool(re.search(rf"(?<![A-Za-z0-9]){re.escape(term)}(?![A-Za-z0-9])", text, re.I))
        else:
            found = term.lower() in text.lower()
        if found and term not in matches:
            matches.append(term)
    return matches


def industry_signals(text: str) -> list[str]:
    signals = []
    for industry, terms in INDUSTRY_RULES.items():
        if matched_terms(text, terms):
            signals.append(industry)
    return signals


def clean_title(title: str) -> str:
    return normalize_space(re.sub(r"스크랩|즉시지원|입사지원|상세보기", " ", title))


def best_href(link: Node | None, base_url: str) -> str:
    if link is None:
        return ""
    href = link.attrs.get("href", "")
    if not href or href.startswith("#") or href.lower().startswith("javascript:"):
        return ""
    return urljoin(base_url, href)


def canonical_jobkorea_href(href: str) -> str:
    match = re.search(r"/Recruit/GI_Read/(\d+)", href, flags=re.IGNORECASE)
    if match:
        return match.group(1)
    return href.split("?")[0]


def nearest_ancestor(node: Node, predicate: Callable[[Node], bool], max_hops: int = 8) -> Node:
    current: Node | None = node
    hops = 0
    while current is not None and hops <= max_hops:
        if predicate(current):
            return current
        current = current.parent
        hops += 1
    return node.parent or node


def dedupe_nodes(nodes: Iterable[Node]) -> list[Node]:
    seen = set()
    output = []
    for node in nodes:
        key = id(node)
        if key not in seen:
            output.append(node)
            seen.add(key)
    return output


def extract_saramin_cards(root: Node) -> list[Node]:
    cards = find_all(root, lambda n: has_class(n, "item_recruit"))
    if cards:
        return cards

    job_links = find_all(
        root,
        lambda n: n.tag == "a"
        and (
            "/zf_user/jobs/relay/view" in n.attrs.get("href", "")
            or "rec_idx=" in n.attrs.get("href", "")
        ),
    )
    return dedupe_nodes(
        nearest_ancestor(
            link,
            lambda ancestor: ancestor.tag in {"div", "li", "article"}
            and len(text_content(ancestor)) > 40,
        )
        for link in job_links
    )


def parse_saramin_card(card: Node, base_url: str) -> dict[str, str]:
    corp_area = find_first(card, lambda n: has_any_class(n, ["area_corp", "corp_name"]))
    company_link = first_link_by_predicate(
        corp_area or card,
        lambda n: bool(text_content(n)) and "/zf_user/company-info" in n.attrs.get("href", ""),
    )
    if company_link is None:
        company_link = first_link_by_predicate(
            corp_area or card,
            lambda n: bool(text_content(n)) and "company" in n.attrs.get("href", "").lower(),
        )

    title_link = first_link_by_predicate(
        card,
        lambda n: "/zf_user/jobs/relay/view" in n.attrs.get("href", "")
        or "rec_idx=" in n.attrs.get("href", "")
        or has_any_class(n, ["str_tit", "job_tit", "data_layer"]),
    )
    title = clean_title(text_content(title_link))
    company = normalize_space(text_content(company_link))

    condition_node = find_first(card, lambda n: has_any_class(n, ["job_condition", "condition"]))
    sector_node = find_first(card, lambda n: has_any_class(n, ["job_sector", "sector", "job_sector_data"]))
    date_node = find_first(card, lambda n: has_any_class(n, ["area_date", "date", "job_date"]))

    condition_parts = all_texts_by_tags(condition_node, {"span", "li"})
    if not condition_parts:
        condition_parts = split_meta_parts(text_content(condition_node))
    meta = classify_meta_parts(condition_parts)
    sector_text = text_content(sector_node)
    deadline = text_content(date_node)
    raw_text = text_content(card)

    bracket_text = extract_bracket_text(title)
    return {
        "posting_company_name": company,
        "title_bracket_text": bracket_text,
        "preferred_company_name": bracket_text or company,
        "job_title": title,
        "job_url": best_href(title_link, base_url),
        "company_url": best_href(company_link, base_url),
        "location": meta["location"],
        "experience": meta["experience"],
        "education": meta["education"],
        "employment_type": meta["employment_type"],
        "salary": meta["salary"],
        "deadline": deadline,
        "job_sector_text": sector_text,
        "metadata_text": " | ".join(condition_parts),
        "raw_card_text": raw_text,
    }


def extract_jobkorea_cards(root: Node) -> list[Node]:
    job_links = find_all(
        root,
        lambda n: n.tag == "a"
        and (
            "GI_Read" in n.attrs.get("href", "")
            or "gi_read" in n.attrs.get("href", "").lower()
            or "/Recruit/GI_Read" in n.attrs.get("href", "")
        ),
    )
    seen_jobs = set()
    cards = []
    for link in job_links:
        title = clean_title(text_content(link))
        if not title:
            continue
        job_key = canonical_jobkorea_href(link.attrs.get("href", ""))
        if job_key in seen_jobs:
            continue
        seen_jobs.add(job_key)

        def is_card_ancestor(ancestor: Node) -> bool:
            if ancestor.tag not in {"article", "li", "div"}:
                return False
            same_job_links = find_all(
                ancestor,
                lambda n: n.tag == "a"
                and canonical_jobkorea_href(n.attrs.get("href", "")) == job_key,
            )
            return len(same_job_links) >= 2 and len(text_content(ancestor)) > len(title) + 10

        cards.append(
            nearest_ancestor(
                link,
                is_card_ancestor,
                max_hops=10,
            )
        )
    return cards


def parse_jobkorea_card(card: Node, base_url: str) -> dict[str, str]:
    title_links = find_all(
        card,
        lambda n: n.tag == "a"
        and (
            "GI_Read" in n.attrs.get("href", "")
            or "gi_read" in n.attrs.get("href", "").lower()
        ),
    )
    text_links = [(link, clean_title(text_content(link))) for link in title_links]
    text_links = [(link, title) for link, title in text_links if title]
    title_link = next(
        (link for link, _ in text_links if "max-w" in class_text(link) or "information-title" in class_text(link)),
        None,
    )
    if title_link is None and text_links:
        title_link = max(text_links, key=lambda item: len(item[1]))[0]
    if title_link is None:
        title_link = first_link_by_predicate(
            card,
            lambda n: has_any_class(n, ["information-title-link", "title", "link"]),
        )
    company_link = first_link_by_predicate(
        card,
        lambda n: has_any_class(n, ["corp-name-link", "corp", "company"])
        or "Co_Read" in n.attrs.get("href", "")
        or "co_read" in n.attrs.get("href", "").lower()
    )
    if company_link is None:
        corp_area = find_first(card, lambda n: has_any_class(n, ["corp", "company", "post-list-corp"]))
        company_link = first_link_by_predicate(corp_area, lambda n: bool(text_content(n)))
    if company_link is None and title_link is not None:
        title_key = canonical_jobkorea_href(title_link.attrs.get("href", ""))
        title_text = clean_title(text_content(title_link))
        same_job_text_links = [
            (link, title)
            for link, title in text_links
            if link is not title_link
            and title != title_text
            and canonical_jobkorea_href(link.attrs.get("href", "")) == title_key
        ]
        if same_job_text_links:
            company_link = min(same_job_text_links, key=lambda item: len(item[1]))[0]

    title = clean_title(text_content(title_link))
    company = normalize_space(text_content(company_link))

    meta_nodes = find_all(
        card,
        lambda n: has_any_class(
            n,
            [
                "chip-information-group",
                "list-section-information",
                "option",
                "job-info",
                "post-list-info",
                "information",
                "career",
            ],
        ),
    )
    meta_text = " | ".join(text_content(node) for node in meta_nodes if text_content(node))
    parts = split_meta_parts(meta_text)
    if not parts:
        parts = all_texts_by_tags(card, {"li", "span"})
    meta = classify_meta_parts(parts)

    deadline = first_text_by_class(card, ["date", "deadline", "day", "support"])
    sector_text = first_text_by_class(card, ["job-sector", "sector", "item-tag", "tag"])
    raw_text = text_content(card)
    bracket_text = extract_bracket_text(title)

    return {
        "posting_company_name": company,
        "title_bracket_text": bracket_text,
        "preferred_company_name": bracket_text or company,
        "job_title": title,
        "job_url": best_href(title_link, base_url),
        "company_url": best_href(company_link, base_url),
        "location": meta["location"],
        "experience": meta["experience"],
        "education": meta["education"],
        "employment_type": meta["employment_type"],
        "salary": meta["salary"],
        "deadline": deadline,
        "job_sector_text": sector_text,
        "metadata_text": " | ".join(parts),
        "raw_card_text": raw_text,
    }


def normalize_dedupe_key(row: dict[str, str]) -> str:
    if row.get("job_url"):
        parsed_url = urlparse(row["job_url"])
        if "saramin.co.kr" in parsed_url.netloc:
            rec_idx = parse_qs(parsed_url.query).get("rec_idx", [""])[0]
            if rec_idx:
                return f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}?rec_idx={rec_idx}"
        jobkorea_match = re.search(r"/Recruit/GI_Read/(\d+)", parsed_url.path, flags=re.IGNORECASE)
        if jobkorea_match:
            return f"{parsed_url.scheme}://{parsed_url.netloc}/Recruit/GI_Read/{jobkorea_match.group(1)}"
        return row["job_url"].split("#")[0]
    return "|".join(
        normalize_space(row.get(field, "")).lower()
        for field in ("source", "posting_company_name", "job_title")
    )


def make_row(
    *,
    collected_at: str,
    source: str,
    keyword: str,
    page: int,
    rank: int,
    url: str,
    parsed: dict[str, str],
    seen_keys: set[str],
) -> dict[str, str]:
    signal_text = " ".join(
        [
            parsed.get("job_title", ""),
            parsed.get("posting_company_name", ""),
            parsed.get("job_sector_text", ""),
            parsed.get("metadata_text", ""),
            parsed.get("raw_card_text", ""),
        ]
    )
    row = {
        "collected_at": collected_at,
        "source": source,
        "search_keyword": keyword,
        "page": str(page),
        "result_rank": str(rank),
        "sort_requested": "latest",
        "small_company_filter": "saramin:inner_com_type=scale003; jobkorea:cotype=15",
        "request_url": url,
        **{field: parsed.get(field, "") for field in CSV_FIELDS if field in parsed},
        "industry_signals": ";".join(industry_signals(signal_text)),
        "cs_terms": ";".join(matched_terms(signal_text, CS_TERMS)),
    }
    dedupe_key = normalize_dedupe_key({**row, **parsed, "source": source})
    row["dedupe_key"] = dedupe_key
    row["is_duplicate_within_run"] = "true" if dedupe_key in seen_keys else "false"
    seen_keys.add(dedupe_key)
    return {field: row.get(field, "") for field in CSV_FIELDS}


def log_error(
    log_path: Path,
    *,
    source: str,
    keyword: str,
    page: int,
    url: str,
    error: BaseException | str,
    include_traceback: bool = False,
) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logged_at = dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds")
    if isinstance(error, BaseException):
        error_type = type(error).__name__
        message = str(error)
    else:
        error_type = "PageParseWarning"
        message = error
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(
            f"[{logged_at}] source={source} keyword={keyword!r} page={page} "
            f"type={error_type} url={url} message={message}\n"
        )
        if include_traceback:
            handle.write(traceback.format_exc())
            handle.write("\n")


def collect_page(
    *,
    source: str,
    keyword: str,
    page: int,
    url: str,
    timeout: int,
    collected_at: str,
    seen_keys: set[str],
    error_log: Path,
) -> list[dict[str, str]]:
    html_text, final_url = fetch_html(url, timeout=timeout)
    root = parse_html(html_text)
    if source == "saramin":
        cards = extract_saramin_cards(root)
        parser = parse_saramin_card
    elif source == "jobkorea":
        cards = extract_jobkorea_cards(root)
        parser = parse_jobkorea_card
    else:
        raise ValueError(f"Unknown source: {source}")

    rows = []
    if not cards:
        log_error(
            error_log,
            source=source,
            keyword=keyword,
            page=page,
            url=final_url,
            error="No posting cards found. Site markup may have changed or the result page is empty.",
        )
        return rows

    for rank, card in enumerate(cards, start=1):
        try:
            parsed = parser(card, final_url)
            if not parsed.get("job_title") and not parsed.get("job_url"):
                continue
            rows.append(
                make_row(
                    collected_at=collected_at,
                    source=source,
                    keyword=keyword,
                    page=page,
                    rank=rank,
                    url=final_url,
                    parsed=parsed,
                    seen_keys=seen_keys,
                )
            )
        except Exception as exc:  # noqa: BLE001 - keep the page moving.
            log_error(
                error_log,
                source=source,
                keyword=keyword,
                page=page,
                url=final_url,
                error=exc,
                include_traceback=True,
            )
    return rows


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect a small newest-first CS job-posting snapshot from Saramin and JobKorea."
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--error-log", type=Path, default=DEFAULT_ERROR_LOG)
    parser.add_argument("--pages", type=int, default=3, help="Pages per keyword/source. Default: 3")
    parser.add_argument(
        "--saramin-page-count",
        type=int,
        default=20,
        help="Saramin result cards per page. Kept small for snapshot collection. Default: 20",
    )
    parser.add_argument("--delay-min", type=float, default=2.0)
    parser.add_argument("--delay-max", type=float, default=4.0)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument(
        "--keywords",
        nargs="*",
        default=DEFAULT_KEYWORDS,
        help="Search keywords. Default: CS seed keyword list.",
    )
    parser.add_argument(
        "--sources",
        nargs="*",
        default=["saramin", "jobkorea"],
        choices=["saramin", "jobkorea"],
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.pages < 1 or args.pages > 3:
        raise SystemExit("--pages must be between 1 and 3 for snapshot collection.")
    if args.delay_min < 0 or args.delay_max < args.delay_min:
        raise SystemExit("--delay-max must be greater than or equal to --delay-min.")

    collected_at = dt.datetime.now(dt.timezone.utc).astimezone().isoformat(timespec="seconds")
    rows: list[dict[str, str]] = []
    seen_keys: set[str] = set()
    total_pages = len(args.keywords) * len(args.sources) * args.pages
    page_counter = 0
    if args.error_log.exists():
        args.error_log.unlink()

    for keyword in args.keywords:
        for source in args.sources:
            for page in range(1, args.pages + 1):
                page_counter += 1
                if source == "saramin":
                    url = build_saramin_url(keyword, page, args.saramin_page_count)
                else:
                    url = build_jobkorea_url(keyword, page)

                print(
                    f"[{page_counter}/{total_pages}] {source} keyword={keyword!r} page={page}",
                    flush=True,
                )
                try:
                    page_rows = collect_page(
                        source=source,
                        keyword=keyword,
                        page=page,
                        url=url,
                        timeout=args.timeout,
                        collected_at=collected_at,
                        seen_keys=seen_keys,
                        error_log=args.error_log,
                    )
                    rows.extend(page_rows)
                    print(f"  collected rows: {len(page_rows)}", flush=True)
                except (HTTPError, URLError, TimeoutError, UnicodeError, OSError) as exc:
                    print(f"  skipped page: {type(exc).__name__}: {exc}", flush=True)
                    log_error(
                        args.error_log,
                        source=source,
                        keyword=keyword,
                        page=page,
                        url=url,
                        error=exc,
                    )
                except Exception as exc:  # noqa: BLE001 - keep the run resilient.
                    print(f"  skipped page: {type(exc).__name__}: {exc}", flush=True)
                    log_error(
                        args.error_log,
                        source=source,
                        keyword=keyword,
                        page=page,
                        url=url,
                        error=exc,
                        include_traceback=True,
                    )

                if page_counter < total_pages:
                    time.sleep(random.uniform(args.delay_min, args.delay_max))

    write_csv(args.output, rows)
    print(f"Wrote {len(rows)} rows to {args.output}", flush=True)
    if args.error_log.exists():
        print(f"Errors/warnings logged to {args.error_log}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
