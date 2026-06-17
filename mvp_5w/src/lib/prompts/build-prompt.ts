import { BASE_PROMPTS } from "@/lib/prompts/base-prompts";
import {
  formatNaverBlogGuideForPrompt,
  NAVER_BLOG_GUIDE_VERSION,
} from "@/lib/prompts/channel-guides/naver-blog-guide";
import type { Channel, PromptContext } from "@/lib/types";

export const BLOG_NAVER_GUIDE_VERSION = NAVER_BLOG_GUIDE_VERSION;

export function buildPrompt(
  channel: Channel,
  ctx: PromptContext,
  extraInstruction?: string
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

  if (extraInstruction?.trim()) {
    prompt += `\n\n[이번 고도화 지시사항]\n${extraInstruction}`;
  }

  return prompt;
}
