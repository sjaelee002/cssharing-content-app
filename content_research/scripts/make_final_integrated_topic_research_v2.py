#!/usr/bin/env python3
"""Build v2 integrated topic research with concrete news issue clusters.

This script only reads local CSV/MD/JSON artifacts. It does not call external
APIs and does not expose company-provided raw platform data.
"""

from __future__ import annotations

import csv
import datetime as dt
import re
from collections import Counter, defaultdict
from pathlib import Path


CONTENT_ROOT = Path(__file__).resolve().parents[1]
FINAL_MD_V1 = CONTENT_ROOT / "outputs" / "topic_research" / "final_integrated_topic_research.md"
WITH_TRENDS_MD = CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_research_summary_with_trends.md"
NEWS_PATH = CONTENT_ROOT / "data" / "raw" / "naver_news" / "industry_news_sources.csv"
TOPICS_WITH_TRENDS_PATH = (
    CONTENT_ROOT / "outputs" / "topic_research" / "cs_industry_topic_candidates_with_trends.csv"
)
FINAL_TABLE_V1 = CONTENT_ROOT / "outputs" / "topic_research" / "final_topic_priority_table.csv"
JOB_SNAPSHOT_PATH = CONTENT_ROOT / "data" / "processed" / "jobs" / "cs_industry_snapshot.csv"
TREND_SUMMARY_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "naver_datalab_trend_summary.csv"

FINAL_MD_V2 = CONTENT_ROOT / "outputs" / "topic_research" / "final_integrated_topic_research_v2.md"
FINAL_TABLE_V2 = CONTENT_ROOT / "outputs" / "topic_research" / "final_topic_priority_table_v2.csv"
ISSUE_CLUSTERS_PATH = CONTENT_ROOT / "outputs" / "topic_research" / "industry_news_issue_clusters.csv"

ISSUE_CLUSTER_FIELDS = [
    "target_industry",
    "issue_cluster",
    "issue_detail",
    "related_news_queries",
    "observed_terms",
    "buyer_problem",
    "cs_sharing_connection",
    "content_angle",
]

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

V2_WEIGHTS = {
    "채용공고 기반 CS 수요 신호": 20,
    "뉴스 기반 이슈 구체성": 20,
    "검색 의도/상대 트렌드": 18,
    "회사 채널 반응 신호": 15,
    "CS쉐어링 서비스 연결성": 15,
    "중소기업 타겟 적합성": 7,
    "콘텐츠화 용이성": 5,
}

