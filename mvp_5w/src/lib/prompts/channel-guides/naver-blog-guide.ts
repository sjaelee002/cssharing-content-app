/**
 * CS쉐어링 네이버 블로그(blog.naver.com) 전용 작성 지침.
 * 원본 .shared_cssharing/ 네이버 블로그 지침 샘플을 구조화한 mvp_5w 자산.
 */

export const NAVER_BLOG_GUIDE_BLOCK_TITLE = "[네이버 블로그 상세 작성 지침]";
export const NAVER_BLOG_GUIDE_MARKER = NAVER_BLOG_GUIDE_BLOCK_TITLE;
export const NAVER_BLOG_GUIDE_VERSION = "v4-structured-1.0";

export const NAVER_BLOG_MASTER_TONE = {
  summary:
    "도입은 친근하게, 본문은 전문적으로, 마무리는 행동을 유도하게. 레퍼런스: 리캐치(recatch.cc) + 네이버 SEO.",
  sections: {
    intro: {
      role: "독자와 눈 맞추는 훅 (이모지 1개 + 공감 한 줄 OK)",
      toneMix: "친근체 70% / 격식체 30%",
      length: "250~350자",
    },
    toc: {
      role: "도입 직후 필수 — 검색자가 1초에 글 가치 판단",
      tone: "중립, ~합니다 권장",
    },
    body: {
      role: "진단 데이터·구체 수치 기반 격식체",
      toneMix: "격식체 70~80% / 친근체 20~30%",
      length: "1,200~1,500자 (소제목 구간)",
      paragraph: "한 단락 2~4문장, 모바일 3~4줄. 단락 시작 다양화",
    },
    results: {
      role: "진단 데이터·셀러 사례·전후 비교 수치",
      toneMix: "격식체 80~90%",
      length: "300~400자",
    },
    cta: {
      role: "이모지 + 행동 + 결과 + 진입 장벽 낮추기",
      tone: "격식체 + 정중한 권유",
      length: "200~300자",
      placement: "본문 50~70% 1회 + 마지막 1회",
    },
  },
  endingMixTargets: {
    formal: "65~85%: ~합니다, ~됩니다, ~입니다",
    friendly: "15~35%: ~해요, ~죠, ~거든요, ~네요",
    failIf: "한 톤 90% 이상 단일 사용 금지",
  },
  trustedVerbs: [
    "확인됩니다",
    "분석됩니다",
    "측정됩니다",
    "보고됩니다",
    "도출됩니다",
    "산출됩니다",
    "적용됩니다",
    "운영됩니다",
  ],
  empathyOpeners: [
    "이런 경험 있으시죠",
    "~ 기억 있으실 거예요",
    "매일 마주하게 되는 장면입니다",
    "의외로 자주 발생합니다",
  ],
} as const;

export const NAVER_BLOG_SEO_RULES = {
  platform: "blog.naver.com (C-Rank, D.I.A.+)",
  bodyLength: {
    target: "공백 제외 2,000~2,500자",
    absoluteMin: 1500,
    absoluteMax: 3000,
  },
  title: {
    length: "공백 포함 22~28자",
    mainKeyword: "메인 키워드 제목 맨 앞 (필수)",
    tip: "숫자 포함 권장",
  },
  mainKeyword: {
    count: "본문 5~8회",
    max: "10회 초과 금지",
    placement: ["제목 1회", "도입 1~2회", "본문 중반 2~3회", "CTA 1~2회"],
    perSentence: "한 문장 내 2회 이상 반복 금지",
  },
  subKeywords: {
    count: "LSI 2~3개",
    eachFrequency: "각 2~4회",
  },
  tags: { count: "3~5개", max: "10개 초과 금지" },
  images: {
    count: "8~13장 (D.I.A.+)",
    types: ["직접 촬영", "인포그래픽", "데이터 시각화", "스톡 30% 이내"],
    caption: "이미지마다 1줄 캡션, 메인 키워드 자연 포함",
  },
  headings: {
    count: "4~6개",
    style: "짧은 명사구/동사구, 키워드 1~2개 포함, 문학적 표현 금지",
    goodExamples: [
      "🔍 점심·야간·주말, 전화는 어디서 새는가",
      "📊 응대 누락이 반복되는 진짜 원인",
    ],
    badExamples: ["빨라지면 좋아진다는 착각", "솔루션이 아니라 구조다"],
  },
} as const;

