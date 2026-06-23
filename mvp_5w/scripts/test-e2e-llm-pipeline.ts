/**
 * Blog → Magazine → Social LLM E2E 파이프라인 검증
 * 실행: node --env-file=.env.local --import tsx scripts/test-e2e-llm-pipeline.ts
 *
 * 주의: ANTHROPIC API 호출 및 Supabase insert가 발생합니다. 초안 1개만 사용합니다.
 */
import { createClient } from "@supabase/supabase-js";

import {
  getBlogContentForStorage,
  getBlogSourceForMagazine,
  getBlogSourceForSocial,
} from "../src/lib/blog/getBlogContentForStorage";
import { parseBlogContent } from "../src/lib/blog/parseBlogContent";
import { getMagazineContentForStorage } from "../src/lib/magazine/sanitizeMagazineRaw";
import { parseMagazineContent } from "../src/lib/magazine/parseMagazineContent";
import { buildPrompt } from "../src/lib/prompts/build-prompt";
import {
  formatSocialContentForDisplay,
  getSocialContentForStorage,
} from "../src/lib/social/sanitizeSocialContent";
import type { Channel, PromptContext } from "../src/lib/types";

const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

const TEST_DRAFT = `성수기 콜센터 운영 시 내부 인력만으로는 야간·주말 응대 공백이 생깁니다.
CS 대행 서비스로 필요 시간만 투입해 응답 지연을 줄이는 방법을 정리합니다.
직접 채용과 시간제 서비스의 차이, 도입 시점, 체크 포인트를 비교합니다.`;

const PROMPT_CTX: PromptContext = {
  draft: TEST_DRAFT,
  contentType: "인사이트",
  goal: "전환",
  tone: "전문적",
  globalRules: [],
  channelRules: {},
  channelExtra: {},
  refinements: {},
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function apiGenerate(prompt: string, channel: Channel): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, channel }),
  });
  const data = (await response.json()) as { content?: string; error?: string };
  if (!response.ok || !data.content) {
    throw new Error(data.error || `${channel} 생성 실패 (${response.status})`);
  }
  return data.content;
}

async function apiSave(channel: Channel, content: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel,
      contentType: PROMPT_CTX.contentType,
      goal: PROMPT_CTX.goal,
      tone: PROMPT_CTX.tone,
      draft: TEST_DRAFT,
      content,
    }),
  });
  const data = (await response.json()) as { id?: string; error?: string };
  if (!response.ok || !data.id) {
    throw new Error(data.error || `${channel} 저장 실패 (${response.status})`);
  }
  return data.id;
}