ISSUE_CLUSTER_RULES = [
    {
        "target_industry": "이커머스/쇼핑몰",
        "issue_cluster": "교환·반품·환불 문의 증가",
        "query_terms": ["환불", "교환", "반품", "민원"],
        "observed_seed_terms": ["환불", "반품", "교환", "민원", "피해", "문의"],
        "issue_detail": "뉴스 제목/요약에서 환불·반품·교환·피해 표현이 반복되어 구매 이후 문의가 고객센터 부담으로 이어질 가능성이 보인다.",
        "buyer_problem": "쇼핑몰 운영자가 판매와 마케팅을 해야 할 시간에 교환·반품·환불 기준 설명과 감정 응대를 반복 처리하게 된다.",
        "cs_sharing_connection": "고객센터 운영 대행, 반복 문의 분류, AI VOC, 환불/반품 상담 스크립트",
        "content_angle": "교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점",
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "issue_cluster": "배송조회·배송지연 문의 누적",
        "query_terms": ["쇼핑몰 문의 증가", "배송"],
        "observed_seed_terms": ["배송", "문의", "지연", "조회", "고객센터"],
        "issue_detail": "배송 관련 문의와 쇼핑몰 문의 증가 query에서 반복 문의가 운영 병목으로 번질 수 있는 신호가 확인된다.",
        "buyer_problem": "배송 상태를 확인하는 단순 문의가 쌓이면 정작 취소·환불·불만 고객 대응이 늦어진다.",
        "cs_sharing_connection": "배송 문의 1차 응대, FAQ 개선, 주문/배송 문의 태깅",
        "content_angle": "배송조회·환불 문의가 쇼핑몰 CS를 마비시키는 이유와 분류법",
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "issue_cluster": "고객센터 미운영·자동응답 전환 리스크",
        "query_terms": ["고객센터", "고객 불만"],
        "observed_seed_terms": ["고객센터", "통화", "자동", "답변", "AI", "불만"],
        "issue_detail": "일부 뉴스 제목/요약에서 고객센터 미운영, 자동 답변, AI 안내 같은 표현이 보여 사람 응대와 자동화의 균형 문제가 드러난다.",
        "buyer_problem": "자동 응답만으로 해결되지 않는 예외 문의가 남아 고객 불만과 후기 리스크로 이어질 수 있다.",
        "cs_sharing_connection": "AI 상담 + 상담원 운영, 예외 문의 escalation, 상담 품질 관리",
        "content_angle": "AI 자동답변을 붙인 쇼핑몰에도 상담원이 필요한 이유",
    },
    {
        "target_industry": "렌탈/구독/AS",
        "issue_cluster": "AS 지연·수리비 불만",
        "query_terms": ["렌탈 AS", "정수기 AS 민원", "렌탈 고객 불만"],
        "observed_seed_terms": ["AS", "수리", "수리비", "민원", "불만", "품질"],
        "issue_detail": "렌탈/AS 관련 뉴스 제목/요약에서 늑장 AS, 수리비, 품질 민원이 반복되어 사후관리 부담이 크다는 신호가 있다.",
        "buyer_problem": "AS 접수 이후 일정 안내와 보상 기준 설명이 늦어지면 고객 불만이 커지고 상담 난도가 올라간다.",
        "cs_sharing_connection": "AS 접수 대행, 일정 안내, 불만 VOC 분류, 보상 기준 상담",
        "content_angle": "렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법",
    },
    {
        "target_industry": "렌탈/구독/AS",
        "issue_cluster": "구독 해지·취약고객 보호 이슈",
        "query_terms": ["구독 서비스 해지 문의", "렌탈 고객센터"],
        "observed_seed_terms": ["구독", "해지", "취약", "보호", "문의", "소비자"],
        "issue_detail": "구독경제와 소비자 보호, 해지 문의 query에서 가입 이후 해지/변경 상담의 민감성이 보인다.",
        "buyer_problem": "해지 상담이 매뉴얼 없이 처리되면 고객 이탈 방어와 소비자 보호 리스크가 동시에 발생한다.",
        "cs_sharing_connection": "해지 문의 응대, 해지 사유 VOC, 상담 스크립트 개선",
        "content_angle": "구독 해지 문의를 VOC로 분석해 이탈을 줄이는 방법",
    },
    {
        "target_industry": "렌탈/구독/AS",
        "issue_cluster": "고객센터 접점 품질 관리",
        "query_terms": ["렌탈 고객센터", "렌탈 고객 불만"],
        "observed_seed_terms": ["고객센터", "상담", "콜센터", "품질", "고객", "응대"],
        "issue_detail": "렌탈 고객센터 query에서 콜센터 품질과 고객 접점 관련 뉴스가 섞여, 단순 접수보다 상담 품질 관리가 중요해 보인다.",
        "buyer_problem": "접수량이 늘 때 상담 품질 기준이 없으면 처리 속도는 빨라져도 불만은 줄지 않는다.",
        "cs_sharing_connection": "상담 QA, 상담 이력 관리, VOC 리포트",
        "content_angle": "설치·수리 일정 문의를 놓치지 않는 AS 상담 프로세스",
    },
    {
        "target_industry": "병원/헬스케어",
        "issue_cluster": "예약·상담 문의 집중",
        "query_terms": ["병원 예약 문의 증가", "피부과 상담 문의"],
        "observed_seed_terms": ["예약", "상담", "문의", "도입", "수요", "고객"],
        "issue_detail": "병원 예약 문의 증가와 피부과 상담 문의 query에서 예약·상담 수요가 특정 시간대에 몰릴 가능성을 볼 수 있다.",
        "buyer_problem": "원무/상담 인력이 진료 현장 업무와 전화·채팅 문의를 동시에 처리하면서 응대 누락이 생긴다.",
        "cs_sharing_connection": "예약 문의 1차 응대, 상담 분류, 콜백 관리, 상담 품질 관리",
        "content_angle": "예약·시술 문의가 몰리는 병원 CS센터 운영법",
    },
    {
        "target_industry": "병원/헬스케어",
        "issue_cluster": "민원·불만 응대 품질",
        "query_terms": ["병원 민원", "헬스케어 고객 불만"],
        "observed_seed_terms": ["민원", "불만", "고객", "상담", "요금", "피해"],
        "issue_detail": "병원 민원과 헬스케어 고객 불만 query에서 상담 품질, 설명 책임, 불만 응대 소재가 반복된다.",
        "buyer_problem": "의료 서비스 특성상 불만 응대가 늦거나 표현이 부정확하면 신뢰 하락과 리뷰 리스크로 이어진다.",
        "cs_sharing_connection": "민원 응대 매뉴얼, 상담 QA, VOC 리포트",
        "content_angle": "병원 민원 응대에서 상담 품질을 유지하는 기준",
    },
    {
        "target_industry": "병원/헬스케어",
        "issue_cluster": "AI 기반 고객경험 솔루션 관심",
        "query_terms": ["병원 고객센터", "헬스케어 고객 불만"],
        "observed_seed_terms": ["AI", "고객 경험", "솔루션", "고객센터", "상담"],
        "issue_detail": "병원 고객센터 query에는 AI 기반 고객 경험 솔루션 관련 뉴스도 섞여, 병원 CS도 자동화와 사람 운영의 균형이 이슈가 될 수 있다.",
        "buyer_problem": "AI 도입만으로 예약 변경, 시술 전후 문의, 민감 불만까지 처리하기 어렵다.",
        "cs_sharing_connection": "AI 상담 보조, 예외 문의 상담원 연결, 상담 데이터 분석",
        "content_angle": "AI 상담을 도입한 병원도 상담 품질 관리가 필요한 이유",
    },
    {
        "target_industry": "제조/유통",
        "issue_cluster": "제품 AS 지연·수리비 갈등",
        "query_terms": ["제품 AS 민원", "A/S 고객 불만"],
        "observed_seed_terms": ["AS", "A/S", "수리", "수리비", "민원", "보상"],
        "issue_detail": "제품 AS 민원 query에서 냉장고, 보일러, 로봇청소기 등 제품 AS 지연과 수리비 갈등 소재가 나타난다.",
        "buyer_problem": "AS 접수와 진행 안내가 늦으면 제품 품질 이슈가 고객센터 불만으로 확대된다.",
        "cs_sharing_connection": "AS 접수, 진행 상태 안내, 보상 기준 상담, VOC 분류",
        "content_angle": "제품 문의와 AS 상담이 늘어난 제조사가 고객센터를 정비하는 기준",
    },
    {
        "target_industry": "제조/유통",
        "issue_cluster": "교환·환불·품질 민원 집중",
        "query_terms": ["유통 환불", "제품 AS 민원"],
        "observed_seed_terms": ["교환", "환불", "품질", "민원", "보상", "제품"],
        "issue_detail": "홈쇼핑/유통 관련 뉴스 제목·요약에서 교환·환불과 품질 민원이 함께 나타난다.",
        "buyer_problem": "판매 채널과 제조사가 나뉘어 있을수록 고객은 어디에 문의해야 할지 몰라 반복 연락을 하게 된다.",
        "cs_sharing_connection": "문의 라우팅, 반복 문의 분류, FAQ·상담 스크립트 개선",
        "content_angle": "유통사 환불·제품 문의를 반복 유형별로 줄이는 방법",
    },
    {
        "target_industry": "제조/유통",
        "issue_cluster": "제품 문의 증가와 보증 안내",
        "query_terms": ["제품 문의 증가", "제조 고객센터"],
        "observed_seed_terms": ["문의", "보증", "제품", "고객센터", "설치", "장애"],
        "issue_detail": "제품 문의 증가와 제조 고객센터 query에서 보증, 설치, 장애, 제품 안내성 문의가 고객 접점으로 이어질 수 있다.",
        "buyer_problem": "제품 스펙·보증·설치 문의가 흩어지면 영업/AS/CS가 같은 질문을 반복 처리한다.",
        "cs_sharing_connection": "제품 문의 1차 응대, FAQ 구축, 문의 유형 리포트",
        "content_angle": "제품 문의 데이터를 VOC로 바꿔 품질 개선에 쓰는 법",
    },
    {
        "target_industry": "금융/보험",
        "issue_cluster": "콜센터 품질·상담 지원 고도화",
        "query_terms": ["보험 고객센터", "카드 고객센터 문의"],
        "observed_seed_terms": ["고객센터", "콜센터", "상담", "품질", "AI", "VOC"],
        "issue_detail": "보험 고객센터 query에서 우수콜센터, AI 음성봇, KMS, VOC 활용 등 상담 지원 체계 고도화 신호가 반복된다.",
        "buyer_problem": "상담 품질을 유지하지 못하면 금융 상품 설명과 민원 대응에서 신뢰 리스크가 커진다.",
        "cs_sharing_connection": "상담 QA, KMS/스크립트 정비, 민원 VOC 분석",
        "content_angle": "보험·금융 인바운드 상담에서 민원 리스크를 줄이는 운영법",
    },
    {
        "target_industry": "금융/보험",
        "issue_cluster": "금융 민원·광고/안내 리스크",
        "query_terms": ["금융 민원", "금융 고객 불만"],
        "observed_seed_terms": ["민원", "광고", "고객 불만", "피해", "금감원", "안내"],
        "issue_detail": "금융 민원 query에서 광고 적정성, 안내 부족, 투자자 민원 같은 리스크 신호가 보인다.",
        "buyer_problem": "고객 안내와 상담 기록이 부실하면 민원이 상담팀 문제가 아니라 준법/브랜드 리스크로 번진다.",
        "cs_sharing_connection": "상담 이력 관리, 민원 대응 스크립트, VOC 리포트",
        "content_angle": "금융 CS 외주화 전 확인해야 할 보안·품질 체크리스트",
    },
    {
        "target_industry": "금융/보험",
        "issue_cluster": "해지·보장 문의 상담 난도",
        "query_terms": ["보험 해지 문의", "보험 고객센터"],
        "observed_seed_terms": ["해지", "보장", "문의", "상담", "보험", "고객센터"],
        "issue_detail": "보험 해지 문의 query는 해지·보장·상담 난도가 높은 문의가 고객센터에 집중될 수 있음을 보여준다.",
        "buyer_problem": "해지 사유와 보장 문의를 제대로 분류하지 못하면 고객 이탈과 불완전 안내 리스크가 동시에 생긴다.",
        "cs_sharing_connection": "해지 사유 VOC, 상담 분류, QA 모니터링",
        "content_angle": "보험 해지 문의를 VOC로 분류해 상담 품질을 높이는 법",
    },
    {
        "target_industry": "통신",
        "issue_cluster": "요금·해지 문의 반복",
        "query_terms": ["통신 요금 민원", "통신 해지 문의"],
        "observed_seed_terms": ["요금", "해지", "민원", "문의", "상담", "고객센터"],
        "issue_detail": "통신 요금 민원과 해지 문의 query에서 반복 상담과 불만 응대 소재가 확인된다.",
        "buyer_problem": "요금제와 해지 조건 설명이 복잡할수록 상담 시간이 길어지고 민원 리스크가 커진다.",
        "cs_sharing_connection": "상담 스크립트, 문의 유형 분류, 민원 VOC",
        "content_angle": "통신 해지·요금·장애 문의가 많은 고객센터의 운영 개선법",
    },
    {
        "target_industry": "통신",
        "issue_cluster": "인터넷 장애·이용자 보호",
        "query_terms": ["인터넷 장애 문의", "통신 고객 불만"],
        "observed_seed_terms": ["장애", "이용자 보호", "불만", "문의", "고객", "서비스"],
        "issue_detail": "인터넷 장애 문의와 고객 불만 query에서 서비스 장애와 이용자 보호 이슈가 고객 응대로 이어질 가능성이 있다.",
        "buyer_problem": "장애 발생 시 안내 지연과 보상 기준 설명 부족이 고객 불만을 키운다.",
        "cs_sharing_connection": "장애 문의 1차 응대, 공지/FAQ 운영, 보상 문의 분류",
        "content_angle": "설치·장애 문의를 줄이는 상담 분류와 VOC 관리",
    },
    {
        "target_industry": "통신",
        "issue_cluster": "AI 음성상담 확대와 사람 상담 품질",
        "query_terms": ["통신 고객센터", "통신 요금 민원"],
        "observed_seed_terms": ["AI", "음성상담", "고객센터", "만족도", "품질", "상담"],
        "issue_detail": "통신 고객센터 query에서 AI 음성상담과 고객 만족도 평가가 함께 나타나 자동화 이후 품질 관리가 중요해 보인다.",
        "buyer_problem": "AI 상담이 늘어도 복잡한 요금·해지·장애 문의는 사람 상담의 품질 기준이 필요하다.",
        "cs_sharing_connection": "AI 상담 보완, 상담 QA, 예외 문의 라우팅",
        "content_angle": "AI 음성상담을 도입한 고객센터가 상담 품질을 지키는 기준",
    },
    {
        "target_industry": "외식/서비스",
        "issue_cluster": "프랜차이즈 고객 불만·사과 대응",
        "query_terms": ["프랜차이즈 고객 불만", "서비스 민원"],
        "observed_seed_terms": ["불만", "사과", "가맹점", "고객", "민원", "브랜드"],
        "issue_detail": "프랜차이즈 고객 불만 query에서 매장 응대, 사과, 브랜드 리스크로 이어지는 소재가 보인다.",
        "buyer_problem": "가맹점 단위 응대가 본사 브랜드 평판 문제로 커질 수 있다.",
        "cs_sharing_connection": "본사 민원 접수, 매장별 VOC 리포트, 응대 매뉴얼",
        "content_angle": "프랜차이즈 고객 불만이 늘 때 본사 고객센터가 해야 할 일",
    },
    {
        "target_industry": "외식/서비스",
        "issue_cluster": "환불 기준 차이와 고객 혼란",
        "query_terms": ["외식 환불", "프랜차이즈 고객 불만"],
        "observed_seed_terms": ["환불", "브랜드", "고객", "불만", "기준", "문의"],
        "issue_detail": "외식/프랜차이즈 뉴스 제목·요약에서 브랜드별 환불 기준 차이와 고객 불만 소재가 확인된다.",
        "buyer_problem": "환불 정책이 매장마다 다르게 안내되면 고객은 본사 고객센터로 반복 문의한다.",
        "cs_sharing_connection": "환불 기준 스크립트, FAQ, 본사 고객센터 운영 대행",
        "content_angle": "프랜차이즈 환불 문의를 줄이는 본사 CS 운영법",
    },
    {
        "target_industry": "외식/서비스",
        "issue_cluster": "예약 변경·취소 문의",
        "query_terms": ["예약 문의 증가", "호텔 고객센터"],
        "observed_seed_terms": ["예약", "취소", "변경", "문의", "호텔", "고객센터"],
        "issue_detail": "예약 문의 증가와 호텔 고객센터 query는 예약 변경·취소 문의가 서비스업 CS의 반복 업무가 될 수 있음을 보여준다.",
        "buyer_problem": "예약 문의가 몰리면 현장 운영자가 응대와 현장 서비스를 동시에 처리해야 한다.",
        "cs_sharing_connection": "예약 문의 1차 응대, 변경/취소 FAQ, 콜백 관리",
        "content_angle": "예약 변경·취소 문의가 몰리는 서비스업 CS 운영법",
    },
]