export const NAVER_BLOG_STRUCTURE_RULES = {
  fiveStepFlow: [
    {
      step: 1,
      name: "도입 훅",
      length: "250~350자",
      content: "이모지+훅 → 상황 → 글 가치 (3~4문장)",
    },
    {
      step: 2,
      name: "목차",
      length: "짧음",
      content: "📑 이 글의 순서 + 3~5항목, 본문 소제목과 일치",
    },
    {
      step: 3,
      name: "본문",
      length: "1,200~1,500자",
      content: "소제목 4~6개, 문제·원인·해결. 소제목=일반 텍스트 한 줄",
    },
    {
      step: 4,
      name: "결과·사례",
      length: "300~400자",
      content: "수치 기반 전후 비교 (예: 41%→9%)",
    },
    {
      step: 5,
      name: "CTA",
      length: "200~300자",
      content: "중간+마지막 각 1회",
    },
  ],
  tocFormatExample: `📑 이 글의 순서
1. (소제목1)
2. (소제목2)
3. (소제목3)
4. (소제목4)`,
  paragraphRules: [
    "단락 8개 이상, 평균 2~4문장",
    "1문장 단락 3회 이내",
    "단락 길이 의도적 변주",
    "명사구 시작 80% 이하, 질문·장면·단정 2종 이상",
  ],
  listPatternAvoid:
    "'첫째/둘째/셋째' 금지 → '처음 봐야 할 건 / 그다음은 / 마지막으로는'",
  smartEditorReady: "Ctrl+Shift+V 붙여넣기 가능한 순수 한국어+이모지",
} as const;

export const NAVER_BLOG_HOOK_PATTERNS = {
  instruction: "4패턴 중 1개 선택. 직접 인사·예고 상투어 금지.",
  patterns: [
    {
      name: "공감 유도형 (권장)",
      template:
        "🤔 이런 경험 있으시죠?\n(구체 상황 1~2문장)\n(직군·업종 맥락)",
    },
    {
      name: "질문 던지기형",
      template: "💭 (핵심 질문)?\n(진단 수치로 답)",
    },
    {
      name: "장면·일화형",
      template: "🎯 (구체 장면)\n(\"(인용)\")",
    },
    {
      name: "수치 충격형",
      template: "💡 (충격 수치)\n(CS쉐어링 N곳 데이터 근거)",
    },
  ],
  forbiddenOpenings: [
    "안녕하세요",
    "여러분",
    "오늘은 ~알아보겠습니다",
    "함께 살펴볼까요",
    "함께 알아볼까요",
  ],
  valueProposition: "도입 끝에 '이 글에서는 ~ 정리합니다' 가치 제안",
} as const;

export const NAVER_BLOG_EMOJI_RULES = {
  total: "5~8개 (8개 초과 금지)",
  placement: [
    { location: "도입 첫 줄", emojis: "🤔 💭 🎯 💡", count: "1~2" },
    { location: "목차", emojis: "📑 📋", count: "1" },
    { location: "소제목", emojis: "🔍 📊 ⚡ 💬 📦", count: "0~1/개" },
    { location: "CTA", emojis: "📩 📥 🔗", count: "1" },
  ],
  categoryHints: {
    ai: "🤖 💡 ⚡",
    data: "📊 📈 🔍",
    cs: "💬 📞 ✉️",
    logistics: "📦 🚚 🏭",
  },
  forbidden: [
    "한 단락 이모지 2개+",
    "문장 끝 😂 😍 😅",
    "B2B 부적합 🥳 🎉 🔥 💯",
    "같은 이모지 3회+",
  ],
} as const;

export const NAVER_BLOG_BANNED_PREFERRED_WORDS = {
  metaInBody: [
    "[제목]:",
    "[소제목]",
    "[이미지:",
    "---",
    "#/##/###",
    "백틱",
    "**굵게**",
  ],
  greetingsAndFirstPerson: [
    "안녕하세요",
    "여러분",
    "독자분들",
    "저는",
    "제가",
    "우리",
    "저희가",
  ],
  previewAndWeakClose: [
    "오늘은 ~알아보겠습니다",
    "함께 살펴보시죠",
    "도움이 되셨길",
    "함께 시작해보세요",
    "이웃추가",
  ],
  aphorisms: [
    "숫자는 정직하다",
    "결과는 같았다",
    "그게 진짜 비용이다",
  ],
  adSuspicion: [
    "무료 진단",
    "무료 체험",
    "무료 (단독)",
    "100% 만족",
    "강력 추천",
    "지금 바로 클릭",
  ],
  abstractBan: [
    "최고의",
    "최적의",
    "혁신적인",
    "강력한",
    "완벽한",
    "효율적인",
  ],
  aiPatterns: [
    "접속사 남발(또한/더불어) 단락 2회+",
    "결론 신호어 글 전체 2회+",
    "첫째/둘째/셋째 정형",
    "단락 길이 균일",
  ],
  firstPersonReview: "1인칭 후기 금지 — CS쉐어링·진단 데이터·셀러 사례로",
  preferredCta: "사례집 다운로드, 도입 상담 신청 (무료 단독 금지)",
} as const;

