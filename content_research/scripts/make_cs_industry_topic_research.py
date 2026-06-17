#!/usr/bin/env python3
"""Create a quick CS industry/topic research report.

Inputs:
- content_research/data/raw/jobs/job_posts_raw.csv
- root .env with NAVER_CLIENT_ID and NAVER_CLIENT_SECRET

Outputs:
- content_research/data/processed/jobs/cs_industry_snapshot.csv
- content_research/data/raw/naver_news/industry_news_sources.csv
- content_research/outputs/topic_research/cs_industry_topic_candidates.csv
- content_research/outputs/topic_research/cs_industry_topic_research_summary.md

This is intentionally a lightweight, rule-based research script. It is not a
market sizing or clustering pipeline.
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
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


CONTENT_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = CONTENT_ROOT.parent

RAW_JOBS_PATH = CONTENT_ROOT / "data" / "raw" / "jobs" / "job_posts_raw.csv"
PROCESSED_JOBS_PATH = CONTENT_ROOT / "data" / "processed" / "jobs" / "cs_industry_snapshot.csv"
NEWS_PATH = CONTENT_ROOT / "data" / "raw" / "naver_news" / "industry_news_sources.csv"
TOPICS_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_candidates.csv"
SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_research_summary.md"
ENV_PATH = REPO_ROOT / ".env"

NAVER_NEWS_ENDPOINT = "https://openapi.naver.com/v1/search/news.json"

INDUSTRY_CATEGORIES = [
    "이커머스/쇼핑몰",
    "렌탈/구독/AS",
    "병원/헬스케어",
    "교육/학원",
    "물류/배송",
    "IT/SaaS/플랫폼",
    "금융/보험",
    "통신",
    "제조/유통",
    "외식/서비스",
    "BPO/콜센터 운영사",
    "기타/불명",
]

CS_RELEVANT_TERMS = [
    "고객센터",
    "고객상담",
    "고객지원",
    "상담원",
    "상담사",
    "인바운드",
    "아웃바운드",
    "콜센터",
    "컨택센터",
    "CS",
    "VOC",
    "클레임",
    "민원",
    "AS접수",
    "A/S접수",
    "문의응대",
    "고객응대",
    "고객서비스",
    "고객문의",
    "전화상담",
    "채팅상담",
    "해피콜",
]

STRONG_CS_TERMS = [
    "고객센터",
    "고객상담",
    "고객지원",
    "상담원",
    "상담사",
    "인바운드",
    "아웃바운드",
    "콜센터",
    "컨택센터",
    "VOC",
    "클레임",
    "민원",
    "AS접수",
    "A/S접수",
    "문의응대",
    "고객응대",
    "고객서비스",
    "전화상담",
    "채팅상담",
]

NOISE_ALLOWED_CS_CONTEXT_TERMS = [
    "고객센터",
    "고객상담",
    "상담원",
    "상담사",
    "콜센터",
    "컨택센터",
    "CS상담",
    "VOC",
    "클레임",
    "민원",
    "AS접수",
    "A/S접수",
    "문의응대",
    "고객응대",
    "전화상담",
    "채팅상담",
    "해피콜",
]

IRRELEVANT_JOB_TERMS = [
    "소믈리에",
    "조리",
    "조리사",
    "주방",
    "주방보조",
    "구내식당",
    "홀매니저",
    "홀서빙",
    "서빙",
    "바리스타",
    "셰프",
    "쉐프",
    "요리사",
    "영양사",
    "마케터",
    "디자이너",
    "개발자",
    "엔지니어",
    "네트워크",
]

INDUSTRY_RULES: dict[str, list[str]] = {
    "이커머스/쇼핑몰": [
        "쇼핑몰",
        "이커머스",
        "e커머스",
        "커머스",
        "온라인몰",
        "자사몰",
        "오픈마켓",
        "스마트스토어",
        "마켓플레이스",
        "교환",
        "반품",
        "주문취소",
        "상품문의",
    ],
    "렌탈/구독/AS": [
        "렌탈",
        "리스",
        "구독",
        "정기배송",
        "A/S",
        "AS",
        "AS접수",
        "서비스센터",
        "수리",
        "설치",
        "정수기",
        "가전",
        "케어",
        "다이슨",
        "아이폰",
    ],
    "병원/헬스케어": [
        "병원",
        "의원",
        "의료",
        "헬스케어",
        "클리닉",
        "피부과",
        "성형",
        "치과",
        "한의원",
        "검진",
        "예약상담",
    ],
    "교육/학원": [
        "교육",
        "학원",
        "수강",
        "강의",
        "입시",
        "어학",
        "유학",
        "에듀",
        "러닝",
        "교육상담",
    ],
    "물류/배송": [
        "물류",
        "배송",
        "택배",
        "풀필먼트",
        "운송",
        "출고",
        "입고",
        "배차",
        "화물",
        "배송대행",
    ],
    "IT/SaaS/플랫폼": [
        "IT",
        "SaaS",
        "saas",
        "플랫폼",
        "앱",
        "솔루션",
        "소프트웨어",
        "시스템",
        "클라우드",
        "ERP",
        "CRM",
        "데이터",
        "테크",
        "서비스운영",
    ],
    "금융/보험": [
        "금융",
        "보험",
        "카드",
        "은행",
        "증권",
        "대출",
        "캐피탈",
        "핀테크",
        "농협",
        "신한",
        "현대카드",
        "보장",
    ],
    "통신": [
        "통신",
        "인터넷",
        "브로드밴드",
        "SKB",
        "SK브로드밴드",
        "유플러스",
        "LG유플러스",
        "KT",
        "요금제",
        "해지",
        "유선",
        "무선",
    ],
    "제조/유통": [
        "제조",
        "유통",
        "제품",
        "상품",
        "품질",
        "전자",
        "리테일",
        "도매",
        "화장품",
        "식품",
        "부품",
        "장비",
        "가구",
    ],
    "외식/서비스": [
        "외식",
        "식당",
        "레스토랑",
        "카페",
        "프랜차이즈",
        "호텔",
        "숙박",
        "여행",
        "항공",
        "웨딩",
        "상조",
        "미용",
        "뷰티",
        "예약",
    ],
    "BPO/콜센터 운영사": [
        "BPO",
        "bpo",
        "아웃소싱",
        "파견",
        "도급",
        "컨택센터 운영",
        "콜센터 운영",
        "트랜스코스모스",
        "유베이스",
        "메타엠",
        "효성ITX",
        "KTCS",
        "KTIS",
        "서비스탑",
        "윌앤비전",
        "유니에스",
        "휴먼코아",
        "휴로넷",
        "맨파워",
        "잡앤피플",
        "에스엠서치플러스",
    ],
}

INDUSTRY_PRIORITY = [
    "금융/보험",
    "통신",
    "병원/헬스케어",
    "이커머스/쇼핑몰",
    "렌탈/구독/AS",
    "교육/학원",
    "물류/배송",
    "IT/SaaS/플랫폼",
    "외식/서비스",
    "제조/유통",
    "BPO/콜센터 운영사",
]

NEWS_QUERIES: dict[str, list[str]] = {
    "이커머스/쇼핑몰": [
        "쇼핑몰 고객 불만",
        "이커머스 고객센터",
        "온라인 쇼핑몰 환불",
        "쇼핑몰 교환 반품 민원",
        "쇼핑몰 문의 증가",
    ],
    "렌탈/구독/AS": [
        "렌탈 고객센터",
        "렌탈 AS",
        "구독 서비스 해지 문의",
        "정수기 AS 민원",
        "렌탈 고객 불만",
    ],
    "병원/헬스케어": [
        "병원 고객센터",
        "병원 예약 문의 증가",
        "병원 민원",
        "헬스케어 고객 불만",
        "피부과 상담 문의",
    ],
    "교육/학원": [
        "학원 상담 문의",
        "교육 서비스 환불",
        "학원 민원",
        "온라인 교육 고객센터",
        "수강 문의 증가",
    ],
    "물류/배송": [
        "배송 문의 증가",
        "물류 고객센터",
        "택배 민원",
        "배송 지연 고객 불만",
        "배송 환불",
    ],
    "IT/SaaS/플랫폼": [
        "플랫폼 고객센터",
        "SaaS 고객지원",
        "앱 문의 증가",
        "플랫폼 고객 불만",
        "서비스 장애 민원",
    ],
    "금융/보험": [
        "보험 고객센터",
        "금융 민원",
        "카드 고객센터 문의",
        "보험 해지 문의",
        "금융 고객 불만",
    ],
    "통신": [
        "통신 고객센터",
        "통신 요금 민원",
        "인터넷 장애 문의",
        "통신 해지 문의",
        "통신 고객 불만",
    ],
    "제조/유통": [
        "제품 AS 민원",
        "제조 고객센터",
        "유통 환불",
        "제품 문의 증가",
        "A/S 고객 불만",
    ],
    "외식/서비스": [
        "프랜차이즈 고객 불만",
        "호텔 고객센터",
        "예약 문의 증가",
        "서비스 민원",
        "외식 환불",
    ],
}

ISSUE_TERMS = [
    "고객센터",
    "고객 불만",
    "불만",
    "민원",
    "환불",
    "교환",
    "반품",
    "AS",
    "A/S",
    "문의",
    "상담",
    "해지",
    "요금",
    "장애",
    "배송",
    "예약",
    "품질",
    "보상",
    "피해",
]

TOPIC_TEMPLATES: dict[str, list[dict[str, str]]] = {
    "이커머스/쇼핑몰": [
        {
            "target_persona": "쇼핑몰 대표, 운영팀장, CS 매니저",
            "likely_search_question": "쇼핑몰 교환·반품 문의가 많을 때 CS 대행을 맡겨도 될까?",
            "main_keyword": "쇼핑몰 CS 대행",
            "longtail_keywords": "쇼핑몰 교환 반품 문의, 쇼핑몰 고객센터 운영, 환불 문의 대응",
            "content_topic": "교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점",
            "cs_sharing_connection": "고객센터 운영 대행, 반복 문의 응대, AI VOC",
        },
        {
            "target_persona": "이커머스 운영팀, 물류/CS 담당자",
            "likely_search_question": "배송조회·환불 문의 때문에 쇼핑몰 CS가 밀리면 어떻게 정리해야 할까?",
            "main_keyword": "쇼핑몰 고객센터 운영",
            "longtail_keywords": "배송조회 문의 대응, 주문취소 상담, 쇼핑몰 CS 자동화",
            "content_topic": "배송조회·환불 문의를 줄이는 쇼핑몰 고객센터 운영 체크리스트",
            "cs_sharing_connection": "반복 문의 분류, FAQ 개선, 상담 운영 대행",
        },
        {
            "target_persona": "브랜드몰 운영자, CX 담당자",
            "likely_search_question": "쇼핑몰 고객 불만을 VOC로 모으면 어떤 개선 포인트가 보일까?",
            "main_keyword": "쇼핑몰 VOC 분석",
            "longtail_keywords": "고객 불만 분석, 교환 반품 VOC, 고객 문의 데이터",
            "content_topic": "쇼핑몰 VOC를 콘텐츠와 운영 개선으로 연결하는 방법",
            "cs_sharing_connection": "AI VOC 분석, 문의 유형 리포트, 상담 품질 관리",
        },
    ],
    "렌탈/구독/AS": [
        {
            "target_persona": "렌탈/구독 서비스 운영팀장, AS 관리자",
            "likely_search_question": "렌탈 AS 접수와 해지 문의가 늘면 고객센터를 어떻게 운영해야 할까?",
            "main_keyword": "렌탈 고객센터",
            "longtail_keywords": "렌탈 AS 접수, 구독 해지 문의, 정수기 고객센터",
            "content_topic": "렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법",
            "cs_sharing_connection": "AS 접수 대행, 해지 문의 응대, 상담 이력 관리",
        },
        {
            "target_persona": "AS 운영 관리자, 고객지원팀",
            "likely_search_question": "설치·수리 문의를 놓치지 않으려면 상담 프로세스가 어떻게 필요할까?",
            "main_keyword": "AS 상담 운영",
            "longtail_keywords": "AS 문의 대응, 설치 일정 상담, 수리 접수 고객센터",
            "content_topic": "설치·수리 문의를 놓치지 않는 AS 상담 운영 기준",
            "cs_sharing_connection": "접수 분류, 상담 품질 모니터링, 운영 대행",
        },
        {
            "target_persona": "구독 서비스 CX 담당자, 리텐션 매니저",
            "likely_search_question": "구독 해지 문의를 VOC로 분석하면 이탈을 줄일 수 있을까?",
            "main_keyword": "구독 서비스 VOC",
            "longtail_keywords": "구독 해지 상담, 고객 불만 분석, 렌탈 해지 방어",
            "content_topic": "구독 해지 문의를 VOC로 분석해 이탈을 줄이는 방법",
            "cs_sharing_connection": "AI VOC, 해지 사유 분석, 상담 스크립트 개선",
        },
    ],
    "병원/헬스케어": [
        {
            "target_persona": "병원 원장, 실장, 상담팀장",
            "likely_search_question": "예약·시술 문의가 몰릴 때 병원 고객센터를 외주화해도 될까?",
            "main_keyword": "병원 고객센터",
            "longtail_keywords": "병원 예약 상담, 피부과 상담 문의, 병원 CS 대행",
            "content_topic": "예약·시술 문의가 몰리는 병원 CS센터 운영법",
            "cs_sharing_connection": "예약 문의 응대, 상담 품질 관리, 고객센터 운영 대행",
        },
        {
            "target_persona": "병원 CS 관리자, 원무/상담 실장",
            "likely_search_question": "병원 민원 응대 품질을 유지하려면 어떤 기준이 필요할까?",
            "main_keyword": "병원 민원 응대",
            "longtail_keywords": "병원 고객 불만, 병원 CS 교육, 의료 상담 품질",
            "content_topic": "병원 민원 응대에서 상담 품질을 유지하는 기준",
            "cs_sharing_connection": "상담 매뉴얼, 품질 모니터링, VOC 리포트",
        },
        {
            "target_persona": "검진센터/클리닉 운영 담당자",
            "likely_search_question": "전화 문의가 많은 병원은 FAQ와 상담 분류를 어떻게 만들까?",
            "main_keyword": "병원 전화 문의",
            "longtail_keywords": "검진 예약 문의, 클리닉 고객센터, 병원 상담 자동화",
            "content_topic": "피부과·검진센터 전화 문의를 줄이는 FAQ·상담 프로세스",
            "cs_sharing_connection": "FAQ 구축, 반복 문의 응대, AI 상담 도입",
        },
    ],
    "교육/학원": [
        {
            "target_persona": "학원 원장, 교육 서비스 운영팀",
            "likely_search_question": "수강 문의와 환불 상담이 늘어난 학원도 CS 대행을 써도 될까?",
            "main_keyword": "학원 상담 대행",
            "longtail_keywords": "수강 문의 대응, 학원 환불 상담, 교육 고객센터",
            "content_topic": "수강 문의와 환불 상담이 늘어난 학원이 CS 대행을 검토하는 기준",
            "cs_sharing_connection": "인바운드 상담 대행, 환불 문의 응대, 문의 유형 분석",
        },
        {
            "target_persona": "교육 상담팀장, 입학 상담 담당자",
            "likely_search_question": "교육 상담 전환율을 떨어뜨리지 않는 인바운드 운영법은 뭘까?",
            "main_keyword": "교육 상담 인바운드",
            "longtail_keywords": "입학 상담, 유학 상담, 수강 상담 전환율",
            "content_topic": "교육 상담 전환율을 떨어뜨리지 않는 인바운드 운영법",
            "cs_sharing_connection": "상담 스크립트, SLA 관리, 상담 품질 관리",
        },
        {
            "target_persona": "교육 콘텐츠/마케팅 담당자",
            "likely_search_question": "학원 민원과 환불 문의를 콘텐츠 소재로 바꿀 수 있을까?",
            "main_keyword": "학원 VOC",
            "longtail_keywords": "학원 민원 대응, 수강생 불만, 교육 서비스 VOC",
            "content_topic": "학원 민원·환불 VOC를 콘텐츠 소재로 바꾸는 방법",
            "cs_sharing_connection": "AI VOC 분석, 고객 불만 리포트, 콘텐츠 인사이트",
        },
    ],
    "물류/배송": [
        {
            "target_persona": "물류/배송 운영팀장, CS 관리자",
            "likely_search_question": "배송 지연 문의가 늘면 고객센터를 먼저 정비해야 할까?",
            "main_keyword": "배송 문의 고객센터",
            "longtail_keywords": "배송 지연 문의, 택배 민원, 물류 고객센터",
            "content_topic": "배송 지연 문의가 늘 때 고객센터를 먼저 정비해야 하는 이유",
            "cs_sharing_connection": "배송 문의 분류, 인바운드 응대, VOC 리포트",
        },
        {
            "target_persona": "물류센터 운영자, 쇼핑몰 배송 담당자",
            "likely_search_question": "물류 고객 문의를 유형별로 나누면 반복 상담을 줄일 수 있을까?",
            "main_keyword": "물류 CS 운영",
            "longtail_keywords": "배송조회 상담, 출고 문의, 반품 물류 문의",
            "content_topic": "물류센터 고객 문의를 분류해 반복 상담을 줄이는 방법",
            "cs_sharing_connection": "문의 유형 태깅, 상담 자동화, 운영 대행",
        },
        {
            "target_persona": "배송 서비스 CX 담당자",
            "likely_search_question": "택배·배송 VOC를 빠르게 모으고 대응하려면 무엇부터 봐야 할까?",
            "main_keyword": "배송 VOC",
            "longtail_keywords": "택배 고객 불만, 배송 민원 분석, 배송 고객센터",
            "content_topic": "택배·배송 VOC를 빠르게 모으고 대응하는 운영 체크리스트",
            "cs_sharing_connection": "AI VOC, 민원 대응 프로세스, 품질 개선 리포트",
        },
    ],
    "IT/SaaS/플랫폼": [
        {
            "target_persona": "SaaS 운영팀, CX 리드, 프로덕트 매니저",
            "likely_search_question": "SaaS 고객지원 티켓이 쌓이면 CS 대행을 검토해도 될까?",
            "main_keyword": "SaaS 고객지원",
            "longtail_keywords": "플랫폼 고객센터, 앱 문의 증가, 고객지원 티켓",
            "content_topic": "SaaS 고객지원이 티켓 적체로 무너지는 순간과 운영 대안",
            "cs_sharing_connection": "티켓 분류, 반복 문의 응대, AI 상담",
        },
        {
            "target_persona": "앱/플랫폼 운영 담당자",
            "likely_search_question": "앱 고객센터를 외주화할 때 품질을 어떻게 지킬까?",
            "main_keyword": "플랫폼 고객센터 외주",
            "longtail_keywords": "앱 고객센터, 플랫폼 문의 대응, 고객지원 외주",
            "content_topic": "앱·플랫폼 고객센터를 외주화할 때 품질을 지키는 기준",
            "cs_sharing_connection": "상담 매뉴얼, SLA, 상담 품질 모니터링",
        },
        {
            "target_persona": "CS 툴 도입을 검토하는 스타트업 운영자",
            "likely_search_question": "CS 툴만 도입하면 고객 문의 운영이 해결될까?",
            "main_keyword": "CS 툴 운영 한계",
            "longtail_keywords": "고객 상담 플랫폼, 채팅 상담 운영, CS 자동화 한계",
            "content_topic": "CS 툴만으로 해결 안 되는 고객 문의 운영의 빈틈",
            "cs_sharing_connection": "상담 운영 대행, AI VOC, 프로세스 설계",
        },
    ],
    "금융/보험": [
        {
            "target_persona": "보험/금융 영업지원팀, 고객센터 관리자",
            "likely_search_question": "보험 인바운드 상담에서 민원 리스크를 어떻게 줄일까?",
            "main_keyword": "보험 고객센터",
            "longtail_keywords": "보험 인바운드 상담, 금융 민원 대응, 보험 해지 문의",
            "content_topic": "보험·금융 인바운드 상담에서 민원 리스크를 줄이는 운영법",
            "cs_sharing_connection": "상담 품질 관리, 민원 VOC 분석, 운영 대행",
        },
        {
            "target_persona": "카드/보험 고객지원팀장",
            "likely_search_question": "카드·보험 고객센터 문의를 품질관리 관점에서 어떻게 봐야 할까?",
            "main_keyword": "금융 CS 품질관리",
            "longtail_keywords": "카드 고객센터 문의, 보험 고객 불만, 상담 품질 모니터링",
            "content_topic": "카드·보험 고객센터 문의를 품질관리 관점에서 보는 법",
            "cs_sharing_connection": "상담 모니터링, VOC 분류, QA 리포트",
        },
        {
            "target_persona": "금융 서비스 운영/준법 담당자",
            "likely_search_question": "금융 CS 외주화 전에 보안과 품질 기준은 무엇을 확인해야 할까?",
            "main_keyword": "금융 CS 외주",
            "longtail_keywords": "금융 고객센터 외주, 민원 응대 대행, 상담 보안",
            "content_topic": "금융 CS 외주화 전 확인해야 할 보안·품질 체크리스트",
            "cs_sharing_connection": "운영 프로세스, 상담 품질 기준, 민원 대응 체계",
        },
    ],
    "통신": [
        {
            "target_persona": "통신 대리점/서비스 운영팀, 고객센터 관리자",
            "likely_search_question": "요금·해지 문의가 많은 통신 고객센터를 어떻게 개선할까?",
            "main_keyword": "통신 고객센터",
            "longtail_keywords": "통신 해지 문의, 요금 민원, 인터넷 장애 문의",
            "content_topic": "통신 해지·요금 문의가 많은 고객센터의 운영 개선법",
            "cs_sharing_connection": "인바운드 상담 대행, 상담 스크립트, VOC 분석",
        },
        {
            "target_persona": "인터넷/통신 설치 운영 담당자",
            "likely_search_question": "설치·장애 문의를 줄이려면 상담 분류를 어떻게 해야 할까?",
            "main_keyword": "인터넷 장애 문의",
            "longtail_keywords": "통신 설치 문의, 장애 상담, 고객센터 민원",
            "content_topic": "설치·장애 문의를 줄이는 상담 분류와 VOC 관리",
            "cs_sharing_connection": "문의 유형 분류, 장애 VOC 리포트, 상담 운영",
        },
        {
            "target_persona": "통신 상담센터 QA 담당자",
            "likely_search_question": "통신 고객센터 상담 품질을 유지하려면 교육과 모니터링을 어떻게 해야 할까?",
            "main_keyword": "통신 상담 품질",
            "longtail_keywords": "통신 CS 교육, 고객센터 QA, 요금제 상담 품질",
            "content_topic": "통신 고객센터 상담 품질을 유지하는 교육·모니터링 기준",
            "cs_sharing_connection": "상담 QA, 교육 운영, 품질 리포트",
        },
    ],
    "제조/유통": [
        {
            "target_persona": "제조사 고객지원팀, 유통사 운영팀",
            "likely_search_question": "제품 문의와 AS 상담이 늘면 고객센터를 어떻게 정비해야 할까?",
            "main_keyword": "제품 AS 고객센터",
            "longtail_keywords": "제조 고객센터, 제품 문의 증가, A/S 민원",
            "content_topic": "제품 문의와 AS 상담이 늘어난 제조사가 고객센터를 정비하는 기준",
            "cs_sharing_connection": "AS 접수, 제품 문의 응대, VOC 분석",
        },
        {
            "target_persona": "유통사 CS 매니저, 브랜드 운영자",
            "likely_search_question": "유통사 고객 문의를 반복 유형별로 줄일 수 있을까?",
            "main_keyword": "유통 고객센터",
            "longtail_keywords": "유통 환불 문의, 제품 문의 대응, 고객센터 운영",
            "content_topic": "유통사 고객 문의를 반복 유형별로 줄이는 방법",
            "cs_sharing_connection": "반복 문의 분류, 상담 운영 대행, FAQ 개선",
        },
        {
            "target_persona": "품질관리팀, CX 담당자",
            "likely_search_question": "제품 품질 이슈 VOC를 제품 개선과 콘텐츠로 연결할 수 있을까?",
            "main_keyword": "제품 VOC 분석",
            "longtail_keywords": "품질 이슈 고객 불만, 제품 문의 데이터, AS VOC",
            "content_topic": "품질 이슈 VOC를 제품 개선과 콘텐츠로 연결하는 법",
            "cs_sharing_connection": "AI VOC, 품질 이슈 분류, 리포트 자동화",
        },
    ],
    "외식/서비스": [
        {
            "target_persona": "프랜차이즈 본사, 서비스 운영팀",
            "likely_search_question": "프랜차이즈 고객 불만이 늘면 본사 CS를 어떻게 운영해야 할까?",
            "main_keyword": "프랜차이즈 고객센터",
            "longtail_keywords": "서비스 민원 대응, 매장 고객 불만, 예약 문의",
            "content_topic": "프랜차이즈 고객 불만이 늘 때 본사 고객센터가 해야 할 일",
            "cs_sharing_connection": "민원 응대 대행, VOC 분석, 매장별 이슈 리포트",
        },
        {
            "target_persona": "호텔/예약 서비스 운영 담당자",
            "likely_search_question": "예약 변경·취소 문의가 몰릴 때 고객센터를 어떻게 분리해야 할까?",
            "main_keyword": "예약 문의 고객센터",
            "longtail_keywords": "호텔 고객센터, 예약 취소 문의, 서비스 환불",
            "content_topic": "예약 변경·취소 문의가 몰리는 서비스업 CS 운영법",
            "cs_sharing_connection": "인바운드 응대, 상담 분류, FAQ 개선",
        },
        {
            "target_persona": "서비스 브랜드 CX 담당자",
            "likely_search_question": "서비스 민원을 콘텐츠와 운영 개선에 같이 활용할 수 있을까?",
            "main_keyword": "서비스 VOC",
            "longtail_keywords": "고객 불만 분석, 서비스 민원, 고객 경험 개선",
            "content_topic": "서비스 민원을 VOC로 분석해 재방문 경험을 개선하는 방법",
            "cs_sharing_connection": "AI VOC, 민원 유형 분석, 상담 품질 개선",
        },
    ],
}

SNAPSHOT_FIELDS = [
    "dedupe_key",
    "source",
    "search_keyword",
    "posting_company_name",
    "title_bracket_text",
    "preferred_company_name",
    "job_title",
    "job_url",
    "location",
    "experience",
    "education",
    "employment_type",
    "deadline",
    "job_sector_text",
    "metadata_text",
    "industry_signals",
    "cs_terms",
    "is_cs_relevant",
    "cs_match_terms",
    "excluded_noise_terms",
    "inferred_industry",
    "industry_reason",
]

NEWS_FIELDS = ["industry", "query", "title", "description", "pubDate", "originallink", "link"]

TOPIC_FIELDS = [
    "target_industry",
    "job_demand_signal",
    "news_issue_summary",
    "target_persona",
    "likely_search_question",
    "main_keyword",
    "longtail_keywords",
    "content_topic",
    "cs_sharing_connection",
    "source_basis",
]


def clean_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def contains_term(text: str, term: str) -> bool:
    if not text:
        return False
    if re.fullmatch(r"[A-Za-z0-9/+.-]{1,5}", term):
        return bool(re.search(rf"(?<![A-Za-z0-9]){re.escape(term)}(?![A-Za-z0-9])", text, re.I))
    return term.lower() in text.lower()


def matched_terms(text: str, terms: Iterable[str]) -> list[str]:
    matches = []
    for term in terms:
        if contains_term(text, term) and term not in matches:
            matches.append(term)
    return matches


def row_text(row: dict[str, str], fields: Iterable[str]) -> str:
    return " ".join(clean_text(row.get(field, "")) for field in fields)


def parse_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def is_cs_relevant(row: dict[str, str]) -> tuple[bool, list[str], list[str]]:
    primary_text = row_text(row, ["job_title", "job_sector_text", "metadata_text", "cs_terms"])
    fallback_text = row_text(row, ["raw_card_text"])
    title_text = clean_text(row.get("job_title", ""))
    matches = matched_terms(primary_text, CS_RELEVANT_TERMS)
    if not matches:
        raw_matches = matched_terms(fallback_text, CS_RELEVANT_TERMS)
        if len(raw_matches) >= 2:
            matches = raw_matches

    noise_hits = matched_terms(title_text, IRRELEVANT_JOB_TERMS)
    allowed_noise_context = matched_terms(title_text, NOISE_ALLOWED_CS_CONTEXT_TERMS)
    strong_hits = matched_terms(primary_text, STRONG_CS_TERMS)
    if noise_hits and not strong_hits:
        return False, matches, noise_hits
    if noise_hits and not allowed_noise_context:
        return False, matches, noise_hits
    return bool(matches), matches, noise_hits


def classify_industry(row: dict[str, str]) -> tuple[str, str]:
    text = row_text(
        row,
        [
            "job_title",
            "job_sector_text",
            "metadata_text",
            "industry_signals",
            "raw_card_text",
            "posting_company_name",
            "title_bracket_text",
        ],
    )

    matched_by_industry: dict[str, list[str]] = {}
    for industry, terms in INDUSTRY_RULES.items():
        hits = matched_terms(text, terms)
        if hits:
            matched_by_industry[industry] = hits

    if not matched_by_industry:
        return "기타/불명", "명확한 산업 키워드 없음"

    for industry in INDUSTRY_PRIORITY:
        if industry in matched_by_industry:
            hits = ", ".join(matched_by_industry[industry][:5])
            return industry, f"matched: {hits}"
    return "기타/불명", "명확한 산업 키워드 없음"


def load_job_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def build_processed_snapshot(raw_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    processed = []
    seen_keys = set()
    for row in raw_rows:
        if parse_bool(row.get("is_duplicate_within_run", "")):
            continue
        key = row.get("dedupe_key") or row.get("job_url") or f"{row.get('source')}|{row.get('job_title')}"
        if key in seen_keys:
            continue
        seen_keys.add(key)

        relevant, cs_hits, noise_hits = is_cs_relevant(row)
        industry, reason = classify_industry(row)
        output = {field: row.get(field, "") for field in SNAPSHOT_FIELDS}
        output.update(
            {
                "dedupe_key": key,
                "is_cs_relevant": "true" if relevant else "false",
                "cs_match_terms": ";".join(cs_hits),
                "excluded_noise_terms": ";".join(noise_hits),
                "inferred_industry": industry,
                "industry_reason": reason,
            }
        )
        processed.append(output)
    return processed


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def load_env_values(path: Path) -> tuple[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        raise FileNotFoundError(f"Missing .env at {path}")
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            value = value.strip().strip('"').strip("'")
            values[key.strip()] = value
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


def naver_news_search(
    query: str,
    *,
    client_id: str,
    client_secret: str,
    display: int,
    timeout: int,
) -> list[dict[str, str]]:
    params = urlencode({"query": query, "display": display, "start": 1, "sort": "date"})
    request = Request(
        f"{NAVER_NEWS_ENDPOINT}?{params}",
        headers={
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
            "User-Agent": "cssharing-content-research/0.1",
        },
    )
    with urlopen(request, timeout=timeout, context=ssl_context()) as response:
        payload = json.loads(response.read().decode("utf-8"))
    rows = []
    for item in payload.get("items", []):
        rows.append(
            {
                "title": clean_text(item.get("title", "")),
                "description": clean_text(item.get("description", "")),
                "pubDate": clean_text(item.get("pubDate", "")),
                "originallink": clean_text(item.get("originallink", "")),
                "link": clean_text(item.get("link", "")),
            }
        )
    return rows


def collect_news(
    industries: list[str],
    *,
    client_id: str,
    client_secret: str,
    display: int,
    delay_seconds: float,
    timeout: int,
) -> list[dict[str, str]]:
    news_rows = []
    seen_links = set()
    total_queries = sum(len(NEWS_QUERIES.get(industry, [])[:5]) for industry in industries)
    query_idx = 0

    for industry in industries:
        for query in NEWS_QUERIES.get(industry, [])[:5]:
            query_idx += 1
            print(f"[news {query_idx}/{total_queries}] {industry} query={query!r}", flush=True)
            try:
                items = naver_news_search(
                    query,
                    client_id=client_id,
                    client_secret=client_secret,
                    display=display,
                    timeout=timeout,
                )
            except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
                print(f"  skipped query: {type(exc).__name__}", flush=True)
                items = []

            added = 0
            for item in items:
                link_key = item.get("originallink") or item.get("link") or f"{query}|{item.get('title')}"
                if link_key in seen_links:
                    continue
                seen_links.add(link_key)
                news_rows.append({"industry": industry, "query": query, **item})
                added += 1
            print(f"  collected news rows: {added}", flush=True)
            time.sleep(delay_seconds)
    return news_rows


def industry_counts(processed_rows: list[dict[str, str]]) -> Counter:
    counts = Counter()
    for row in processed_rows:
        if row.get("is_cs_relevant") == "true":
            counts[row.get("inferred_industry", "기타/불명")] += 1
    return counts


def pick_top_target_industries(counts: Counter, limit: int = 7) -> list[str]:
    excluded = {"BPO/콜센터 운영사", "기타/불명"}
    return [industry for industry, _ in counts.most_common() if industry not in excluded][:limit]


def top_values(rows: list[dict[str, str]], field: str, limit: int = 5) -> list[str]:
    counter = Counter(clean_text(row.get(field, "")) for row in rows if clean_text(row.get(field, "")))
    return [value for value, _ in counter.most_common(limit)]


def summarize_job_signal(industry: str, rows: list[dict[str, str]], total_relevant: int) -> str:
    count = len(rows)
    ratio = (count / total_relevant * 100) if total_relevant else 0
    terms = Counter()
    for row in rows:
        for term in row.get("cs_match_terms", "").split(";"):
            if term:
                terms[term] += 1
    top_terms = ", ".join(term for term, _ in terms.most_common(5)) or "CS 관련 키워드"
    sample_titles = "; ".join(top_values(rows, "job_title", 2))
    return (
        f"채용공고 snapshot 내 CS 관련 deduped 공고 {count}건({ratio:.1f}%). "
        f"반복 신호: {top_terms}. 대표 공고 예시: {sample_titles}"
    )


def summarize_news(industry: str, news_rows: list[dict[str, str]]) -> str:
    if not news_rows:
        return "네이버 뉴스 API에서 관련 결과가 제한적으로 수집됨."
    text = " ".join(f"{row.get('title', '')} {row.get('description', '')}" for row in news_rows)
    issues = Counter()
    lowered = text.lower()
    for term in ISSUE_TERMS:
        if re.fullmatch(r"[A-Za-z0-9/+.-]{1,5}", term):
            count = len(re.findall(rf"(?<![A-Za-z0-9]){re.escape(term)}(?![A-Za-z0-9])", text, re.I))
        else:
            count = lowered.count(term.lower())
        if count:
            issues[term] = count
    top_issues = ", ".join(term for term, _ in issues.most_common(5))
    query_counts = Counter(row.get("query", "") for row in news_rows)
    top_queries = ", ".join(query for query, _ in query_counts.most_common(2))
    if top_issues:
        return f"뉴스 {len(news_rows)}건에서 {top_issues} 관련 표현이 반복됨. 반응이 있던 검색축: {top_queries}"
    return f"뉴스 {len(news_rows)}건 수집. 고객 불만/문의 키워드가 직접 반복되지는 않아 이슈 해석은 보수적으로 봐야 함."


def build_topic_candidates(
    top_industries: list[str],
    processed_rows: list[dict[str, str]],
    news_rows: list[dict[str, str]],
) -> list[dict[str, str]]:
    relevant_rows = [row for row in processed_rows if row.get("is_cs_relevant") == "true"]
    total_relevant = len(relevant_rows)
    rows_by_industry = defaultdict(list)
    news_by_industry = defaultdict(list)
    for row in relevant_rows:
        rows_by_industry[row.get("inferred_industry", "기타/불명")].append(row)
    for row in news_rows:
        news_by_industry[row.get("industry", "")].append(row)

    candidates = []
    for industry in top_industries:
        job_signal = summarize_job_signal(industry, rows_by_industry[industry], total_relevant)
        news_summary = summarize_news(industry, news_by_industry[industry])
        source_basis = (
            f"채용공고 snapshot: {len(rows_by_industry[industry])}건; "
            f"네이버 뉴스 API: {len(news_by_industry[industry])}건; "
            f"queries: {', '.join(NEWS_QUERIES.get(industry, [])[:5])}"
        )
        for template in TOPIC_TEMPLATES.get(industry, []):
            candidates.append(
                {
                    "target_industry": industry,
                    "job_demand_signal": job_signal,
                    "news_issue_summary": news_summary,
                    "source_basis": source_basis,
                    **template,
                }
            )
    return candidates


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        escaped = [str(cell).replace("|", "/") for cell in row]
        lines.append("| " + " | ".join(escaped) + " |")
    return "\n".join(lines)


def write_summary(
    path: Path,
    *,
    processed_rows: list[dict[str, str]],
    news_rows: list[dict[str, str]],
    topic_candidates: list[dict[str, str]],
    top_industries: list[str],
    run_date: str,
) -> None:
    relevant_rows = [row for row in processed_rows if row.get("is_cs_relevant") == "true"]
    counts = industry_counts(processed_rows)
    bpo_count = counts.get("BPO/콜센터 운영사", 0)
    total_relevant = len(relevant_rows)
    news_by_industry = defaultdict(list)
    for row in news_rows:
        news_by_industry[row.get("industry", "")].append(row)

    top_rows = []
    for idx, industry in enumerate(top_industries, start=1):
        count = counts.get(industry, 0)
        ratio = (count / total_relevant * 100) if total_relevant else 0
        top_rows.append([idx, industry, count, f"{ratio:.1f}%"])

    issue_rows = []
    for industry in top_industries:
        issue_rows.append(
            [
                industry,
                len(news_by_industry[industry]),
                summarize_news(industry, news_by_industry[industry]),
            ]
        )

    candidate_by_industry = defaultdict(list)
    for candidate in topic_candidates:
        candidate_by_industry[candidate["target_industry"]].append(candidate)

    lines = [
        "# CS Industry Topic Research Summary",
        "",
        f"작성일: {run_date}",
        "",
        "## 조사 목적",
        "",
        (
            "CS쉐어링 콘텐츠 주제 선정을 위해 사람인/잡코리아 채용공고 snapshot에서 "
            "CS 수요 신호가 보이는 산업 후보를 찾고, 네이버 뉴스 API로 각 산업의 최근 이슈/콘텐츠 소재를 빠르게 확인했다."
        ),
        "",
        "## 사용 데이터",
        "",
        f"- 사람인/잡코리아 채용공고 snapshot: 원본 {RAW_JOBS_PATH.name}, 중복 제외 후 {len(processed_rows)}건",
        f"- CS 관련 공고로 판단된 deduped row: {total_relevant}건",
        f"- 네이버 뉴스 API: Top 7 산업 대상 {len(news_rows)}건 수집",
        "",
        "## 주요 한계",
        "",
        "- 이 결과는 전체 시장 통계가 아니라 채용공고 snapshot 기반 CS 수요 신호다.",
        "- 채용공고 검색 결과에는 중복/노이즈가 있을 수 있고, 검색어에 따라 노출 편향이 있다.",
        "- 산업 분류는 rule-based 추정이며, 확신이 낮은 공고는 기타/불명으로 두었다.",
        "- BPO/콜센터 운영사는 수요의 대리 신호로 참고하되, CS쉐어링의 타겟 산업 Top 7 선정에서는 제외했다.",
        "",
        "## CS 수요 신호가 보인 산업 Top 7",
        "",
        markdown_table(["순위", "산업", "CS 관련 공고 수", "비중"], top_rows),
        "",
        f"참고: BPO/콜센터 운영사로 분류된 CS 관련 공고는 {bpo_count}건이다.",
        "",
        "## 산업별 최근 이슈 요약",
        "",
        markdown_table(["산업", "뉴스 수", "이슈 요약"], issue_rows),
        "",
        "## 산업별 콘텐츠 주제 후보",
        "",
    ]

    for industry in top_industries:
        lines.extend([f"### {industry}", ""])
        for candidate in candidate_by_industry[industry]:
            lines.append(f"- {candidate['content_topic']}")
            lines.append(f"  - 검색 질문: {candidate['likely_search_question']}")
            lines.append(f"  - 연결: {candidate['cs_sharing_connection']}")
        lines.append("")

    lines.extend(["## 최종 추천 주제 Top 20", ""])
    for idx, candidate in enumerate(topic_candidates[:20], start=1):
        lines.append(f"{idx}. **{candidate['content_topic']}**")
        lines.append(f"   - 산업: {candidate['target_industry']}")
        lines.append(f"   - 검색 질문: {candidate['likely_search_question']}")
        lines.append(f"   - 메인 키워드: {candidate['main_keyword']}")
        lines.append(f"   - CS쉐어링 연결: {candidate['cs_sharing_connection']}")
    lines.append("")
    lines.append("## 산출 파일")
    lines.append("")
    lines.append(f"- processed job snapshot: `{PROCESSED_JOBS_PATH.relative_to(CONTENT_ROOT)}`")
    lines.append(f"- raw Naver news sources: `{NEWS_PATH.relative_to(CONTENT_ROOT)}`")
    lines.append(f"- topic candidates: `{TOPICS_PATH.relative_to(CONTENT_ROOT)}`")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Make quick CS industry topic research report.")
    parser.add_argument("--jobs", type=Path, default=RAW_JOBS_PATH)
    parser.add_argument("--news-display", type=int, default=10)
    parser.add_argument("--news-delay", type=float, default=0.35)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--skip-news", action="store_true")
    parser.add_argument("--reuse-news", action="store_true", help="Reuse existing Naver news CSV without API calls.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    run_date = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    raw_rows = load_job_rows(args.jobs)
    processed_rows = build_processed_snapshot(raw_rows)
    write_csv(PROCESSED_JOBS_PATH, SNAPSHOT_FIELDS, processed_rows)

    counts = industry_counts(processed_rows)
    top_industries = pick_top_target_industries(counts)
    if not top_industries:
        raise RuntimeError("No target industries found after CS relevance filtering.")

    if args.skip_news:
        news_rows: list[dict[str, str]] = []
    elif args.reuse_news and NEWS_PATH.exists():
        with NEWS_PATH.open(encoding="utf-8-sig", newline="") as handle:
            news_rows = list(csv.DictReader(handle))
    else:
        client_id, client_secret = load_env_values(ENV_PATH)
        news_rows = collect_news(
            top_industries,
            client_id=client_id,
            client_secret=client_secret,
            display=args.news_display,
            delay_seconds=args.news_delay,
            timeout=args.timeout,
        )
    write_csv(NEWS_PATH, NEWS_FIELDS, news_rows)

    topic_candidates = build_topic_candidates(top_industries, processed_rows, news_rows)
    write_csv(TOPICS_PATH, TOPIC_FIELDS, topic_candidates)

    write_summary(
        SUMMARY_PATH,
        processed_rows=processed_rows,
        news_rows=news_rows,
        topic_candidates=topic_candidates,
        top_industries=top_industries,
        run_date=run_date,
    )

    relevant_count = sum(1 for row in processed_rows if row.get("is_cs_relevant") == "true")
    print(f"Processed deduped job rows: {len(processed_rows)}", flush=True)
    print(f"CS relevant rows: {relevant_count}", flush=True)
    print(f"Top target industries: {', '.join(top_industries)}", flush=True)
    print(f"Naver news rows: {len(news_rows)}", flush=True)
    print(f"Wrote {PROCESSED_JOBS_PATH}", flush=True)
    print(f"Wrote {NEWS_PATH}", flush=True)
    print(f"Wrote {TOPICS_PATH}", flush=True)
    print(f"Wrote {SUMMARY_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