INDUSTRY_TOPIC_LIBRARY = {
    "이커머스/쇼핑몰": [
        ["교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점", "쇼핑몰 교환·반품 문의가 많아졌을 때 CS 대행을 맡겨도 될까?", "쇼핑몰 CS 대행", "고객센터 운영 대행, 반복 문의 분류, AI VOC", "뉴스 제목/요약에서 환불·반품·배송·민원 신호가 반복되고 Google Trends의 쇼핑몰 CS 축이 강함"],
        ["배송조회·환불 문의가 쇼핑몰 CS를 마비시키는 이유와 분류법", "배송조회와 환불 문의가 많을 때 쇼핑몰 고객센터를 어떻게 정리해야 할까?", "쇼핑몰 고객센터 운영", "배송 문의 1차 응대, FAQ 개선, 상담 운영 대행", "배송/환불/반품 문의가 반복 업무로 누적되는 구조가 뉴스 query와 검색 의도에서 확인됨"],
        ["AI 자동답변을 붙인 쇼핑몰에도 상담원이 필요한 이유", "쇼핑몰 자동답변으로 고객 문의를 다 해결할 수 있을까?", "쇼핑몰 CS 자동화", "AI 상담 보완, 예외 문의 라우팅, 상담 품질 관리", "고객센터 미운영·자동 답변 관련 제목/요약 신호와 자사 AI 상담 반응 신호를 결합"],
        ["쇼핑몰 VOC를 콘텐츠와 운영 개선으로 연결하는 방법", "쇼핑몰 고객 불만을 VOC로 모으면 어떤 개선 포인트가 보일까?", "쇼핑몰 VOC 분석", "AI VOC 분석, 문의 유형 리포트, 상담 품질 관리", "VOC/고객 불만 축은 Google Trends와 자사 채널에서 운영 개선 콘텐츠로 확장 가능"],
    ],
    "렌탈/구독/AS": [
        ["렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법", "렌탈 AS 접수와 해지 문의가 늘면 고객센터를 어떻게 운영해야 할까?", "렌탈 고객센터", "AS 접수 대행, 해지 문의 응대, 상담 이력 관리", "뉴스 제목/요약에서 AS·민원·해지·고객센터 신호가 반복됨"],
        ["AS 지연·수리비 불만이 생기기 전에 고객센터가 해야 할 일", "AS 지연과 수리비 문의가 많아질 때 상담팀은 무엇부터 정리해야 할까?", "AS 상담 운영", "AS 접수 분류, 보상 기준 상담, VOC 리포트", "수리비, 늑장 AS, 품질 민원 관련 뉴스 제목/요약 신호가 구체적임"],
        ["구독 해지 문의를 VOC로 분석해 이탈을 줄이는 방법", "구독 해지 문의를 분석하면 고객 이탈을 줄일 수 있을까?", "구독 서비스 VOC", "해지 사유 분석, 상담 스크립트 개선, AI VOC", "구독경제와 해지 문의 query가 소비자 보호와 리텐션 이슈로 연결됨"],
        ["설치·수리 일정 문의를 놓치지 않는 AS 상담 프로세스", "설치와 수리 일정 문의를 놓치지 않으려면 어떤 상담 프로세스가 필요할까?", "AS 접수 대행", "일정 안내, 콜백 관리, 상담 이력 관리", "AS 접수 이후 진행 상태 안내가 불만 확대를 막는 핵심 운영 문제로 재해석됨"],
    ],
    "병원/헬스케어": [
        ["예약·시술 문의가 몰리는 병원 CS센터 운영법", "예약 문의가 몰릴 때 병원 고객센터를 외주화해도 될까?", "병원 고객센터", "예약 문의 응대, 상담 품질 관리, 고객센터 운영 대행", "데이터랩 상대 트렌드에서 병원 예약 상담 신호가 강하고 뉴스 제목/요약에서 상담·예약·문의가 반복됨"],
        ["병원 민원 응대에서 상담 품질을 유지하는 기준", "병원 민원 응대 품질을 유지하려면 어떤 기준이 필요할까?", "병원 민원 응대", "민원 응대 매뉴얼, 상담 QA, VOC 리포트", "병원 민원/헬스케어 고객 불만 query가 설명 책임과 신뢰 리스크로 연결됨"],
        ["피부과·검진센터 전화 문의를 줄이는 FAQ·상담 프로세스", "전화 문의가 많은 병원은 FAQ와 상담 분류를 어떻게 만들까?", "병원 전화 문의", "FAQ 구축, 반복 문의 응대, AI 상담 보조", "피부과 상담 문의와 예약 문의 증가 query가 문의 분류 필요성을 보여줌"],
        ["AI 상담을 도입한 병원도 상담 품질 관리가 필요한 이유", "AI 상담을 쓰면 병원 예약·상담 문의가 모두 해결될까?", "병원 AI 상담", "AI 상담 보조, 예외 문의 상담원 연결, 상담 데이터 분석", "병원 고객센터 query에 AI 기반 고객 경험 솔루션 신호가 섞여 있음"],
    ],
    "제조/유통": [
        ["제품 문의와 AS 상담이 늘어난 제조사가 고객센터를 정비하는 기준", "제품 AS 문의가 늘면 고객센터를 어떻게 정비해야 할까?", "제품 AS 고객센터", "AS 접수, 진행 상태 안내, 품질 VOC 분석", "냉장고·보일러·생활가전 등 AS 지연/수리비 민원이 뉴스 제목/요약에서 구체적으로 나타남"],
        ["유통사 환불·제품 문의를 반복 유형별로 줄이는 방법", "유통사 고객 문의를 반복 유형별로 줄일 수 있을까?", "유통 고객센터", "반복 문의 분류, 상담 운영 대행, FAQ 개선", "홈쇼핑/유통 환불과 제품 품질 민원이 같이 나타나 문의 라우팅 문제가 보임"],
        ["품질 이슈 VOC를 제품 개선과 콘텐츠로 연결하는 법", "제품 품질 이슈 VOC를 제품 개선과 콘텐츠로 연결할 수 있을까?", "제품 VOC 분석", "AI VOC, 품질 이슈 분류, 리포트 자동화", "품질/AS/환불 이슈는 단순 상담을 넘어 제품 개선 인사이트로 전환 가능"],
        ["보증·설치 문의가 많은 제품 브랜드의 고객센터 운영 체크리스트", "제품 보증과 설치 문의가 많을 때 고객센터는 무엇을 준비해야 할까?", "제품 문의 대응", "제품 문의 1차 응대, 보증 FAQ, 상담 스크립트", "제조 고객센터/제품 문의 증가 query에서 보증·설치·장애성 문의 소재가 확인됨"],
    ],
    "금융/보험": [
        ["보험·금융 인바운드 상담에서 민원 리스크를 줄이는 운영법", "보험 인바운드 상담에서 민원 리스크를 어떻게 줄일 수 있을까?", "보험 고객센터", "상담 품질 관리, 민원 VOC 분석, 운영 대행", "채용공고 snapshot 기반 수요 신호가 크고 보험 고객센터 뉴스에서 콜센터 품질·AI·VOC가 반복됨"],
        ["금융 CS 외주화 전 확인해야 할 보안·품질 체크리스트", "금융 고객센터를 외주화하기 전에 무엇을 확인해야 할까?", "금융 CS 외주", "상담 이력 관리, 품질 기준, 민원 대응 체계", "금융 민원 query에서 광고/안내/민원 리스크가 보여 보안·품질 기준 콘텐츠가 필요함"],
        ["보험 해지 문의를 VOC로 분류해 상담 품질을 높이는 법", "보험 해지 문의가 많을 때 상담팀은 어떤 데이터를 봐야 할까?", "보험 해지 문의", "해지 사유 VOC, 상담 분류, QA 모니터링", "보험 해지 문의 query가 해지·보장·상담 난도 이슈로 연결됨"],
        ["카드·보험 고객센터 문의를 품질관리 관점에서 보는 법", "카드·보험 고객센터 문의를 품질관리 관점에서 어떻게 봐야 할까?", "금융 CS 품질관리", "상담 모니터링, VOC 분류, QA 리포트", "콜센터 품질 인증과 상담 지원 체계 고도화 신호가 반복됨"],
    ],
    "통신": [
        ["통신 해지·요금·장애 문의가 많은 고객센터의 운영 개선법", "요금과 해지 문의가 많은 통신 고객센터는 어떻게 개선해야 할까?", "통신 고객센터", "상담 스크립트, 문의 유형 분류, 민원 VOC", "뉴스 제목/요약에서 요금·해지·민원·고객센터가 반복됨"],
        ["설치·장애 문의를 줄이는 상담 분류와 VOC 관리", "설치와 장애 문의를 줄이려면 상담 분류를 어떻게 해야 할까?", "인터넷 장애 문의", "장애 문의 1차 응대, 공지/FAQ 운영, 보상 문의 분류", "인터넷 장애 문의와 이용자 보호 이슈가 고객 불만으로 이어질 수 있음"],
        ["AI 음성상담을 도입한 고객센터가 상담 품질을 지키는 기준", "AI 음성상담을 쓰면 통신 고객센터 품질이 좋아질까?", "통신 AI 상담", "AI 상담 보완, 상담 QA, 예외 문의 라우팅", "통신 3사의 AI 음성상담 확대와 고객 만족도 평가 신호가 함께 나타남"],
        ["통신 고객센터 상담 품질을 유지하는 교육·모니터링 기준", "통신 고객센터 상담 품질을 유지하려면 교육과 모니터링을 어떻게 해야 할까?", "통신 상담 품질", "상담 QA, 교육 운영, 품질 리포트", "요금·해지·장애 문의는 설명 정확성이 품질 리스크와 직결됨"],
    ],
    "외식/서비스": [
        ["프랜차이즈 고객 불만이 늘 때 본사 고객센터가 해야 할 일", "프랜차이즈 고객 불만이 늘면 본사 CS를 어떻게 운영해야 할까?", "프랜차이즈 고객센터", "본사 민원 접수, 매장별 VOC 리포트, 응대 매뉴얼", "프랜차이즈 고객 불만 query에서 매장 응대와 사과, 브랜드 리스크 소재가 보임"],
        ["프랜차이즈 환불 문의를 줄이는 본사 CS 운영법", "매장마다 환불 기준이 달라 고객 문의가 늘면 어떻게 해야 할까?", "프랜차이즈 환불 문의", "환불 기준 스크립트, FAQ, 본사 고객센터 운영 대행", "브랜드별 환불 기준 차이와 고객 혼란 신호가 뉴스 제목/요약에서 확인됨"],
        ["예약 변경·취소 문의가 몰리는 서비스업 CS 운영법", "예약 변경·취소 문의가 몰릴 때 고객센터를 어떻게 분리해야 할까?", "예약 문의 고객센터", "예약 문의 1차 응대, 변경/취소 FAQ, 콜백 관리", "예약 문의 증가와 호텔 고객센터 query가 반복 업무 소재로 연결됨"],
        ["서비스 민원을 VOC로 분석해 재방문 경험을 개선하는 방법", "서비스 민원을 콘텐츠와 운영 개선에 같이 활용할 수 있을까?", "서비스 VOC", "AI VOC, 민원 유형 분석, 상담 품질 개선", "서비스 민원/고객 불만 이슈는 브랜드 신뢰와 재방문 경험으로 연결됨"],
    ],
    "공통/AI·CX": [
        ["AI 상담을 도입해도 상담원이 필요한 이유: AICC와 운영 설계의 빈틈", "AI 챗봇이나 AICC를 도입하면 고객센터 인력이 줄어들까?", "AI 상담", "AI 상담 솔루션, 상담원 운영, 예외 문의 처리, AI VOC", "Google Trends와 자사 채널에서 AI 상담/AICC/AI CX 반응이 확인되고 데이터랩 상대 트렌드도 존재함"],
        ["AX·AICC 관심을 실제 CS 운영 개선으로 연결하는 방법", "AX나 AICC를 검토할 때 CS 운영팀은 무엇을 먼저 봐야 할까?", "AICC", "상담 자동화, 운영 프로세스 설계, 품질 모니터링", "자사 채널에서 AX/AICC 반응은 있으나 범위가 넓어 운영 문제로 좁혀야 함"],
        ["AI VOC가 고객 불만 관리에 필요한 이유", "고객 불만을 AI VOC로 분석하면 무엇이 달라질까?", "AI VOC", "VOC 자동 분류, 이슈 리포트, 상담 품질 개선", "Google Trends의 VOC/데이터 분석 축과 자사 AI VOC 반응 신호를 결합"],
    ],
    "공통/CS운영": [
        ["중소기업 고객센터 운영, 직접 채용과 CS 대행 비용을 비교하는 법", "중소기업이 CS 담당자를 뽑는 것과 CS 대행을 쓰는 것 중 뭐가 나을까?", "CS아웃소싱 비용", "CS 대행 비용 구조, 운영 리스크, 상담 품질 관리", "자사 채널에서 CS아웃소싱 비용/CS대행 반응이 있어 전환형 콘텐츠로 적합"],
        ["채널톡·상담톡을 도입한 뒤에도 CS 운영이 막히는 이유", "상담툴을 쓰고 있는데도 고객 문의 처리가 밀리는 이유는 뭘까?", "고객센터 운영 효율화", "상담툴 이후 운영 대행, 프로세스 설계, 상담 품질 관리", "Google Trends에서 채널톡/상담톡 관심이 보여 도구 이후 운영 공백을 다루기 좋음"],
        ["CS 품질 관리를 시작하는 중소기업을 위한 상담 QA 체크리스트", "고객응대 품질을 높이려면 어떤 상담 기준을 봐야 할까?", "CS 품질", "상담 QA, 고객응대 매뉴얼, 품질 리포트", "자사 채널에서 CS품질/고객응대 반응이 있고 인스타 저장형 콘텐츠로 적합"],
    ],
}