export const NAVER_BLOG_OUTPUT_REQUIREMENTS = {
  instruction:
    "스마트에디터 복사용. Google Drive URL·업로드 완료·MCP 결과 생성 금지.",
  sections: [
    { name: "제목", rules: "22~28자, 메인 키워드 맨 앞" },
    {
      name: "본문",
      rules: "5단 구조, 이모지 5~8, 공백 제외 2,000~2,500자, 메타/마크다운 없음",
    },
    { name: "추천 태그", rules: "3~5개 #키워드" },
    { name: "대체 제목", rules: "2~3개 (A키워드+숫자 / B문제 / C방법론)" },
    {
      name: "이미지 삽입 제안",
      rules: "8~13행 표: 위치|유형|내용|캡션키워드. URL 없음",
    },
  ],
  template: `제목
(메인안)

본문
(순수 텍스트)

추천 태그
#...

대체 제목
A: ...
B: ...
C: ...

이미지 삽입 제안
| 위치 | 유형 | 이미지 내용 | 캡션 권장 키워드 |`,
  doNotGenerate: [
    "Google Drive URL",
    "업로드 완료 문구",
    "computer:// 경로",
    "시트/MCP/하네스 자동 실행 로그",
  ],
} as const;

export const NAVER_BLOG_QUALITY_CHECKLIST = {
  instruction: "작성 후 자기점검, 위반 시 수정 후 출력",
  quantitative: [
    "본문 2,000~2,500자(공백 제외)",
    "제목 22~28자",
    "메인 키워드 5~8회",
    "서브 2~3개 각 2~4회",
    "소제목 4~6, 이모지 5~8, 태그 3~5",
    "CTA 중간+마지막",
  ],
  absoluteScan: [
    "메타/마크다운 0건",
    "안녕하세요/여러분/저는 0건",
    "격언·광고 표현 0건",
  ],
  recatchStyle: [
    "도입 이모지+훅",
    "📑 목차 일치",
    "종결 격식 65~85%",
    "첫째/둘째 패턴 없음",
  ],
  selfReport: "[자기점검] 글자수·이모지 수·키워드 횟수 3줄 이내",
} as const;

export function formatNaverBlogGuideForPrompt(): string {
  const t = NAVER_BLOG_MASTER_TONE;
  const s = NAVER_BLOG_SEO_RULES;
  const st = NAVER_BLOG_STRUCTURE_RULES;
  const h = NAVER_BLOG_HOOK_PATTERNS;
  const e = NAVER_BLOG_EMOJI_RULES;
  const w = NAVER_BLOG_BANNED_PREFERRED_WORDS;
  const o = NAVER_BLOG_OUTPUT_REQUIREMENTS;
  const q = NAVER_BLOG_QUALITY_CHECKLIST;

  return `${NAVER_BLOG_GUIDE_BLOCK_TITLE} (${NAVER_BLOG_GUIDE_VERSION})

■ 마스터 톤: ${t.summary}
- 도입(${t.sections.intro.length}): ${t.sections.intro.toneMix}
- 본문(${t.sections.body.length}): ${t.sections.body.toneMix}
- CTA: ${t.sections.cta.placement}
- 종결: ${t.endingMixTargets.formal} / ${t.endingMixTargets.friendly}
- 신뢰 동사: ${t.trustedVerbs.join(", ")}

■ SEO (${s.platform})
- 본문: ${s.bodyLength.target}
- 제목: ${s.title.length}, ${s.title.mainKeyword}
- 메인 키워드: ${s.mainKeyword.count}, ${s.mainKeyword.max}
- 서브: ${s.subKeywords.count}, ${s.subKeywords.eachFrequency}
- 태그: ${s.tags.count} | 이미지: ${s.images.count} | 소제목: ${s.headings.count}

■ 5단 구조
${st.fiveStepFlow.map((x) => `${x.step}. ${x.name}(${x.length}): ${x.content}`).join("\n")}
목차 예:
${st.tocFormatExample}
${st.paragraphRules.join(" / ")}
${st.listPatternAvoid}

■ 도입 훅: ${h.instruction}
${h.patterns.map((p) => `[${p.name}]\n${p.template}`).join("\n\n")}
금지: ${h.forbiddenOpenings.join(", ")}

■ 이모지: ${e.total}
${e.placement.map((p) => `${p.location}: ${p.emojis} (${p.count})`).join("\n")}
금지: ${e.forbidden.join(" / ")}

■ 금지 표현
메타: ${w.metaInBody.join(", ")}
인사·1인칭: ${w.greetingsAndFirstPerson.join(", ")}
광고: ${w.adSuspicion.join(", ")}
${w.firstPersonReview}
AI패턴 회피: ${w.aiPatterns.join(" / ")}

■ 출력 형식: ${o.instruction}
${o.sections.map((x) => `- ${x.name}: ${x.rules}`).join("\n")}

${o.template}

생성 금지: ${o.doNotGenerate.join(", ")}

■ 자기점검: ${q.instruction}
${q.quantitative.join(" / ")}
${q.selfReport}`;
}

export function isNaverBlogGuideIncluded(prompt: string): boolean {
  return prompt.includes(NAVER_BLOG_GUIDE_MARKER);
}
