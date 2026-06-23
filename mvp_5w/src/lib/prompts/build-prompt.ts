import { BASE_PROMPTS } from "@/lib/prompts/base-prompts";
import type { BlogChannelSource } from "@/lib/blog/getBlogContentForStorage";
import {
  formatNaverBlogGuideForPrompt,
  NAVER_BLOG_GUIDE_VERSION,
} from "@/lib/prompts/channel-guides/naver-blog-guide";
import type { Channel, PromptContext } from "@/lib/types";

export const BLOG_NAVER_GUIDE_VERSION = NAVER_BLOG_GUIDE_VERSION;

import {
  MAGAZINE_EMOJI_PROMPT_RULES,
  MAGAZINE_STRUCTURE_PROMPT_RULES,
} from "@/lib/magazine/emojiRules";

const MAGAZINE_FROM_BLOG_RULES = `■ 홈페이지 매거진 작성 규칙 (네이버 블로그 clean content 기반)
- 아래 source는 블로그 제목+본문만 포함하며, 블로그 이모티콘은 제거된 상태입니다.
- 네이버 블로그 본문을 홈페이지 매거진 톤으로 재작성하세요.
- 블로그 원문의 이모티콘·블로그식 감탄·태그·자기점검 문구는 그대로 가져오지 마세요.
- 공식 홈페이지에 올라가는 전문 콘텐츠 톤으로 작성하세요.
- 원문에 없는 수치, 사례, 회사명, KPI를 새로 만들지 마세요.
- 블로그 원문에 이미 포함된 수치는 유지할 수 있으나, 새로운 수치로 확장하지 마세요.
- 저장용 출력에는 Markdown/HTML 서식, 표 문법, 시각화 placeholder를 넣지 마세요. 순수 텍스트만 작성하세요.

${MAGAZINE_EMOJI_PROMPT_RULES}

${MAGAZINE_STRUCTURE_PROMPT_RULES}`;

const DOWNSTREAM_FROM_BLOG_RULES = `■ 소스 사용 규칙
- 아래 네이버 블로그 clean content(제목+본문, 이모티콘 제거됨)를 primary source로 사용하세요.
- 추천 태그, 대체 제목, 시각화 자료 삽입 제안, 자기점검은 source에 없습니다.
- 블로그 본문에 없는 메타 정보를 생성하지 마세요.
- 각 채널 고정 프롬프트의 톤·길이·출력 규칙을 따르세요.`;

const SOCIAL_FROM_BLOG_INSTRUCTION: Record<
  "Instagram" | "Facebook" | "LinkedIn",
  string
> = {
  Instagram:
    "위 네이버 블로그 본문을 Instagram 캡션으로 짧게 재작성하세요. 채널 라벨·Markdown heading·구분선 없이 캡션만 출력하세요.",
  Facebook:
    "위 네이버 블로그 본문을 Facebook 포스트로 재작성하세요. 채널 라벨·Markdown heading·구분선 없이 본문만 출력하세요.",
  LinkedIn:
    "위 네이버 블로그 본문을 LinkedIn 포스트로 재작성하세요. 첫 줄은 임팩트 있게, Markdown heading·구분선·강조 기호 없이 출력하세요.",
};

function formatBlogSourceSection(blogSource: BlogChannelSource): string {
  const titleLine = blogSource.title
    ? `제목: ${blogSource.title}\n`
    : "";
  return `[네이버 블로그 본문 - 이 내용을 기반으로 작성]
${titleLine}본문:
${blogSource.body}`;
}

export function buildPrompt(
  channel: Channel,
  ctx: PromptContext,
  extraInstruction?: string,
  blogSource?: BlogChannelSource | null
): string {
  const base =
    BASE_PROMPTS[channel] ||
    `당신은 콘텐츠 전문가입니다.\n톤: {tone} | 유형: {contentType} | 목표: {goal}`;

  let prompt = base
    .replace(/\{tone\}/g, ctx.tone)
    .replace(/\{contentType\}/g, ctx.contentType)
    .replace(/\{goal\}/g, ctx.goal);

  if (channel === "Blog") {
    prompt += `\n\n${formatNaverBlogGuideForPrompt()}`;
  }

  if (channel === "Magazine") {
    prompt += `\n\n${MAGAZINE_FROM_BLOG_RULES}`;
  }

  const globalRules = ctx.globalRules
    .filter((r) => r.enabled)
    .map((r) => `- ${r.text}`);
  const channelRules = (ctx.channelRules[channel] || [])
    .filter((r) => r.enabled)
    .map((r) => `- ${r.text}`);

  if (globalRules.length > 0 || channelRules.length > 0) {
    prompt += "\n\n[규칙]";
    if (globalRules.length > 0) {
      prompt += `\n${globalRules.join("\n")}`;
    }
    if (channelRules.length > 0) {
      prompt += `\n\n[${channel} 채널 전용 규칙]\n${channelRules.join("\n")}`;
    }
  }

  const extra = (ctx.channelExtra[channel] || "").trim();
  if (extra) {
    prompt += `\n\n[${channel} 추가 지시사항]\n${extra}`;
  }

  const refinements = (ctx.refinements[channel] || []).slice(-3);
  if (refinements.length > 0) {
    prompt += "\n\n[이전 고도화 지시사항 - 반영해주세요]";
    refinements.forEach((r, i) => {
      prompt += `\n${i + 1}. ${r}`;
    });
  }

  const references = (ctx.references || []).slice(0, 5);
  if (references.length > 0) {
    prompt += "\n\n[고성과 참고자료 - 아래 스타일/구조를 참고해 반영해주세요]";
    references.forEach((ref, i) => {
      prompt += `\n\n(참고 ${i + 1})`;
      prompt += `\n- 채널: ${ref.channel}`;
      if (ref.contentType) {
        prompt += `\n- 유형: ${ref.contentType}`;
      }
      if (ref.goal) {
        prompt += `\n- 목표: ${ref.goal}`;
      }
      if (ref.tone) {
        prompt += `\n- 톤: ${ref.tone}`;
      }
      prompt += `\n- 본문:\n${ref.content}`;
    });
  }

  prompt += `\n\n[초안 - 이 내용을 기반으로 작성]\n${ctx.draft}\n\n위 초안의 핵심 메시지를 살려 완성해주세요.`;

  if (channel === "Magazine" && blogSource) {
    prompt = prompt.replace(
      `\n\n[초안 - 이 내용을 기반으로 작성]\n${ctx.draft}\n\n위 초안의 핵심 메시지를 살려 완성해주세요.`,
      `\n\n${formatBlogSourceSection(blogSource)}\n\n위 네이버 블로그 본문을 홈페이지 매거진 톤으로 재작성하세요.`
    );
  } else if (
    blogSource &&
    (channel === "Instagram" ||
      channel === "Facebook" ||
      channel === "LinkedIn")
  ) {
    prompt = prompt.replace(
      `\n\n[초안 - 이 내용을 기반으로 작성]\n${ctx.draft}\n\n위 초안의 핵심 메시지를 살려 완성해주세요.`,
      `\n\n${formatBlogSourceSection(blogSource)}\n\n${DOWNSTREAM_FROM_BLOG_RULES}\n\n${SOCIAL_FROM_BLOG_INSTRUCTION[channel]}`
    );
  }

  if (extraInstruction?.trim()) {
    prompt += `\n\n[이번 고도화 지시사항]\n${extraInstruction}`;
  }

  return prompt;
}