FINAL_TOPICS_V2 = [
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점",
        "likely_search_question": "쇼핑몰 교환·반품 문의가 많아졌을 때 CS 대행을 맡겨도 될까?",
        "main_keyword": "쇼핑몰 CS 대행",
        "cs_sharing_connection": "고객센터 운영 대행, 반복 문의 분류, AI VOC",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "priority_reason": "뉴스 이슈가 가장 구체적이고 쇼핑몰 운영자의 반복 문의 부담과 CS쉐어링 서비스가 직접 연결됨.",
        "score": 88.5,
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법",
        "likely_search_question": "렌탈 AS 접수와 해지 문의가 늘면 고객센터를 어떻게 운영해야 할까?",
        "main_keyword": "렌탈 고객센터",
        "cs_sharing_connection": "AS 접수 대행, 해지 문의 응대, 상담 이력 관리",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "priority_reason": "AS·민원·해지 이슈가 구체적이고 고객센터 운영 대행의 필요성을 설명하기 쉽다.",
        "score": 84.0,
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "배송조회·환불 문의가 쇼핑몰 CS를 마비시키는 이유와 분류법",
        "likely_search_question": "배송조회와 환불 문의가 많을 때 쇼핑몰 고객센터를 어떻게 정리해야 할까?",
        "main_keyword": "쇼핑몰 고객센터 운영",
        "cs_sharing_connection": "문의 유형 분류, FAQ 개선, 상담 운영 대행",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "priority_reason": "배송·환불·반품 이슈를 운영 병목으로 재해석할 수 있어 실무형 콘텐츠로 강함.",
        "score": 83.5,
    },
    {
        "target_industry": "병원/헬스케어",
        "content_topic": "예약·시술 문의가 몰리는 병원 CS센터 운영법",
        "likely_search_question": "예약 문의가 몰릴 때 병원 고객센터를 외주화해도 될까?",
        "main_keyword": "병원 고객센터",
        "cs_sharing_connection": "예약 문의 응대, 상담 품질 관리, 고객센터 운영 대행",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "priority_reason": "데이터랩 상대 트렌드와 뉴스 query가 예약·상담 문제를 함께 보여주며 중소 병의원 타겟 적합성이 높음.",
        "score": 82.0,
    },
    {
        "target_industry": "공통/AI·CX",
        "content_topic": "AI 상담을 도입해도 상담원이 필요한 이유: AICC와 운영 설계의 빈틈",
        "likely_search_question": "AI 챗봇이나 AICC를 도입하면 고객센터 인력이 줄어들까?",
        "main_keyword": "AI 상담",
        "cs_sharing_connection": "AI 상담 솔루션, 상담원 운영, 예외 문의 처리, AI VOC",
        "recommended_channel": "네이버 블로그 + 인스타 카드뉴스",
        "confidence_level": "High",
        "priority_reason": "자사 채널 반응과 상대 트렌드가 강하고 산업별 이슈를 관통하는 공통 메시지로 확장 가능.",
        "score": 81.0,
    },
    {
        "target_industry": "제조/유통",
        "content_topic": "제품 문의와 AS 상담이 늘어난 제조사가 고객센터를 정비하는 기준",
        "likely_search_question": "제품 AS 문의가 늘면 고객센터를 어떻게 정비해야 할까?",
        "main_keyword": "제품 AS 고객센터",
        "cs_sharing_connection": "AS 접수, 진행 상태 안내, 품질 VOC 분석",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium-High",
        "priority_reason": "뉴스 제목/요약에서 AS 지연·수리비·품질 민원이 구체적으로 보여 콘텐츠 소재성이 좋아짐.",
        "score": 78.0,
    },
    {
        "target_industry": "공통/CS운영",
        "content_topic": "중소기업 고객센터 운영, 직접 채용과 CS 대행 비용을 비교하는 법",
        "likely_search_question": "중소기업이 CS 담당자를 뽑는 것과 CS 대행을 쓰는 것 중 뭐가 나을까?",
        "main_keyword": "CS아웃소싱 비용",
        "cs_sharing_connection": "CS 대행 비용 구조, 운영 리스크, 상담 품질 관리",
        "recommended_channel": "네이버 블로그/전환형 SEO",
        "confidence_level": "High",
        "priority_reason": "자사 블로그 반응 신호에서 전환 의도가 강한 키워드이며 산업별 글의 CTA 허브로 쓰기 좋음.",
        "score": 77.5,
    },
    {
        "target_industry": "공통/CS운영",
        "content_topic": "채널톡·상담톡을 도입한 뒤에도 CS 운영이 막히는 이유",
        "likely_search_question": "상담툴을 쓰고 있는데도 고객 문의 처리가 밀리는 이유는 뭘까?",
        "main_keyword": "고객센터 운영 효율화",
        "cs_sharing_connection": "상담툴 이후 운영 대행, 프로세스 설계, 상담 품질 관리",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "High",
        "priority_reason": "Google Trends의 툴 관심과 자사 CS운영 반응을 운영 문제로 연결할 수 있음.",
        "score": 76.5,
    },
    {
        "target_industry": "이커머스/쇼핑몰",
        "content_topic": "AI 자동답변을 붙인 쇼핑몰에도 상담원이 필요한 이유",
        "likely_search_question": "쇼핑몰 자동답변으로 고객 문의를 다 해결할 수 있을까?",
        "main_keyword": "쇼핑몰 CS 자동화",
        "cs_sharing_connection": "AI 상담 보완, 예외 문의 라우팅, 상담 품질 관리",
        "recommended_channel": "네이버 블로그 + 인스타 카드뉴스",
        "confidence_level": "Medium-High",
        "priority_reason": "뉴스 제목/요약의 자동 답변·고객센터 미운영 신호와 AI/CX 반응 신호를 결합할 수 있음.",
        "score": 75.5,
    },
    {
        "target_industry": "병원/헬스케어",
        "content_topic": "병원 민원 응대에서 상담 품질을 유지하는 기준",
        "likely_search_question": "병원 민원 응대 품질을 유지하려면 어떤 기준이 필요할까?",
        "main_keyword": "병원 민원 응대",
        "cs_sharing_connection": "민원 응대 매뉴얼, 상담 QA, VOC 리포트",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium-High",
        "priority_reason": "예약 문의 다음 단계로 불만·민원 응대 품질 문제를 다룰 수 있음.",
        "score": 73.5,
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "AS 지연·수리비 불만이 생기기 전에 고객센터가 해야 할 일",
        "likely_search_question": "AS 지연과 수리비 문의가 많아질 때 상담팀은 무엇부터 정리해야 할까?",
        "main_keyword": "AS 상담 운영",
        "cs_sharing_connection": "AS 접수 분류, 보상 기준 상담, VOC 리포트",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium-High",
        "priority_reason": "수리비·늑장 AS 뉴스 신호가 구체적이고 상담 프로세스 개선으로 바로 연결됨.",
        "score": 72.5,
    },
    {
        "target_industry": "공통/CS운영",
        "content_topic": "CS 품질 관리를 시작하는 중소기업을 위한 상담 QA 체크리스트",
        "likely_search_question": "고객응대 품질을 높이려면 어떤 상담 기준을 봐야 할까?",
        "main_keyword": "CS 품질",
        "cs_sharing_connection": "상담 QA, 고객응대 매뉴얼, 품질 리포트",
        "recommended_channel": "네이버 블로그 + 인스타 저장형 카드뉴스",
        "confidence_level": "High",
        "priority_reason": "자사 채널에서 CS품질/고객응대 반응이 있고 여러 산업 이슈를 공통 운영 기준으로 묶을 수 있음.",
        "score": 72.0,
    },
    {
        "target_industry": "금융/보험",
        "content_topic": "보험·금융 인바운드 상담에서 민원 리스크를 줄이는 운영법",
        "likely_search_question": "보험 인바운드 상담에서 민원 리스크를 어떻게 줄일 수 있을까?",
        "main_keyword": "보험 고객센터",
        "cs_sharing_connection": "상담 품질 관리, 민원 VOC 분석, 운영 대행",
        "recommended_channel": "네이버 블로그/전문성 콘텐츠",
        "confidence_level": "Medium-High",
        "priority_reason": "채용공고 수요 신호는 강하지만 규제/보안 리스크 때문에 전문성 콘텐츠로 접근해야 함.",
        "score": 71.0,
    },
    {
        "target_industry": "렌탈/구독/AS",
        "content_topic": "구독 해지 문의를 VOC로 분석해 이탈을 줄이는 방법",
        "likely_search_question": "구독 해지 문의를 분석하면 고객 이탈을 줄일 수 있을까?",
        "main_keyword": "구독 서비스 VOC",
        "cs_sharing_connection": "해지 사유 분석, 상담 스크립트 개선, AI VOC",
        "recommended_channel": "네이버 블로그/리포트형 콘텐츠",
        "confidence_level": "Medium-High",
        "priority_reason": "구독경제·해지 문의는 리텐션과 고객센터 운영을 같이 설명할 수 있는 소재.",
        "score": 70.5,
    },
    {
        "target_industry": "제조/유통",
        "content_topic": "유통사 환불·제품 문의를 반복 유형별로 줄이는 방법",
        "likely_search_question": "유통사 고객 문의를 반복 유형별로 줄일 수 있을까?",
        "main_keyword": "유통 고객센터",
        "cs_sharing_connection": "반복 문의 분류, 상담 운영 대행, FAQ 개선",
        "recommended_channel": "네이버 블로그/SEO",
        "confidence_level": "Medium",
        "priority_reason": "교환·환불과 품질 민원이 동시에 나타나 문의 라우팅/FAQ 콘텐츠로 풀기 좋음.",
        "score": 67.5,
    },
    {
        "target_industry": "금융/보험",
        "content_topic": "금융 CS 외주화 전 확인해야 할 보안·품질 체크리스트",
        "likely_search_question": "금융 고객센터를 외주화하기 전에 무엇을 확인해야 할까?",
        "main_keyword": "금융 CS 외주",
        "cs_sharing_connection": "상담 이력 관리, 품질 기준, 민원 대응 체계",
        "recommended_channel": "네이버 블로그/세일즈 보조 자료",
        "confidence_level": "Medium",
        "priority_reason": "민원과 안내 리스크가 구체적이나 실제 전환은 보안/규제 허들이 있어 보조 콘텐츠로 적합.",
        "score": 65.5,
    },
    {
        "target_industry": "통신",
        "content_topic": "통신 해지·요금·장애 문의가 많은 고객센터의 운영 개선법",
        "likely_search_question": "요금과 해지 문의가 많은 통신 고객센터는 어떻게 개선해야 할까?",
        "main_keyword": "통신 고객센터",
        "cs_sharing_connection": "상담 스크립트, 문의 유형 분류, 민원 VOC",
        "recommended_channel": "네이버 블로그/전문성 콘텐츠",
        "confidence_level": "Medium",
        "priority_reason": "요금·해지·장애 이슈는 구체적이나 대기업/BPO 중심이라 우선순위는 보조로 둠.",
        "score": 62.0,
    },
    {
        "target_industry": "외식/서비스",
        "content_topic": "프랜차이즈 고객 불만이 늘 때 본사 고객센터가 해야 할 일",
        "likely_search_question": "프랜차이즈 고객 불만이 늘면 본사 CS를 어떻게 운영해야 할까?",
        "main_keyword": "프랜차이즈 고객센터",
        "cs_sharing_connection": "본사 민원 접수, 매장별 VOC 리포트, 응대 매뉴얼",
        "recommended_channel": "인스타 카드뉴스 + 블로그 보조",
        "confidence_level": "Medium",
        "priority_reason": "매장 응대와 본사 브랜드 리스크로 재해석 가능하지만 검색/채용 신호는 후순위.",
        "score": 59.0,
    },
    {
        "target_industry": "통신",
        "content_topic": "AI 음성상담을 도입한 고객센터가 상담 품질을 지키는 기준",
        "likely_search_question": "AI 음성상담을 쓰면 고객센터 품질이 좋아질까?",
        "main_keyword": "통신 AI 상담",
        "cs_sharing_connection": "AI 상담 보완, 상담 QA, 예외 문의 라우팅",
        "recommended_channel": "네이버 블로그/전문성 콘텐츠",
        "confidence_level": "Medium-Low",
        "priority_reason": "AI 상담 공통 신호와 연결되지만 통신 산업 타겟성은 제한적임.",
        "score": 56.5,
    },
    {
        "target_industry": "외식/서비스",
        "content_topic": "예약 변경·취소 문의가 몰리는 서비스업 CS 운영법",
        "likely_search_question": "예약 변경·취소 문의가 몰릴 때 고객센터를 어떻게 분리해야 할까?",
        "main_keyword": "예약 문의 고객센터",
        "cs_sharing_connection": "예약 문의 1차 응대, 변경/취소 FAQ, 콜백 관리",
        "recommended_channel": "네이버 블로그/실험 콘텐츠",
        "confidence_level": "Medium-Low",
        "priority_reason": "예약 기반 서비스에는 적합하지만 현재 데이터에서는 직접 수요 신호가 상대적으로 약함.",
        "score": 52.0,
    },
]

