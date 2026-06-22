import { createDefaultGlobalRules } from "@/lib/prompts/default-rules";
import { normalizeBlogEnhancement } from "@/lib/blog/normalizeVisualAssets";
import type { Channel, ContentState, PersistedState } from "@/lib/types";

const STORAGE_KEY = "cssharing-content-os-v1";
const APP_STORAGE_PREFIX = "cssharing-";

export function getDefaultPersistedState(): PersistedState {
  return {
    draft: "",
    contentType: "인사이트",
    goal: "참여도",
    tone: "전문적",
    activeTab: "Blog",
    outputs: {},
    refinements: {},
    globalRules: createDefaultGlobalRules(),
    channelRules: {},
    channelExtra: {},
    referencesEnabled: false,
    selectedReferenceIds: [],
    blogEnhancement: undefined,
  };
}

export function loadPersistedState(): PersistedState {
  if (typeof window === "undefined") {
    return getDefaultPersistedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultPersistedState();
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const blogEnhancement = normalizeBlogEnhancement(
      parsed.blogEnhancement as Record<string, unknown> | undefined
    ) as PersistedState["blogEnhancement"];

    return {
      ...getDefaultPersistedState(),
      ...parsed,
      globalRules: parsed.globalRules?.length
        ? parsed.globalRules
        : createDefaultGlobalRules(),
      blogEnhancement,
    };
  } catch {
    return getDefaultPersistedState();
  }
}

export function savePersistedState(state: PersistedState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** 앱 관련 localStorage 키를 모두 제거합니다. */
export function clearAllAppLocalStorage(): void {
  if (typeof window === "undefined") {
    return;
  }

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

export function toPromptContext(state: ContentState) {
  const selectedReferences = state.referencesEnabled
    ? state.availableReferences.filter((r) =>
        state.selectedReferenceIds.includes(r.id)
      )
    : [];

  return {
    draft: state.draft,
    contentType: state.contentType,
    goal: state.goal,
    tone: state.tone,
    globalRules: state.globalRules,
    channelRules: state.channelRules,
    channelExtra: state.channelExtra,
    refinements: state.refinements,
    references: selectedReferences,
  };
}

export function formatTime(): string {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function uid(): string {
  return `id_${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidOutput(content: string | undefined): boolean {
  return Boolean(content && !content.startsWith("생성 실패"));
}

export function emptyChannelOutput(): {
  content: string;
  ts: string;
  history: [];
} {
  return { content: "", ts: "", history: [] };
}

export type { Channel };