async function fetchSavedContent(id: string): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY가 필요합니다.");
  }
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("contents")
    .select("content")
    .eq("id", id)
    .single();
  if (error || !data?.content) {
    throw new Error(error?.message || "저장된 content 조회 실패");
  }
  return data.content as string;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    console.log("SKIP: ANTHROPIC_API_KEY 없음 — E2E LLM 테스트 생략");
    process.exit(0);
  }

  try {
    const health = await fetch(BASE_URL);
    assert(health.ok, `dev server 응답 없음: ${BASE_URL}`);
  } catch {
    throw new Error(
      `dev server가 실행 중이어야 합니다: npm run dev (${BASE_URL})`
    );
  }

  console.log("E2E: Blog 생성...");
  const blogPrompt = buildPrompt("Blog", PROMPT_CTX);
  const blogOutput = await apiGenerate(blogPrompt, "Blog");
  assert(!blogOutput.startsWith("생성 실패"), "Blog 생성 실패");

  const blogParsed = parseBlogContent(blogOutput);
  const blogEnhancement = { blogParsed };
  const blogStorage = getBlogContentForStorage(blogOutput, blogEnhancement);
  assert(!blogStorage.includes("추천 태그"), "Blog storage: no tags section");
  assert(!blogStorage.includes("[자기점검]"), "Blog storage: no self-check");

  console.log("E2E: Magazine 생성...");
  const magazineSource = getBlogSourceForMagazine(blogEnhancement, blogOutput);
  const magazinePrompt = buildPrompt(
    "Magazine",
    PROMPT_CTX,
    undefined,
    magazineSource
  );
  const magazineOutput = await apiGenerate(magazinePrompt, "Magazine");
  const magazineParsed = parseMagazineContent(magazineOutput);
  const magazineStorage = getMagazineContentForStorage(null, magazineOutput);
  assert(!magazineStorage.includes("<table"), "Magazine storage: no HTML table");
  assert(!magazineStorage.includes("[시각화 자료"), "Magazine storage: no placeholder");

  console.log("E2E: Magazine HTML 포맷...");
  const htmlRes = await fetch(`${BASE_URL}/api/magazine-html-format`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rawText: magazineStorage,
      title: magazineParsed.title,
      visualSuggestions: blogParsed.imageSuggestions,
    }),
  });
  const htmlData = (await htmlRes.json()) as { html?: string; error?: string };
  assert(Boolean(htmlRes.ok && htmlData.html), htmlData.error || "Magazine HTML 실패");
  const magazineHtml = htmlData.html!;
  assert(magazineHtml.includes("magazine-table-wrapper") || !magazineHtml.includes("<table"), "Magazine HTML table ok");
  if (magazineHtml.includes("magazine-faq-section")) {
    const faqIdx = magazineHtml.indexOf("magazine-faq-section");
    const phIdx = magazineHtml.indexOf("magazine-visual-placeholder");
    if (phIdx !== -1) {
      assert(phIdx < faqIdx, "placeholder before FAQ");
    }
  }
  assert(!magazineHtml.includes("#f1ecff"), "Magazine HTML: no purple header");

  const socialSource = getBlogSourceForSocial(blogEnhancement, blogOutput);
  const socialChannels = ["Instagram", "Facebook", "LinkedIn"] as const;
  const socialOutputs: Record<string, string> = {};

  for (const channel of socialChannels) {
    console.log(`E2E: ${channel} 생성...`);
    const prompt = buildPrompt(channel, PROMPT_CTX, undefined, socialSource);
    socialOutputs[channel] = await apiGenerate(prompt, channel);

    const display = formatSocialContentForDisplay(channel, socialOutputs[channel]);
    if (channel === "Facebook") {
      assert(!display.includes("# Facebook"), "Facebook: no channel label");
      assert(!display.includes("---"), "Facebook: no separator");
    }
    if (channel === "LinkedIn") {
      assert(!display.includes("# "), "LinkedIn: no markdown heading");
      assert(!display.includes("---"), "LinkedIn: no separator");
      assert(!display.includes("**"), "LinkedIn: no bold markdown");
    }
  }

  console.log("E2E: Supabase 저장...");
  const blogId = await apiSave("Blog", blogStorage);
  const magazineId = await apiSave("Magazine", magazineStorage);
  const savedBlog = await fetchSavedContent(blogId);
  assert(savedBlog === blogStorage, "Blog saved clean");

  const savedMagazine = await fetchSavedContent(magazineId);
  assert(savedMagazine === magazineStorage, "Magazine saved raw");
  assert(!savedMagazine.includes("<"), "Magazine DB: no HTML");

  for (const channel of socialChannels) {
    const storage = getSocialContentForStorage(channel, socialOutputs[channel]);
    assert(!storage.includes("🔥"), `${channel} storage: no emoji`);
    assert(!storage.includes("# Facebook"), `${channel} storage: no label`);
    const id = await apiSave(channel, storage);
    const saved = await fetchSavedContent(id);
    assert(saved === storage, `${channel} saved clean`);
  }

  console.log("\n✓ E2E LLM pipeline passed (Blog → Magazine → Social + Supabase)");
}

main().catch((err) => {
  console.error("E2E FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
