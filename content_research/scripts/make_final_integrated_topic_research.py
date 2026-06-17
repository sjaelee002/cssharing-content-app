#!/usr/bin/env python3
"""Build the final integrated CS Sharing topic research report.

The script reads existing local research artifacts only. It does not call any
external API and does not expose company-provided raw platform data.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


CONTENT_ROOT = Path(__file__).resolve().parents[1]
README_PATH = CONTENT_ROOT / "README.md"
JOB_SNAPSHOT_PATH = CONTENT_ROOT / "data" / "processed" / "jobs" / "cs_industry_snapshot.csv"
RAW_JOBS_PATH = CONTENT_ROOT / "data" / "raw" / "jobs" / "job_posts_raw.csv"
NEWS_PATH = CONTENT_ROOT / "data" / "raw" / "naver_news" / "industry_news_sources.csv"
BASE_SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_research_summary.md"
DATALAB_RAW_PATH = CONTENT_ROOT / "data" / "raw" / "naver_datalab" / "topic_keyword_trends_raw.json"
DATALAB_SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "naver_datalab_trend_summary.csv"
TOPICS_WITH_TRENDS_PATH = (
    CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_candidates_with_trends.csv"
)

FINAL_REPORT_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "final_integrated_topic_research.md"
FINAL_TABLE_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "final_topic_priority_table.csv"

FINAL_TOPIC_FIELDS = [
    "final_rank",
    "priority_score",
    "target_industry",
    "content_topic",
    "likely_search_question",
    "main_keyword",
    "supporting_evidence",
    "cs_sharing_connection",
    "recommended_channel",
    "priority_reason",
    "confidence_level",
]

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

WEIGHTS = {
    "CS 수요 산업 신호": 25,
    "검색 의도/키워드 신호": 20,
    "자사 채널 반응 신호": 15,
    "산업별 최근 이슈성": 15,
    "CS쉐어링 서비스 연결성": 15,
    "콘텐츠화 용이성": 5,
    "중소기업 타겟 적합성": 5,
}

INTERNAL_PLATFORM_SUMMARY = {
    "네이버블로그": [
        "AX, AX 적용, AICC, AI 상담, AI 고객상담, AI CX, AI챗봇에서 반응 신호",
        "CS 품질, CS아웃소싱 비용, CS 아웃소싱 관련 키워드에서 반응 신호",
        "AX 계열은 넓은 인지도형 키워드, CS아웃소싱 비용은 전환 의도가 강한 키워드로 분리 해석",
    ],
    "인스타": [
        "CS운영, 중소기업CS, 고객응대, CS환경, AICS, BPO, 고객경험, CS대행, CS아웃소싱, 고객센터운영, 콜센터운영 해시태그 묶음에서 반응 신호",
        "조직문화, 명예의전당, 직원성장, 고객만족 게시물은 브랜드 신뢰 형성용으로 해석",
    ],
    "페이스북": [
        "전반적 도달 규모가 작아 핵심 근거가 아니라 보조 신호",
        "AICS, AI에이전트, 운영효율화, 고객경험, BPO, CS대행 메시지 테스트 흔적은 참고",
    ],
}

INDUSTRY_MANUAL_COMPONENTS = {
    "이커머스/쇼핑몰": {
        "search": 19,
        "owned": 10,
        "service": 15,
        "ease": 5,
        "sme": 5,
        "rationale": "Google Trends에서 쇼핑몰 CS, 교환/반품, 환불, 배송조회 신호가 강하고 뉴스에서도 환불/반품/배송 이슈가 반복됨.",
    },
    "렌탈/구독/AS": {
        "search": 13,
        "owned": 10,
        "service": 15,
        "ease": 4.5,
        "sme": 4,
        "rationale": "AS 접수, 해지 문의, 설치/수리 상담이 CS쉐어링 운영 대행과 직접 연결됨.",
    },
    "병원/헬스케어": {
        "search": 18,
        "owned": 9,
        "service": 14,
        "ease": 4.5,
        "sme": 5,
        "rationale": "네이버 데이터랩 상대 트렌드에서 병원 예약 상담이 강하고, 뉴스에서도 상담/예약/민원 표현이 반복됨.",
    },
    "금융/보험": {
        "search": 9,
        "owned": 5,
        "service": 8,
        "ease": 3.5,
        "sme": 2.5,
        "rationale": "채용공고 snapshot 기반 수요 신호는 가장 강하지만 규제/보안 장벽과 중소기업 타겟 적합성 리스크가 큼.",
    },
    "제조/유통": {
        "search": 8,
        "owned": 7,
        "service": 13,
        "ease": 4,
        "sme": 4,
        "rationale": "제품 문의, AS, 품질 이슈가 뉴스에서 반복되며 VOC/상담 분류 콘텐츠화가 쉬움.",
    },
    "통신": {
        "search": 7,
        "owned": 8,
        "service": 10,
        "ease": 3.5,
        "sme": 2.5,
        "rationale": "요금/해지/장애 문의 이슈는 분명하나 대기업/BPO 성격이 강해 직접 타겟성은 낮음.",
    },
    "IT/SaaS/플랫폼": {
        "search": 20,
        "owned": 15,
        "service": 13,
        "ease": 5,
        "sme": 4,
        "rationale": "자사 채널에서 AX/AICC/AI 상담/AI CX 반응이 있고 Google Trends에서도 AI 챗봇/AI 상담 축이 강함.",
    },
    "외식/서비스": {
        "search": 5,
        "owned": 6,
        "service": 10,
        "ease": 4.5,
        "sme": 4.5,
        "rationale": "뉴스 이슈는 있으나 채용/검색 신호가 상대적으로 약해 후순위 실험군.",
    },
    "물류/배송": {
        "search": 8,
        "owned": 5,
        "service": 13,
        "ease": 4,
        "sme": 3.5,
        "rationale": "배송조회/지연 문의는 콘텐츠 소재성이 있으나 기존 뉴스/데이터랩 보강 범위가 제한적.",
    },
    "교육/학원": {
        "search": 7,
        "owned": 4,
        "service": 12,
        "ease": 4,
        "sme": 4.5,
        "rationale": "상담/환불/수강 문의 소재는 있으나 현재 데이터에서 수요 신호가 낮음.",
    },
}

INDUSTRY_DETAIL_EVIDENCE = {
    "이커머스/쇼핑몰": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 31건",
        "search": "Google Trends에서 쇼핑몰 CS, 환불, 교환, 배송조회 축 강함; 데이터랩 상대 트렌드에서 쇼핑몰 CS 대행 신호 확인",
        "news": "뉴스에서 환불, 반품, 배송, 민원, 문의 반복",
        "owned_service": "CS대행/CS아웃소싱/고객센터운영 자사 채널 반응과 반복 문의 응대, AI VOC, 운영 대행이 직접 연결",
        "risk": "커머스 전체가 아니라 교환·반품/배송 문의가 많은 브랜드몰/쇼핑몰로 좁혀야 함",
    },
    "렌탈/구독/AS": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 34건",
        "search": "데이터랩 개별 키워드는 약하지만 CS 대행/고객센터 운영 공통 검색축과 결합 가능",
        "news": "뉴스에서 AS, 민원, 해지, 고객센터, 문의 반복",
        "owned_service": "CS운영/CS대행 자사 채널 반응과 AS 접수, 해지 문의, 상담 이력 관리가 직접 연결",
        "risk": "검색어를 렌탈 고객센터처럼 넓게 잡기보다 AS 접수/해지 문의 문제형으로 재가공 필요",
    },
    "병원/헬스케어": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 28건",
        "search": "네이버 데이터랩 상대 트렌드에서 병원 예약 상담, 병원 고객센터 신호 확인",
        "news": "뉴스에서 상담, 문의, 예약, 민원, 불만 반복",
        "owned_service": "고객응대/CS품질/AI 상담 반응과 예약 문의 응대, 상담 품질 관리, VOC 리포트 연결",
        "risk": "의료 광고, 개인정보, 상담 표현을 보수적으로 관리해야 함",
    },
    "금융/보험": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 72건으로 가장 큼",
        "search": "데이터랩 상대 트렌드에서 보험 고객센터 보합 신호",
        "news": "뉴스에서 문의, 상담, 고객센터, 민원, 해지 반복",
        "owned_service": "CS품질/CS아웃소싱 반응과 민원 VOC, 상담 QA 연결",
        "risk": "규제/보안 장벽과 대형사 중심 구조로 중소기업 직접 타겟성은 낮음",
    },
    "IT/SaaS/플랫폼": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 12건으로 낮음",
        "search": "Google Trends와 데이터랩에서 AI 상담/AICC/AI 챗봇 축이 강함",
        "news": "이번 뉴스 API 수집 대상 산업은 아니어서 이슈 보강은 제한적",
        "owned_service": "AX/AICC/AI CX/AI 상담 자사 채널 반응과 AI 상담, 티켓 분류, 운영 대행 연결",
        "risk": "산업 타겟이라기보다 AI/CX 공통 주제로 다루는 편이 적합",
    },
    "제조/유통": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 24건",
        "search": "데이터랩 개별 키워드 신호는 약하나 VOC/AS 문제형 키워드로 확장 가능",
        "news": "뉴스에서 민원, AS, 환불, 불만, 문의 반복",
        "owned_service": "CS품질/고객응대 반응과 제품 문의, AS 접수, 품질 VOC 연결",
        "risk": "산업 범위가 넓어 제품군/유통 형태별 세분화가 필요",
    },
    "통신": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 21건",
        "search": "데이터랩 개별 키워드 신호는 약하지만 요금/해지/장애 문제형 검색 여지 있음",
        "news": "뉴스에서 민원, 요금, 문의, 상담, 고객센터 반복",
        "owned_service": "콜센터운영/고객센터운영 자사 채널 반응과 상담 품질/스크립트 연결",
        "risk": "대기업/BPO 중심 이슈가 많아 중소기업 직접 타겟성은 낮음",
    },
    "외식/서비스": {
        "demand": "채용공고 snapshot 기반 CS 관련 공고 18건",
        "search": "데이터랩 개별 키워드 신호는 약함",
        "news": "뉴스에서 민원, 환불, 문의, 불만, 상담 반복",
        "owned_service": "고객응대/고객경험 반응과 민원 응대, VOC 분석, 매장별 이슈 리포트 연결",
        "risk": "직접 전환보다는 프랜차이즈/예약 서비스로 좁힌 실험 콘텐츠가 적합",
    },
}

FINAL_TOPIC_DRAFTS = [
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점",
        "likely_search_question": "쇼핑몰 교환·반품 문의가 많아졌을 때 CS 대행을 맡겨도 될까?",
        "main_keyword": "쇼핑몰 CS 대행",
        "cs_sharing_connection": "고객센터 운영 대행, 반복 문의 응대, AI VOC",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "components": {"search": 20, "owned": 12, "service": 15, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "배송조회·환불 문의가 쇼핑몰 CS를 마비시키는 이유와 분류법",
        "likely_search_question": "배송조회와 환불 문의가 많을 때 쇼핑몰 고객센터를 어떻게 정리해야 할까?",
        "main_keyword": "쇼핑몰 고객센터 운영",
        "cs_sharing_connection": "문의 유형 분류, FAQ 개선, 상담 운영 대행",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "components": {"search": 19, "owned": 10, "service": 15, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법",
        "likely_search_question": "렌탈 AS 접수와 해지 문의가 늘면 고객센터를 어떻게 운영해야 할까?",
        "main_keyword": "렌탈 고객센터",
        "cs_sharing_connection": "AS 접수 대행, 해지 문의 응대, 상담 이력 관리",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "components": {"search": 14, "owned": 11, "service": 15, "ease": 4.5, "sme": 4},
    },
    {
        "target_industry": "병원/헬스케어",
        "content_topic": "예약·시술 문의가 몰리는 병원 CS센터 운영법",
        "likely_search_question": "예약 문의가 몰릴 때 병원 고객센터를 외주화해도 될까?",
        "main_keyword": "병원 고객센터",
        "cs_sharing_connection": "예약 문의 응대, 상담 품질 관리, 고객센터 운영 대행",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "components": {"search": 20, "owned": 8, "service": 14, "ease": 4.5, "sme": 5},
    },
    {
        "target_industry": "공통/중소기업",
        "content_topic": "중소기업 고객센터 운영, 직접 채용과 CS 대행 비용을 비교하는 법",
        "likely_search_question": "중소기업이 CS 담당자를 뽑는 것과 CS 대행을 쓰는 것 중 뭐가 나을까?",
        "main_keyword": "CS아웃소싱 비용",
        "cs_sharing_connection": "CS 대행 비용 구조, 운영 리스크, 상담 품질 관리",
        "recommended_channel": "네이버 블로그/전환형 SEO",
        "confidence_level": "High",
        "components": {"search": 16, "owned": 15, "service": 15, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "공통/AI·CX",
        "content_topic": "AI 상담을 도입해도 상담원이 필요한 이유: AICC와 운영 설계의 빈틈",
        "likely_search_question": "AI 챗봇이나 AICC를 도입하면 고객센터 인력이 줄어들까?",
        "main_keyword": "AI 상담",
        "cs_sharing_connection": "AI 상담 솔루션, 상담원 운영, 예외 문의 처리, AI VOC",
        "recommended_channel": "네이버 블로그 + 인스타 카드뉴스",
        "confidence_level": "High",
        "components": {"search": 20, "owned": 15, "service": 14, "ease": 5, "sme": 4},
    },
    {
        "target_industry": "공통/운영",
        "content_topic": "채널톡·상담톡을 도입한 뒤에도 CS 운영이 막히는 이유",
        "likely_search_question": "상담툴을 쓰고 있는데도 고객 문의 처리가 밀리는 이유는 뭘까?",
        "main_keyword": "고객센터 운영 효율화",
        "cs_sharing_connection": "상담툴 이후 운영 대행, 프로세스 설계, 상담 품질 관리",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "components": {"search": 18, "owned": 14, "service": 15, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "구독 해지 문의를 VOC로 분석해 이탈을 줄이는 방법",
        "likely_search_question": "구독 해지 문의를 분석하면 고객 이탈을 줄일 수 있을까?",
        "main_keyword": "구독 서비스 VOC",
        "cs_sharing_connection": "AI VOC, 해지 사유 분석, 상담 스크립트 개선",
        "recommended_channel": "네이버 블로그/리포트형 콘텐츠",
        "confidence_level": "Medium-High",
        "components": {"search": 13, "owned": 12, "service": 15, "ease": 4.5, "sme": 4},
    },
    {
        "target_industry": "금융/보험",
        "content_topic": "보험·금융 인바운드 상담에서 민원 리스크를 줄이는 운영법",
        "likely_search_question": "보험 인바운드 상담에서 민원 리스크를 어떻게 줄일 수 있을까?",
        "main_keyword": "보험 고객센터",
        "cs_sharing_connection": "상담 품질 관리, 민원 VOC 분석, 운영 대행",
        "recommended_channel": "네이버 블로그/전문성 콘텐츠",
        "confidence_level": "Medium-High",
        "components": {"search": 11, "owned": 7, "service": 9, "ease": 3.5, "sme": 2.5},
    },
    {
        "target_industry": "제조/유통",
        "content_topic": "제품 문의와 AS 상담이 늘어난 제조사가 고객센터를 정비하는 기준",
        "likely_search_question": "제품 AS 문의가 늘면 고객센터를 어떻게 정비해야 할까?",
        "main_keyword": "제품 AS 고객센터",
        "cs_sharing_connection": "AS 접수, 제품 문의 응대, 품질 VOC 분석",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium-High",
        "components": {"search": 10, "owned": 8, "service": 14, "ease": 4, "sme": 4},
    },
    {
        "target_industry": "병원/헬스케어",
        "content_topic": "병원 민원 응대에서 상담 품질을 유지하는 기준",
        "likely_search_question": "병원 민원 응대 품질을 유지하려면 어떤 기준이 필요할까?",
        "main_keyword": "병원 민원 응대",
        "cs_sharing_connection": "상담 매뉴얼, 품질 모니터링, VOC 리포트",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium-High",
        "components": {"search": 15, "owned": 8, "service": 14, "ease": 4.5, "sme": 5},
    },
    {
        "target_industry": "공통/운영",
        "content_topic": "CS 품질 관리를 시작하는 중소기업을 위한 상담 QA 체크리스트",
        "likely_search_question": "고객응대 품질을 높이려면 어떤 상담 기준을 봐야 할까?",
        "main_keyword": "CS 품질",
        "cs_sharing_connection": "상담 QA, 고객응대 매뉴얼, 품질 리포트",
        "recommended_channel": "네이버 블로그 + 인스타 저장형 카드뉴스",
        "confidence_level": "High",
        "components": {"search": 17, "owned": 15, "service": 14, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "통신",
        "content_topic": "통신 해지·요금·장애 문의가 많은 고객센터의 운영 개선법",
        "likely_search_question": "요금과 해지 문의가 많은 통신 고객센터는 어떻게 개선해야 할까?",
        "main_keyword": "통신 고객센터",
        "cs_sharing_connection": "인바운드 상담 대행, 상담 스크립트, VOC 분석",
        "recommended_channel": "네이버 블로그/전문성 콘텐츠",
        "confidence_level": "Medium",
        "components": {"search": 8, "owned": 8, "service": 10, "ease": 3.5, "sme": 2.5},
    },
    {
        "target_industry": "제조/유통",
        "content_topic": "유통사 환불·제품 문의를 반복 유형별로 줄이는 방법",
        "likely_search_question": "유통사 고객 문의를 반복 유형별로 줄일 수 있을까?",
        "main_keyword": "유통 고객센터",
        "cs_sharing_connection": "반복 문의 분류, 상담 운영 대행, FAQ 개선",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium",
        "components": {"search": 9, "owned": 7, "service": 13, "ease": 4, "sme": 4},
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "쇼핑몰 VOC를 콘텐츠와 운영 개선으로 연결하는 방법",
        "likely_search_question": "쇼핑몰 고객 불만을 VOC로 모으면 어떤 개선 포인트가 보일까?",
        "main_keyword": "쇼핑몰 VOC 분석",
        "cs_sharing_connection": "AI VOC 분석, 문의 유형 리포트, 상담 품질 관리",
        "recommended_channel": "네이버 블로그/리포트형 콘텐츠",
        "confidence_level": "Medium-High",
        "components": {"search": 16, "owned": 12, "service": 14, "ease": 5, "sme": 5},
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "설치·수리 일정 문의를 놓치지 않는 AS 상담 프로세스",
        "likely_search_question": "설치와 수리 일정 문의를 놓치지 않으려면 상담 프로세스가 어떻게 필요할까?",
        "main_keyword": "AS 상담 운영",
        "cs_sharing_connection": "AS 접수 분류, 상담 품질 모니터링, 운영 대행",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium",
        "components": {"search": 11, "owned": 10, "service": 15, "ease": 4.5, "sme": 4},
    },
    {
        "target_industry": "금융/보험",
        "content_topic": "금융 CS 외주화 전 확인해야 할 보안·품질 체크리스트",
        "likely_search_question": "금융 고객센터를 외주화하기 전에 보안과 품질 기준은 무엇을 확인해야 할까?",
        "main_keyword": "금융 CS 외주",
        "cs_sharing_connection": "운영 프로세스, 상담 품질 기준, 민원 대응 체계",
        "recommended_channel": "네이버 블로그/세일즈 보조 자료",
        "confidence_level": "Medium",
        "components": {"search": 8, "owned": 7, "service": 9, "ease": 3.5, "sme": 2.5},
    },
    {
        "target_industry": "외식/서비스",
        "content_topic": "프랜차이즈 고객 불만이 늘 때 본사 고객센터가 해야 할 일",
        "likely_search_question": "프랜차이즈 고객 불만이 늘면 본사 CS를 어떻게 운영해야 할까?",
        "main_keyword": "프랜차이즈 고객센터",
        "cs_sharing_connection": "민원 응대 대행, VOC 분석, 매장별 이슈 리포트",
        "recommended_channel": "인스타 카드뉴스 + 블로그 보조",
        "confidence_level": "Medium-Low",
        "components": {"search": 6, "owned": 6, "service": 11, "ease": 4.5, "sme": 4.5},
    },
    {
        "target_industry": "IT/SaaS/플랫폼",
        "content_topic": "SaaS 고객지원 티켓이 쌓일 때 AI와 운영 대행을 함께 쓰는 기준",
        "likely_search_question": "SaaS 고객지원 티켓이 쌓이면 AI 상담과 CS 대행 중 무엇부터 해야 할까?",
        "main_keyword": "SaaS 고객지원",
        "cs_sharing_connection": "티켓 분류, AI 상담, 반복 문의 응대, 운영 대행",
        "recommended_channel": "네이버 블로그 + B2B thought leadership",
        "confidence_level": "Medium",
        "components": {"search": 18, "owned": 15, "service": 13, "ease": 5, "sme": 4},
    },
    {
        "target_industry": "교육/학원",
        "content_topic": "수강 문의와 환불 상담이 늘어난 학원이 CS 대행을 검토하는 기준",
        "likely_search_question": "학원 수강 문의와 환불 상담이 늘면 CS 대행을 써도 될까?",
        "main_keyword": "학원 상담 대행",
        "cs_sharing_connection": "인바운드 상담 대행, 환불 문의 응대, 문의 유형 분석",
        "recommended_channel": "네이버 블로그/실험 콘텐츠",
        "confidence_level": "Medium-Low",
        "components": {"search": 7, "owned": 4, "service": 12, "ease": 4, "sme": 4.5},
    },
]


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def pct(value: float) -> str:
    return f"{value:.1f}%"


def fmt(value: float) -> str:
    return f"{value:.1f}"


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def markdown_table(headers: list[str], rows: list[list[object]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(cell).replace("|", "/") for cell in row) + " |")
    return "\n".join(lines)


def build_source_stats() -> dict[str, object]:
    job_rows = read_csv(JOB_SNAPSHOT_PATH)
    raw_job_rows = read_csv(RAW_JOBS_PATH)
    news_rows = read_csv(NEWS_PATH)
    datalab_rows = read_csv(DATALAB_SUMMARY_PATH)
    topic_rows = read_csv(TOPICS_WITH_TRENDS_PATH)
    datalab_raw = json.loads(DATALAB_RAW_PATH.read_text(encoding="utf-8"))
    readme = README_PATH.read_text(encoding="utf-8")

    cs_rows = [row for row in job_rows if row.get("is_cs_relevant") == "true"]
    job_counts = Counter(row.get("inferred_industry", "기타/불명") for row in cs_rows)
    news_counts = Counter(row.get("industry", "") for row in news_rows)

    news_issue_counts: dict[str, list[tuple[str, int]]] = {}
    for industry in sorted(news_counts):
        text = " ".join(
            f"{row.get('title', '')} {row.get('description', '')}"
            for row in news_rows
            if row.get("industry") == industry
        ).lower()
        counts = [(term, text.count(term.lower())) for term in ISSUE_TERMS]
        news_issue_counts[industry] = sorted([item for item in counts if item[1]], key=lambda x: x[1], reverse=True)

    datalab_top = sorted(
        datalab_rows,
        key=lambda row: (float(row.get("recent_3m_avg", 0) or 0), float(row.get("trend_delta", 0) or 0)),
        reverse=True,
    )

    return {
        "job_rows": job_rows,
        "raw_job_rows": raw_job_rows,
        "news_rows": news_rows,
        "datalab_rows": datalab_rows,
        "topic_rows": topic_rows,
        "datalab_raw": datalab_raw,
        "readme": readme,
        "cs_rows": cs_rows,
        "job_counts": job_counts,
        "news_counts": news_counts,
        "news_issue_counts": news_issue_counts,
        "datalab_top": datalab_top,
    }


def job_demand_component(industry: str, job_counts: Counter) -> float:
    target_counts = {
        key: value
        for key, value in job_counts.items()
        if key not in {"기타/불명", "BPO/콜센터 운영사"}
    }
    max_count = max(target_counts.values()) if target_counts else 1
    return min(25.0, (job_counts.get(industry, 0) / max_count) * WEIGHTS["CS 수요 산업 신호"])


def news_component(industry: str, news_counts: Counter) -> float:
    max_news = max(news_counts.values()) if news_counts else 1
    return min(15.0, (news_counts.get(industry, 0) / max_news) * WEIGHTS["산업별 최근 이슈성"])


def build_industry_scores(stats: dict[str, object]) -> list[dict[str, object]]:
    job_counts: Counter = stats["job_counts"]  # type: ignore[assignment]
    news_counts: Counter = stats["news_counts"]  # type: ignore[assignment]
    rows = []
    for industry, manual in INDUSTRY_MANUAL_COMPONENTS.items():
        demand = job_demand_component(industry, job_counts)
        news = news_component(industry, news_counts)
        total = demand + news + manual["search"] + manual["owned"] + manual["service"] + manual["ease"] + manual["sme"]
        rows.append(
            {
                "industry": industry,
                "total": total,
                "demand": demand,
                "search": manual["search"],
                "owned": manual["owned"],
                "news": news,
                "service": manual["service"],
                "ease": manual["ease"],
                "sme": manual["sme"],
                "job_count": job_counts.get(industry, 0),
                "news_count": news_counts.get(industry, 0),
                "rationale": manual["rationale"],
            }
        )
    return sorted(rows, key=lambda row: row["total"], reverse=True)


def topic_supporting_evidence(topic: dict[str, object], stats: dict[str, object]) -> str:
    industry = str(topic["target_industry"])
    main_keyword = str(topic["main_keyword"])
    job_counts: Counter = stats["job_counts"]  # type: ignore[assignment]
    news_counts: Counter = stats["news_counts"]  # type: ignore[assignment]
    issue_counts: dict[str, list[tuple[str, int]]] = stats["news_issue_counts"]  # type: ignore[assignment]
    datalab_rows: list[dict[str, str]] = stats["datalab_rows"]  # type: ignore[assignment]

    evidence = []
    mapped_industry = industry if industry in job_counts else ""
    if mapped_industry:
        evidence.append(f"채용공고 snapshot 기반 CS 수요 신호 {job_counts.get(mapped_industry, 0)}건")
    if mapped_industry and news_counts.get(mapped_industry):
        top_terms = ", ".join(term for term, _ in issue_counts.get(mapped_industry, [])[:4])
        evidence.append(f"뉴스 {news_counts[mapped_industry]}건에서 {top_terms} 이슈 반복")

    trend = next((row for row in datalab_rows if row.get("keyword") == main_keyword), None)
    if trend:
        evidence.append(
            f"네이버 데이터랩 상대 트렌드 {main_keyword}: 최근3개월 {trend['recent_3m_avg']}, {trend['trend_label']}"
        )

    if industry == "이커머스/쇼핑몰":
        evidence.append("Google Trends 상대 관심도에서 쇼핑몰 CS, 환불, 교환, 배송조회 축이 강함")
    elif industry == "렌탈/구독/AS":
        evidence.append("뉴스에서 AS, 민원, 해지, 고객센터 표현이 반복됨")
    elif industry == "병원/헬스케어":
        evidence.append("데이터랩 상대 트렌드에서 병원 예약 상담과 병원 고객센터 신호 확인")
    elif industry == "공통/AI·CX":
        evidence.append("Google Trends와 자사 채널에서 AI 상담, AICC, AI CX 반응 신호 확인")
    elif industry == "공통/중소기업":
        evidence.append("자사 채널에서 CS아웃소싱 비용, CS대행, 고객센터운영 반응 신호 확인")
    elif industry == "공통/운영":
        evidence.append("자사 채널에서 CS운영, CS품질, 고객응대, 고객센터운영 반응 신호 확인")

    return "; ".join(evidence)


def topic_priority_reason(topic: dict[str, object], score: float) -> str:
    industry = str(topic["target_industry"])
    if score >= 80:
        level = "즉시 발행 후보"
    elif score >= 70:
        level = "상위 실험 후보"
    elif score >= 60:
        level = "보조 발행 후보"
    else:
        level = "후순위 실험 후보"

    if industry.startswith("공통"):
        return f"{level}: 산업 특정성은 낮지만 자사 채널 반응과 서비스 연결성이 강해 리드 전환형/교육형 콘텐츠로 적합."
    return f"{level}: 산업 수요 신호, 이슈성, CS쉐어링 연결성을 함께 고려했을 때 콘텐츠화 가능성이 높음."


def build_final_topics(stats: dict[str, object]) -> list[dict[str, str]]:
    job_counts: Counter = stats["job_counts"]  # type: ignore[assignment]
    news_counts: Counter = stats["news_counts"]  # type: ignore[assignment]
    output = []
    for draft in FINAL_TOPIC_DRAFTS:
        industry = str(draft["target_industry"])
        base_industry = industry if industry in INDUSTRY_MANUAL_COMPONENTS else ""
        demand = job_demand_component(base_industry, job_counts) if base_industry else 14.0
        news = news_component(base_industry, news_counts) if base_industry else 8.0
        components = draft["components"]  # type: ignore[assignment]
        score = (
            demand
            + news
            + float(components["search"])
            + float(components["owned"])
            + float(components["service"])
            + float(components["ease"])
            + float(components["sme"])
        )
        output.append(
            {
                "priority_score": fmt(score),
                "target_industry": industry,
                "content_topic": str(draft["content_topic"]),
                "likely_search_question": str(draft["likely_search_question"]),
                "main_keyword": str(draft["main_keyword"]),
                "supporting_evidence": topic_supporting_evidence(draft, stats),
                "cs_sharing_connection": str(draft["cs_sharing_connection"]),
                "recommended_channel": str(draft["recommended_channel"]),
                "priority_reason": topic_priority_reason(draft, score),
                "confidence_level": str(draft["confidence_level"]),
            }
        )

    ranked = sorted(output, key=lambda row: float(row["priority_score"]), reverse=True)
    for idx, row in enumerate(ranked, start=1):
        row["final_rank"] = str(idx)
    return ranked


def data_source_role_section(stats: dict[str, object]) -> str:
    datalab_raw: dict[str, object] = stats["datalab_raw"]  # type: ignore[assignment]
    selected_keywords = len(datalab_raw.get("selected_keywords", []))
    return "\n".join(
        [
            "## 2. 사용 데이터와 해석 기준",
            "",
            "| 데이터 소스 | 설명하는 것 | 해석 기준 |",
            "| --- | --- | --- |",
            "| Google Trends seed keyword 확장 | 외부 검색 의도 후보와 콘텐츠 축 | 상대 관심도이며 절대 검색량으로 해석하지 않음 |",
            "| 회사 제공 플랫폼 데이터 요약 신호 | 자사 채널에서 반응을 얻은 표현/메시지 | raw table은 사용하지 않고 요약 신호만 사용 |",
            "| 채용공고 snapshot | CS 인력 수요가 보이는 산업 후보 | 국내 전체 시장 통계가 아니라 채용공고 snapshot 기반 CS 수요 신호 |",
            "| 네이버 뉴스 API 결과 | 산업별 최근 이슈/콘텐츠 소재 | 제목/요약 기반이므로 본문 전체 분석처럼 과도하게 해석하지 않음 |",
            f"| 네이버 데이터랩 상대 트렌드 | {selected_keywords}개 키워드의 네이버 검색 상대 트렌드 | 절대 검색량이 아니며 API 호출 묶음 간 비교는 보수적으로 해석 |",
        ]
    )


def signal_section(stats: dict[str, object]) -> str:
    job_counts: Counter = stats["job_counts"]  # type: ignore[assignment]
    news_counts: Counter = stats["news_counts"]  # type: ignore[assignment]
    issue_counts: dict[str, list[tuple[str, int]]] = stats["news_issue_counts"]  # type: ignore[assignment]
    datalab_top: list[dict[str, str]] = stats["datalab_top"]  # type: ignore[assignment]
    raw_job_rows: list[dict[str, str]] = stats["raw_job_rows"]  # type: ignore[assignment]
    cs_rows: list[dict[str, str]] = stats["cs_rows"]  # type: ignore[assignment]

    job_table = markdown_table(
        ["산업", "CS 관련 공고 수"],
        [[industry, count] for industry, count in job_counts.most_common(10)],
    )
    news_table = markdown_table(
        ["산업", "뉴스 수", "반복 이슈"],
        [
            [industry, news_counts[industry], ", ".join(term for term, _ in issue_counts.get(industry, [])[:5])]
            for industry, _ in news_counts.most_common()
        ],
    )
    trend_table = markdown_table(
        ["키워드", "최근 3개월 평균", "직전 3개월 대비", "라벨"],
        [
            [row["keyword"], row["recent_3m_avg"], row["trend_delta"], row["trend_label"]]
            for row in datalab_top[:8]
        ],
    )

    return "\n".join(
        [
            "## 3. 데이터 소스별 핵심 신호",
            "",
            "### Google Trends seed keyword",
            "",
            "- 쇼핑몰/교환·반품 축은 `고객센터`, `환불`, `교환`, `배송 조회`의 상대 관심도가 강해 콘텐츠 소재성이 가장 뚜렷하다.",
            "- AI 상담/AICC/챗봇 축은 넓은 관심을 만들기 좋지만, 바로 전환되는 키워드와는 분리해 교육형 콘텐츠로 다루는 편이 맞다.",
            "- VOC/고객 불만/CS 품질 축은 `데이터 분석`, `고객 서비스`, `서비스 품질`, `고객 응대`와 연결되어 운영 개선 콘텐츠로 확장 가능하다.",
            "- `채널톡`, `상담톡`처럼 도구명 관심이 보여, 툴 도입 이후의 운영 공백을 다루는 주제가 유효하다.",
            "",
            "### 회사 제공 플랫폼 데이터 요약 신호",
            "",
            "- 네이버블로그: AX/AICC/AI 상담/AI CX는 인지도형, CS아웃소싱 비용/CS 아웃소싱은 전환 의도가 강한 키워드로 구분한다.",
            "- 인스타: CS운영, 중소기업CS, 고객응대, CS대행, CS아웃소싱, 고객센터운영, 콜센터운영은 실무 공감형 카드뉴스에 적합하다.",
            "- 조직문화/직원성장/고객만족 반응은 직접 전환형이라기보다 브랜드 신뢰 형성용 콘텐츠로 해석한다.",
            "- 페이스북은 도달 규모가 작아 핵심 판단 근거가 아니라 AI/운영효율/BPO 메시지 테스트 보조 신호로만 사용한다.",
            "",
            "### 채용공고 snapshot",
            "",
            f"- 원본 채용공고 snapshot {len(raw_job_rows)}건 중 중복 제외 분석 대상은 935건, CS 관련 공고는 {len(cs_rows)}건이다.",
            "- 아래 수치는 국내 전체 시장 분포가 아니라 채용공고 snapshot 기반 CS 수요 신호다.",
            "",
            job_table,
            "",
            "### 네이버 뉴스 API",
            "",
            "- 뉴스는 산업별 CS 이슈/콘텐츠 소재를 찾기 위한 제목/요약 기반 보조 자료다.",
            "",
            news_table,
            "",
            "### 네이버 데이터랩 상대 트렌드",
            "",
            "- 데이터랩은 절대 검색량이 아니라 상대 트렌드다. 특히 5개 키워드 단위 호출 묶음 간 ratio 비교는 보수적으로 해석했다.",
            "",
            trend_table,
        ]
    )


def framework_section() -> str:
    weight_table = markdown_table(
        ["평가 기준", "가중치", "설정 이유"],
        [
            ["CS 수요 산업 신호", 25, "채용공고 snapshot은 실제 인력 수요에 가까운 신호라 가장 크게 반영"],
            ["검색 의도/키워드 신호", 20, "콘텐츠는 검색 의도와 맞아야 하므로 Google Trends와 데이터랩 상대 트렌드를 반영"],
            ["자사 채널 반응 신호", 15, "이미 자사 채널에서 반응이 확인된 표현은 발행 성공 가능성이 높음"],
            ["산업별 최근 이슈성", 15, "뉴스 이슈가 있어야 콘텐츠 소재와 후킹 문장이 살아남"],
            ["CS쉐어링 서비스 연결성", 15, "CS 대행, AI VOC, 상담 품질 관리로 자연스럽게 연결되는 정도"],
            ["콘텐츠화 용이성", 5, "문제-원인-해결 구조로 설명하기 쉬운지"],
            ["중소기업 타겟 적합성", 5, "대기업/규제 산업보다 중소기업 의사결정자에게 닿기 쉬운지"],
        ],
    )
    return "\n".join(
        [
            "## 4. 최종 분석 프레임워크",
            "",
            "최종 우선순위는 정량 점수와 정성 판단을 함께 사용했다. 채용공고와 뉴스는 파일에서 집계했고, 검색 의도와 자사 채널 반응은 주어진 요약 신호를 바탕으로 정성 점수화했다.",
            "",
            weight_table,
            "",
            "이 가중치는 시장 규모 추정이 아니라 콘텐츠 주제 선정을 목적으로 한다. 따라서 수요 신호가 크더라도 서비스 연결성이나 중소기업 타겟 적합성이 낮으면 우선순위를 낮췄고, 반대로 산업 채용 수요가 낮아도 자사 채널 반응과 검색 의도가 강한 AI/CX 공통 주제는 별도 상위 후보로 보았다.",
        ]
    )


def industry_priority_section(industry_scores: list[dict[str, object]], stats: dict[str, object]) -> str:
    issue_counts: dict[str, list[tuple[str, int]]] = stats["news_issue_counts"]  # type: ignore[assignment]
    rows = []
    for idx, row in enumerate(industry_scores[:8], start=1):
        industry = str(row["industry"])
        issue = ", ".join(term for term, _ in issue_counts.get(industry, [])[:4]) or "기존 뉴스 보강 없음"
        rows.append(
            [
                idx,
                industry,
                fmt(float(row["total"])),
                f"채용 {row['job_count']}건 / 뉴스 {row['news_count']}건 / 이슈: {issue}",
                row["rationale"],
            ]
        )

    details = [
        "1. **이커머스/쇼핑몰**: 쇼핑몰 CS, 교환/반품, 환불, 배송조회가 Google Trends와 뉴스에서 동시에 강하다. 중소 쇼핑몰/브랜드몰 타겟 적합성이 높고 CS쉐어링의 반복 문의 응대, AI VOC, 운영 대행으로 바로 연결된다. 단, 커머스 전체가 아니라 교환·반품/배송 문의가 많은 운영자 세그먼트로 좁혀야 한다.",
        "2. **렌탈/구독/AS**: 채용공고와 뉴스에서 AS, 민원, 해지, 고객센터 신호가 반복된다. 고객센터 운영 대행과 AS 접수 프로세스 연결성이 높다. 단, 데이터랩 개별 키워드는 약해 검색어는 `AS 접수`, `해지 문의`, `고객센터 운영`처럼 문제형으로 재가공해야 한다.",
        "3. **병원/헬스케어**: 데이터랩 상대 트렌드에서 병원 예약 상담이 강하고, 뉴스에서 상담/예약/민원 신호가 반복된다. 의원/클리닉은 중소기업 타겟 적합성도 높다. 단, 의료 광고/개인정보 이슈가 있어 표현을 보수적으로 관리해야 한다.",
        "4. **금융/보험**: 채용공고 snapshot 기반 CS 수요 신호는 가장 크고 뉴스 이슈도 많다. 다만 규제, 보안, 대형사 중심 구조 때문에 직접 전환 난이도가 높아 전문성/신뢰형 콘텐츠로 우선 접근하는 편이 안전하다.",
        "5. **제조/유통**: 제품 AS, 품질, 환불, 제품 문의가 뉴스에서 반복된다. VOC와 AS 접수 콘텐츠로 연결하기 좋지만 산업 범위가 넓어 제품군을 좁히는 후속 검증이 필요하다.",
        "6. **IT/SaaS/플랫폼**: 채용공고 수요 신호는 낮지만 자사 채널과 Google Trends에서 AI 상담/AICC/AI CX 신호가 강하다. 산업이라기보다 공통 주제 축으로 활용하고, SaaS/앱 고객지원 티켓 문제로 좁히면 콘텐츠화가 쉽다.",
        "7. **통신**: 요금, 해지, 장애 문의 이슈가 뚜렷하지만 대기업/BPO 중심 구조라 CS쉐어링의 중소기업 직접 타겟과는 거리가 있다. 전문성 레퍼런스용 또는 상담 품질 콘텐츠로 보조 활용한다.",
        "8. **외식/서비스**: 민원, 환불, 예약 이슈는 있으나 채용/검색 신호가 상대적으로 약하다. 프랜차이즈 본사나 예약 기반 서비스로 좁힌 실험 콘텐츠가 적합하다.",
    ]
    evidence_rows = []
    for row in industry_scores[:8]:
        industry = str(row["industry"])
        detail = INDUSTRY_DETAIL_EVIDENCE.get(industry, {})
        evidence_rows.append(
            [
                industry,
                detail.get("demand", ""),
                detail.get("search", ""),
                detail.get("news", ""),
                detail.get("owned_service", ""),
                detail.get("risk", ""),
            ]
        )

    return "\n".join(
        [
            "## 5. 타겟 산업 우선순위",
            "",
            markdown_table(["순위", "산업", "통합 점수", "핵심 근거", "해석"], rows),
            "",
            "### 산업별 근거와 주의점",
            "",
            markdown_table(
                ["산업", "수요 신호 근거", "검색/트렌드 근거", "뉴스/이슈 근거", "자사 채널·서비스 연결성", "리스크/주의점"],
                evidence_rows,
            ),
            "",
            "### 산업별 판단",
            "",
            *details,
            "",
            "참고: BPO/콜센터 운영사는 채용공고 snapshot에서 41건이 잡혔지만, 이는 공급자/운영사 측 수요의 대리 신호로 보고 CS쉐어링의 타겟 산업 우선순위에서는 분리했다.",
        ]
    )


def topics_section(final_topics: list[dict[str, str]]) -> str:
    rows = [
        [
            row["final_rank"],
            row["target_industry"],
            row["content_topic"],
            row["main_keyword"],
            row["priority_score"],
            row["confidence_level"],
        ]
        for row in final_topics[:15]
    ]
    return "\n".join(
        [
            "## 6. 최종 콘텐츠 주제 후보",
            "",
            "아래 표는 최종 20개 중 상위 15개다. 전체 20개와 supporting evidence는 CSV 파일에 담았다.",
            "",
            markdown_table(["순위", "산업/축", "콘텐츠 주제", "메인 키워드", "점수", "확신도"], rows),
        ]
    )


def top_five_section(final_topics: list[dict[str, str]]) -> str:
    lines = ["## 7. 최우선 발행 후보 5개", ""]
    for row in final_topics[:5]:
        lines.extend(
            [
                f"### {row['final_rank']}. {row['content_topic']}",
                "",
                f"- 검색 질문: {row['likely_search_question']}",
                f"- 메인 키워드: {row['main_keyword']}",
                f"- 추천 채널: {row['recommended_channel']}",
                f"- 근거: {row['supporting_evidence']}",
                f"- CS쉐어링 연결: {row['cs_sharing_connection']}",
                "",
            ]
        )
    return "\n".join(lines)


def limits_section() -> str:
    return "\n".join(
        [
            "## 8. 한계와 다음 액션",
            "",
            "### 한계",
            "",
            "- 채용공고 데이터는 사람인/잡코리아 검색 결과 snapshot이며 국내 전체 시장 분포가 아니다.",
            "- 네이버 뉴스는 제목/요약 기반이므로 실제 기사 본문 맥락과 다를 수 있다.",
            "- Google Trends와 네이버 데이터랩은 상대 관심도/상대 트렌드이며 절대 검색량이 아니다.",
            "- 네이버 데이터랩은 5개 키워드 묶음별로 호출되어 서로 다른 묶음 간 ratio 비교는 보수적으로 해석해야 한다.",
            "- 회사 제공 플랫폼 데이터는 raw table이 아니라 요약 신호만 사용했으므로, 채널별 수치 비교는 하지 않았다.",
            "",
            "### 다음 액션",
            "",
            "1. 상위 5개 후보 중 이번 달 발행할 2~3개를 선택한다.",
            "2. 선택 주제별로 실제 검색 결과 SERP를 확인해 경쟁 콘텐츠와 제목 톤을 점검한다.",
            "3. `CS아웃소싱 비용`, `쇼핑몰 CS 대행`, `병원 예약 상담`은 랜딩/문의 전환 경로와 연결해 CTA를 먼저 정한다.",
            "4. 인스타는 저장형 카드뉴스로 `고객응대`, `CS운영`, `CS품질`을 풀고, 블로그는 문제 해결형 SEO 글로 나눈다.",
            "5. 후속 수집에서는 산업별 공고 상세 본문과 뉴스 본문 일부를 샘플링해 분류 정확도를 보강한다.",
        ]
    )


def write_report(stats: dict[str, object], industry_scores: list[dict[str, object]], final_topics: list[dict[str, str]]) -> None:
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    content = "\n\n".join(
        [
            "# CS쉐어링 콘텐츠 주제 선정을 위한 통합 리서치",
            f"작성일: {now}",
            "## 1. 조사 목적\n\n여러 데이터 소스를 종합해 CS쉐어링이 어떤 산업, 문제, 키워드, 콘텐츠 주제를 우선순위로 둘지 정리했다. 이 문서는 시장 규모 추정 보고서가 아니라 콘텐츠 주제 선정을 위한 리서치이며, 결과는 채용공고 snapshot 기반 CS 수요 신호, 상대 트렌드, 자사 채널 반응 신호를 구분해 해석한다.",
            data_source_role_section(stats),
            signal_section(stats),
            framework_section(),
            industry_priority_section(industry_scores, stats),
            topics_section(final_topics),
            top_five_section(final_topics),
            limits_section(),
        ]
    )
    FINAL_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    FINAL_REPORT_PATH.write_text(content + "\n", encoding="utf-8")


def main() -> int:
    stats = build_source_stats()
    industry_scores = build_industry_scores(stats)
    final_topics = build_final_topics(stats)
    write_csv(FINAL_TABLE_PATH, FINAL_TOPIC_FIELDS, final_topics)
    write_report(stats, industry_scores, final_topics)
    print(f"Wrote {FINAL_TABLE_PATH}")
    print(f"Wrote {FINAL_REPORT_PATH}")
    print("Top 5 topics:")
    for row in final_topics[:5]:
        print(f"{row['final_rank']}. {row['content_topic']} ({row['priority_score']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