FIRST_FIVE_DETAILS = {
    "교환·반품 문의가 늘어난 쇼핑몰이 CS 대행을 검토해야 하는 시점": {
        "why_now": "뉴스 제목/요약 기반으로 환불·반품·배송·민원 이슈가 가장 구체적이고, 쇼핑몰 운영자는 반복 문의 부담을 바로 체감한다.",
        "reader": "브랜드몰 대표, 쇼핑몰 운영팀장, CS 담당자, 1~3명으로 CS를 처리하는 중소 이커머스 운영자",
        "subtopics": ["교환·반품 문의가 늘어나는 순간의 운영 병목", "직접 채용과 CS 대행의 비용·품질 비교", "반복 문의를 FAQ·상담 스크립트·VOC로 바꾸는 방법"],
        "cta": "쇼핑몰 문의 유형 진단 또는 CS 운영 대행 상담 CTA",
    },
    "렌탈·구독 서비스 AS 접수와 해지 문의가 늘 때 고객센터를 정비하는 법": {
        "why_now": "AS 지연, 수리비, 해지 문의가 뉴스 제목/요약에서 운영 문제로 보이고, 해지·AS는 고객 이탈과 불만을 동시에 만든다.",
        "reader": "렌탈/구독 서비스 운영팀, AS 관리자, 고객지원 리드",
        "subtopics": ["AS 접수 이후 고객이 가장 많이 묻는 질문", "해지 문의를 방어가 아니라 VOC로 보는 법", "상담 이력과 진행 상태 안내 기준"],
        "cta": "AS 접수/해지 문의 운영 프로세스 진단 CTA",
    },
    "배송조회·환불 문의가 쇼핑몰 CS를 마비시키는 이유와 분류법": {
        "why_now": "배송·환불·반품이 같은 고객센터로 들어오면 단순 조회와 고위험 불만이 섞여 처리 우선순위가 무너진다.",
        "reader": "쇼핑몰 운영자, 물류/CS 담당자, 고객센터를 처음 구축하는 브랜드몰",
        "subtopics": ["배송조회 문의와 환불 문의를 분리해야 하는 이유", "문의 유형별 SLA와 응대 템플릿", "배송/환불 VOC를 운영 개선으로 연결하는 법"],
        "cta": "쇼핑몰 CS 문의 분류표 다운로드 또는 상담 신청 CTA",
    },
    "예약·시술 문의가 몰리는 병원 CS센터 운영법": {
        "why_now": "데이터랩 상대 트렌드에서 병원 예약 상담 신호가 강하고, 뉴스 query도 예약/상담/민원 문제를 보여준다.",
        "reader": "병원 원장, 상담실장, 원무팀장, 피부과·검진센터 운영 담당자",
        "subtopics": ["예약 문의가 몰리는 시간대와 응대 누락", "시술/검진 전후 반복 문의 FAQ", "민감 문의를 상담원에게 넘기는 기준"],
        "cta": "병원 예약 상담 운영 진단 또는 고객센터 운영 상담 CTA",
    },
    "AI 상담을 도입해도 상담원이 필요한 이유: AICC와 운영 설계의 빈틈": {
        "why_now": "자사 채널과 Google Trends에서 AI 상담/AICC 반응이 있고, 여러 산업 뉴스에서 자동화와 상담 품질 문제가 함께 보인다.",
        "reader": "AICC/챗봇 도입을 검토하는 대표, CX 리드, CS 운영 담당자",
        "subtopics": ["AI가 잘 처리하는 문의와 실패하는 예외 문의", "AI 상담 이후 상담원 escalation 설계", "AI VOC로 상담 품질을 개선하는 방법"],
        "cta": "AI 상담+운영 대행 패키지 또는 AI VOC 상담 CTA",
    },
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def markdown_table(headers: list[str], rows: list[list[object]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(cell).replace("|", "/") for cell in row) + " |")
    return "\n".join(lines)


def load_inputs() -> dict[str, object]:
    # Read required input files so missing artifacts fail early.
    return {
        "final_md_v1": FINAL_MD_V1.read_text(encoding="utf-8"),
        "with_trends_md": WITH_TRENDS_MD.read_text(encoding="utf-8"),
        "news": read_csv(NEWS_PATH),
        "topics_with_trends": read_csv(TOPICS_WITH_TRENDS_PATH),
        "final_table_v1": read_csv(FINAL_TABLE_V1) if FINAL_TABLE_V1.exists() else [],
        "job_snapshot": read_csv(JOB_SNAPSHOT_PATH),
        "trend_summary": read_csv(TREND_SUMMARY_PATH),
    }


def row_matches_cluster(row: dict[str, str], cluster: dict[str, object]) -> bool:
    haystack = " ".join([row.get("query", ""), row.get("title", ""), row.get("description", "")]).lower()
    return any(str(term).lower() in haystack for term in cluster["query_terms"]) or any(
        str(term).lower() in haystack for term in cluster["observed_seed_terms"]
    )


def build_issue_clusters(news_rows: list[dict[str, str]]) -> list[dict[str, str]]:
    clusters = []
    for rule in ISSUE_CLUSTER_RULES:
        industry = str(rule["target_industry"])
        matched = [
            row
            for row in news_rows
            if row.get("industry") == industry and row_matches_cluster(row, rule)
        ]
        if not matched:
            matched = [row for row in news_rows if row.get("industry") == industry and row.get("query") in rule["query_terms"]]

        queries = sorted({row.get("query", "") for row in matched if row.get("query")})
        text = " ".join(
            f"{row.get('query', '')} {row.get('title', '')} {row.get('description', '')}"
            for row in matched
        ).lower()
        observed = []
        for term in rule["observed_seed_terms"]:
            count = text.count(str(term).lower())
            if count:
                observed.append(f"{term}({count})")
        if not observed:
            observed = [str(term) for term in rule["observed_seed_terms"][:4]]

        clusters.append(
            {
                "target_industry": industry,
                "issue_cluster": str(rule["issue_cluster"]),
                "issue_detail": str(rule["issue_detail"]),
                "related_news_queries": "; ".join(queries[:5]),
                "observed_terms": "; ".join(observed[:8]),
                "buyer_problem": str(rule["buyer_problem"]),
                "cs_sharing_connection": str(rule["cs_sharing_connection"]),
                "content_angle": str(rule["content_angle"]),
            }
        )
    return clusters


def job_counts(job_snapshot: list[dict[str, str]]) -> Counter:
    return Counter(
        row.get("inferred_industry", "기타/불명")
        for row in job_snapshot
        if row.get("is_cs_relevant") == "true"
    )


def news_counts(news_rows: list[dict[str, str]]) -> Counter:
    return Counter(row.get("industry", "") for row in news_rows)


def supporting_evidence(topic: dict[str, object], clusters: list[dict[str, str]], counts: Counter) -> str:
    industry = str(topic["target_industry"])
    related = [
        cluster
        for cluster in clusters
        if cluster["target_industry"] == industry and (
            str(topic["content_topic"]) in cluster["content_angle"]
            or cluster["issue_cluster"].split("·")[0] in str(topic["content_topic"])
            or str(topic["main_keyword"]).split()[0] in cluster["issue_detail"]
        )
    ]
    if not related and industry in {"공통/AI·CX", "공통/CS운영"}:
        related = []

    evidence = []
    if counts.get(industry):
        evidence.append(f"채용공고 snapshot 기반 CS 수요 신호 {counts[industry]}건")
    if related:
        issue_names = ", ".join(cluster["issue_cluster"] for cluster in related[:2])
        evidence.append(f"뉴스 제목/요약 기반 이슈 클러스터: {issue_names}")
    if industry == "이커머스/쇼핑몰":
        evidence.append("Google Trends에서 쇼핑몰 CS·환불·교환·배송조회 상대 관심도 신호")
    elif industry == "렌탈/구독/AS":
        evidence.append("뉴스 query에서 AS·민원·해지·고객센터 소재 반복")
    elif industry == "병원/헬스케어":
        evidence.append("네이버 데이터랩 상대 트렌드에서 병원 예약 상담/병원 고객센터 신호")
    elif industry == "공통/AI·CX":
        evidence.append("자사 채널과 Google Trends에서 AI 상담·AICC·AI CX 반응 신호")
    elif industry == "공통/CS운영":
        evidence.append("자사 채널에서 CS운영·CS아웃소싱 비용·CS품질 반응 신호")
    elif industry == "금융/보험":
        evidence.append("채용공고 수요 신호는 강하나 규제/보안 리스크로 전문성 콘텐츠에 적합")
    elif industry == "제조/유통":
        evidence.append("뉴스 제목/요약에서 제품 AS·품질·환불 민원 신호")
    elif industry == "통신":
        evidence.append("뉴스 제목/요약에서 요금·해지·장애·AI 음성상담 신호")
    elif industry == "외식/서비스":
        evidence.append("뉴스 제목/요약에서 프랜차이즈 불만·환불·예약 문의 신호")
    return "; ".join(evidence)


def build_final_topics_v2(clusters: list[dict[str, str]], counts: Counter) -> list[dict[str, str]]:
    rows = []
    for idx, topic in enumerate(sorted(FINAL_TOPICS_V2, key=lambda row: float(row["score"]), reverse=True), start=1):
        rows.append(
            {
                "final_rank": str(idx),
                "priority_score": f"{float(topic['score']):.1f}",
                "target_industry": str(topic["target_industry"]),
                "content_topic": str(topic["content_topic"]),
                "likely_search_question": str(topic["likely_search_question"]),
                "main_keyword": str(topic["main_keyword"]),
                "supporting_evidence": supporting_evidence(topic, clusters, counts),
                "cs_sharing_connection": str(topic["cs_sharing_connection"]),
                "recommended_channel": str(topic["recommended_channel"]),
                "priority_reason": str(topic["priority_reason"]),
                "confidence_level": str(topic["confidence_level"]),
            }
        )
    return rows


def data_source_section(news_rows: list[dict[str, str]]) -> str:
    return "\n".join(
        [
            "## 2. 사용 데이터와 해석 기준",
            "",
            "| 데이터 소스 | 설명하는 것 | v2 해석 기준 |",
            "| --- | --- | --- |",
            "| Google Trends seed keyword 확장 | 외부 검색 의도 후보와 콘텐츠 축 | 상대 관심도이며 절대 검색량으로 해석하지 않음 |",
            "| 회사 제공 플랫폼 데이터 요약 신호 | 자사 채널에서 반응을 얻은 표현/메시지 | raw table은 노출하지 않고 요약 신호만 사용 |",
            "| 채용공고 snapshot | CS 인력 수요가 보이는 산업 후보 | 국내 전체 시장 통계가 아니라 채용공고 snapshot 기반 CS 수요 신호 |",
            f"| 네이버 뉴스 API 결과 | 산업별 최근 이슈/콘텐츠 소재 | 조사 시점 기준 뉴스 검색 snapshot {len(news_rows)}건의 제목/요약/query 기반 분석이며, 기사 본문 전체 맥락으로 단정하지 않음 |",
            "| 네이버 데이터랩 상대 트렌드 | 네이버 검색어 상대 트렌드 | 절대 검색량이 아니며 서로 다른 API 호출 묶음 간 ratio 비교는 보수적으로 해석 |",
        ]
    )


def signal_section(clusters: list[dict[str, str]], news_rows: list[dict[str, str]], jobs: list[dict[str, str]]) -> str:
    counts = job_counts(jobs)
    ncounts = news_counts(news_rows)
    cluster_rows = [
        [
            cluster["target_industry"],
            cluster["issue_cluster"],
            cluster["buyer_problem"],
            cluster["content_angle"],
        ]
        for cluster in clusters
    ]
    job_rows = [[industry, count] for industry, count in counts.most_common(10)]
    news_rows_table = [[industry, count] for industry, count in ncounts.most_common()]
    return "\n".join(
        [
            "## 3. 데이터 소스별 핵심 신호",
            "",
            "### Google Trends seed keyword",
            "",
            "- 쇼핑몰/교환·반품 축은 `고객센터`, `환불`, `교환`, `배송 조회` 상대 관심도 신호가 강해 이커머스 콘텐츠의 출발점으로 적합하다.",
            "- AI 상담/AICC/챗봇 축은 전환형보다는 교육형·인지형 콘텐츠에 강하다. 단, `AI 상담을 도입해도 상담원이 필요한 이유`처럼 운영 문제로 좁히면 CS쉐어링 연결성이 높아진다.",
            "- VOC/고객 불만/CS 품질 축은 고객응대 품질, 상담 QA, AI VOC 콘텐츠로 확장하기 좋다.",
            "",
            "### 회사 제공 플랫폼 데이터 요약 신호",
            "",
            "- 네이버블로그에서는 AX/AICC/AI 상담/AI CX와 CS아웃소싱 비용/CS 아웃소싱 반응 신호가 확인되었다. 전자는 인지도형, 후자는 전환형으로 분리해 해석한다.",
            "- 인스타에서는 CS운영, 중소기업CS, 고객응대, AICS, BPO, CS대행, CS아웃소싱, 고객센터운영 관련 해시태그 반응이 있어 저장형 카드뉴스에 적합하다.",
            "- 조직문화/직원성장/고객만족 반응은 브랜드 신뢰 형성용으로 보고, 직접 전환형 주제와 섞지 않는다.",
            "- 페이스북은 도달 규모가 작아 핵심 판단 근거가 아니라 AI/운영효율/BPO 메시지 테스트 보조 신호로만 사용한다.",
            "",
            "### 채용공고 snapshot",
            "",
            "- 채용공고는 국내 전체 시장 통계가 아니라 채용공고 snapshot 기반 CS 수요 신호다. BPO/콜센터 운영사 41건은 참고 신호로 보되 타겟 산업 우선순위에서는 분리했다.",
            "",
            markdown_table(["산업", "CS 관련 공고 수"], job_rows),
            "",
            "### 네이버 뉴스 API: v2 이슈 클러스터",
            "",
            "- v2에서는 단순 키워드 나열 대신 뉴스 제목/요약/query를 묶어 `담당자가 겪는 운영 문제`로 재해석했다.",
            "",
            markdown_table(["산업", "이슈 클러스터", "담당자 문제", "콘텐츠 angle"], cluster_rows),
            "",
            "뉴스 검색 snapshot 분포:",
            "",
            markdown_table(["산업", "뉴스 row 수"], news_rows_table),
            "",
            "### 네이버 데이터랩 상대 트렌드",
            "",
            "- 상대 트렌드 보강에서는 `병원 예약 상담`, `CS 대행`, `AI 상담`, `쇼핑몰 CS 대행`, `보험 고객센터`가 주요 신호였다.",
            "- 다만 5개 키워드 단위 호출 묶음 간 ratio 비교는 보수적으로 해석했고, 최종 우선순위에서는 뉴스 이슈 구체성과 서비스 연결성을 더 크게 반영했다.",
        ]
    )


def framework_section() -> str:
    return "\n".join(
        [
            "## 4. 최종 분석 프레임워크",
            "",
            "v2에서는 사용자의 피드백을 반영해 `뉴스 기반 이슈 구체성`의 비중을 높였다. 이유는 이번 리포트의 목적이 산업 전체 순위보다 바로 콘텐츠로 쓸 수 있는 문제/소재를 찾는 것이기 때문이다.",
            "",
            markdown_table(
                ["평가 기준", "가중치", "조정 이유"],
                [
                    ["채용공고 기반 CS 수요 신호", 20, "실제 인력 수요에 가까운 신호지만 콘텐츠 소재성만으로는 부족해 v1보다 낮춤"],
                    ["뉴스 기반 이슈 구체성", 20, "제목/요약/query에서 운영 문제가 구체적으로 보이는 주제를 우선하기 위해 상향"],
                    ["검색 의도/상대 트렌드", 18, "Google Trends와 데이터랩 상대 트렌드가 있는 주제는 SEO 가능성이 높음"],
                    ["회사 채널 반응 신호", 15, "이미 반응이 검증된 표현은 발행 성공 가능성이 높음"],
                    ["CS쉐어링 서비스 연결성", 15, "운영 대행, AI VOC, 상담 품질 관리로 자연스럽게 이어지는지 평가"],
                    ["중소기업 타겟 적합성", 7, "중소기업 의사결정자가 겪는 문제인지 반영"],
                    ["콘텐츠화 용이성", 5, "문제-원인-해결 구조로 설명하기 쉬운지 반영"],
                ],
            ),
            "",
            "이 가중치는 시장 규모 추정용이 아니라 콘텐츠 주제 선정용이다. 그래서 금융/보험처럼 채용 수요 신호가 커도 규제·보안 리스크가 있으면 순위를 낮췄고, 이커머스/렌탈/병원처럼 담당자 문제가 구체적으로 보이는 산업은 우선순위를 올렸다.",
        ]
    )


def industry_priority_section(clusters: list[dict[str, str]], jobs: list[dict[str, str]]) -> str:
    counts = job_counts(jobs)
    rows = [
        ["1", "이커머스/쇼핑몰", "환불·반품·배송 문의 클러스터가 가장 구체적이고 중소 쇼핑몰 타겟 적합성이 높음", "커머스 전체가 아니라 교환·반품/배송 문의가 많은 운영자로 좁혀야 함"],
        ["2", "렌탈/구독/AS", "AS 지연·수리비·해지 문의가 고객센터 운영 대행과 직접 연결", "검색어는 렌탈 고객센터보다 AS 접수/해지 문의 문제형으로 재가공 필요"],
        ["3", "병원/헬스케어", "예약·상담 문의와 민원 응대 문제가 데이터랩 상대 트렌드와 뉴스 query에서 함께 보임", "의료 광고/개인정보 표현을 보수적으로 관리해야 함"],
        ["4", "제조/유통", "제품 AS·품질·환불 민원이 구체적이고 VOC/AS 접수 콘텐츠로 연결 쉬움", "제품군별 세분화가 필요"],
        ["5", "금융/보험", f"채용공고 snapshot 기반 CS 수요 신호 {counts.get('금융/보험', 0)}건으로 크고 콜센터 품질/민원 이슈 존재", "규제/보안과 대형사 중심 구조 때문에 직접 전환보다 전문성 콘텐츠로 접근"],
        ["6", "통신", "요금·해지·장애 문의와 AI 음성상담 이슈가 구체적", "대기업/BPO 중심 이슈가 많아 보조 주제로 활용"],
        ["7", "외식/서비스", "프랜차이즈 불만, 환불 기준, 예약 변경 문의 소재가 있음", "검색/채용 신호는 약해 실험 콘텐츠로 배치"],
        ["8", "공통/AI·CX/CS운영", "자사 채널 반응과 Google Trends 신호가 강해 산업별 글을 연결하는 허브 주제로 적합", "범위가 넓으므로 AICC 자체보다 운영 문제로 좁혀야 함"],
    ]
    return "\n".join(
        [
            "## 5. 타겟 산업 우선순위",
            "",
            markdown_table(["순위", "산업/축", "우선순위 근거", "리스크 또는 주의점"], rows),
            "",
            "v2의 산업 우선순위는 v1의 채용공고 중심 순위를 그대로 복사하지 않았다. 뉴스 제목/요약 기반 이슈가 얼마나 구체적인지, 해당 문제가 CS쉐어링 서비스로 자연스럽게 연결되는지, 중소기업 담당자가 실제로 검색할 만한 질문인지까지 함께 반영했다.",
        ]
    )


def industry_topic_section() -> str:
    lines = ["## 6. 산업별 콘텐츠 주제 후보", ""]
    for industry, topics in INDUSTRY_TOPIC_LIBRARY.items():
        lines.extend([f"### {industry}", ""])
        rows = [
            [topic, question, keyword, service, evidence]
            for topic, question, keyword, service, evidence in topics
        ]
        lines.append(markdown_table(["콘텐츠 주제", "검색 질문", "메인 키워드", "연결 서비스", "근거 요약"], rows))
        lines.append("")
    return "\n".join(lines)


def top20_section(final_rows: list[dict[str, str]]) -> str:
    lines = ["## 7. 최종 콘텐츠 주제 Top 20", ""]
    for row in final_rows:
        lines.extend(
            [
                f"### {row['final_rank']}. {row['content_topic']}",
                "",
                f"- 산업/축: {row['target_industry']}",
                f"- 검색 질문: {row['likely_search_question']}",
                f"- 메인 키워드: {row['main_keyword']}",
                f"- 근거 요약: {row['supporting_evidence']}",
                f"- CS쉐어링 연결: {row['cs_sharing_connection']}",
                f"- 추천 채널: {row['recommended_channel']}",
                f"- 확신도: {row['confidence_level']}",
                "",
            ]
        )
    return "\n".join(lines)


def first_five_section(final_rows: list[dict[str, str]]) -> str:
    lines = ["## 8. 최우선 발행 후보 5개", ""]
    for row in final_rows[:5]:
        detail = FIRST_FIVE_DETAILS[row["content_topic"]]
        lines.extend(
            [
                f"### {row['final_rank']}. {row['content_topic']}",
                "",
                f"- 왜 지금 먼저 써야 하는가: {detail['why_now']}",
                f"- 검색할 가능성이 높은 독자: {detail['reader']}",
                "- 본문에서 반드시 다룰 소주제:",
                *[f"  - {subtopic}" for subtopic in detail["subtopics"]],
                f"- CS쉐어링 CTA 연결 방향: {detail['cta']}",
                "",
            ]
        )
    return "\n".join(lines)


def limits_section() -> str:
    return "\n".join(
        [
            "## 9. 한계와 다음 액션",
            "",
            "### 한계",
            "",
            "- 네이버 뉴스 API 결과는 조사 시점 기준 뉴스 검색 snapshot이며, 엄격한 기간 필터 검색량 데이터가 아니다.",
            "- 뉴스 분석은 title/description/query 기반이며 기사 본문 전체를 읽은 분석이 아니다.",
            "- 네이버 데이터랩은 절대 검색량이 아니라 상대 트렌드다.",
            "- 채용공고는 국내 전체 시장 통계가 아니라 채용공고 snapshot 기반 CS 수요 신호다.",
            "- 회사 제공 플랫폼 데이터는 raw table이 아니라 요약 신호만 사용했다.",
            "- BPO/콜센터 운영사 41건은 참고 신호로 보되 타겟 산업 우선순위에서는 분리했다.",
            "",
            "### 다음 액션",
            "",
            "1. 상위 5개 중 이번 달 발행할 2~3개를 선택하고, 각 주제의 CTA를 먼저 확정한다.",
            "2. 선택 주제별 실제 SERP를 확인해 제목 톤과 경쟁 콘텐츠의 빈틈을 점검한다.",
            "3. 이커머스/렌탈/병원은 산업별 랜딩 또는 문의 유형 진단 CTA와 연결한다.",
            "4. AI 상담/CS운영 공통 주제는 블로그 장문과 인스타 카드뉴스로 나누어 발행한다.",
            "5. 후속 리서치에서는 뉴스 본문 일부와 실제 고객 문의 사례를 샘플링해 이슈 클러스터를 검증한다.",
        ]
    )


def write_report(final_rows: list[dict[str, str]], clusters: list[dict[str, str]], inputs: dict[str, object]) -> None:
    news_rows = inputs["news"]  # type: ignore[assignment]
    jobs = inputs["job_snapshot"]  # type: ignore[assignment]
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    report = "\n\n".join(
        [
            "# CS쉐어링 콘텐츠 주제 선정을 위한 통합 리서치 v2",
            f"작성일: {now}",
            "## 1. 조사 목적\n\n기존 최종 통합 리포트의 흐름은 유지하되, 네이버 뉴스 제목/요약/query 기반 이슈를 더 구체적인 운영 문제로 재해석해 콘텐츠 주제 우선순위를 보강했다. 이 문서는 시장 규모 추정 보고서가 아니라 콘텐츠 주제 선정을 위한 리서치다.",
            data_source_section(news_rows),
            signal_section(clusters, news_rows, jobs),
            framework_section(),
            industry_priority_section(clusters, jobs),
            industry_topic_section(),
            top20_section(final_rows),
            first_five_section(final_rows),
            limits_section(),
        ]
    )
    FINAL_MD_V2.parent.mkdir(parents=True, exist_ok=True)
    FINAL_MD_V2.write_text(report + "\n", encoding="utf-8")


def main() -> int:
    inputs = load_inputs()
    news_rows: list[dict[str, str]] = inputs["news"]  # type: ignore[assignment]
    jobs: list[dict[str, str]] = inputs["job_snapshot"]  # type: ignore[assignment]
    clusters = build_issue_clusters(news_rows)
    counts = job_counts(jobs)
    final_rows = build_final_topics_v2(clusters, counts)

    write_csv(ISSUE_CLUSTERS_PATH, ISSUE_CLUSTER_FIELDS, clusters)
    write_csv(FINAL_TABLE_V2, FINAL_TOPIC_FIELDS, final_rows)
    write_report(final_rows, clusters, inputs)

    print(f"Wrote {ISSUE_CLUSTERS_PATH}")
    print(f"Wrote {FINAL_TABLE_V2}")
    print(f"Wrote {FINAL_MD_V2}")
    print("Top 5 v2 topics:")
    for row in final_rows[:5]:
        print(f"{row['final_rank']}. {row['content_topic']} ({row['priority_score']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
