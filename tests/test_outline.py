from services.outline_generator import clean_json_response, generate_outline


user_input = {
    "primary_channel": "naver_blog",
    "secondary_channels": ["homepage_magazine", "linkedin", "meta"],
    "topic": "성수기 CS대응",
    "target_reader": "이커머스 운영팀장 / CS 담당자 / 쇼핑몰 대표",
    "main_keywords": [
        "성수기 CS",
        "문의 폭증",
        "CS대행",
        "쇼핑몰 CS대행",
        "운영 구조"
    ],
    "content_goal": "성수기 CS 문제를 단순 인력 부족이 아니라 운영 구조 문제로 인식시키기",
    "solution_link": "AI CX 풀서비스",
    "avoid_expressions": [
        "100% 해결",
        "무조건",
        "완벽한 성과",
        "업계 1위"
    ],
    "content_type": "문제해결형",
    "target_industry": "이커머스 / 쇼핑몰",
    "reader_situations": [
        "프로모션 이후 게시판 문의가 폭주한다",
        "배송 지연과 환불 문의가 한꺼번에 몰린다",
        "상담사 한 명이 퇴사하면 응대 속도가 급격히 느려진다",
        "대표나 운영 책임자가 직접 클레임 전화를 받는다"
    ],
    "misconception_to_refute": "성수기에는 상담 인력만 더 뽑으면 해결된다는 생각",
    "structural_cause": "변동 수요를 흡수할 백업 인력, SOP, 문의 분류, AI/사람 역할 분담 구조가 부족함",
    "preferred_sections": [
        {
            "heading": "성수기 CS대응이 왜 반복적으로 무너지는가",
            "must_include": ["문의량 급증", "배송/환불/교환 문의", "내부 인력 한계"]
        },
        {
            "heading": "인력 충원만으로 해결되지 않는 이유",
            "must_include": ["채용 시차", "교육 비용", "품질 편차"]
        },
        {
            "heading": "운영 구조를 바꾸면 무엇이 달라지는가",
            "must_include": ["SOP", "AI 문의 분류", "상담사 역할 분담"]
        }
    ],
    "include_checklist": True,
    "include_faq": True,
    "cta_type": "운영구조 상담"
}


if __name__ == "__main__":
    outline = generate_outline(
        user_input=user_input,
        channel="naver_blog"
    )

    outline = clean_json_response(outline)
    print(outline)