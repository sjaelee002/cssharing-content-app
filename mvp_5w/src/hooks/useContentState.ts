"use client";

import { useCallback, useEffect, useReducer } from "react";

import { createDefaultGlobalRules } from "@/lib/prompts/default-rules";
import { createEmptyBlogEnhancement } from "@/lib/blog/types";
import { createEmptyMagazineEnhancement } from "@/lib/magazine/types";
import { createEmptyInstagramCardnews } from "@/lib/instagram/types";
import { normalizeBlogEnhancement, normalizeVisualAssets } from "@/lib/blog/normalizeVisualAssets";
import {
  clearAllAppLocalStorage,
  formatTime,
  getDefaultPersistedState,
  loadPersistedState,
  savePersistedState,
} from "@/lib/local-storage";
import type {
  BlogEnhancementState,
  Channel,
  ChannelSaveState,
  ContentState,
  ContentType,
  Goal,
  LogEntry,
  LogType,
  MagazineEnhancementState,
  PersistedState,
  RightPanel,
  Rule,
  SavedContentReference,
  Tone,
} from "@/lib/types";

type Action =
  | { type: "HYDRATE"; payload: Partial<ContentState> }
  | { type: "HYDRATE_FROM_STORAGE"; payload: PersistedState }
  | { type: "SET_DRAFT"; payload: string }
  | { type: "SET_CONTENT_TYPE"; payload: ContentType }
  | { type: "SET_GOAL"; payload: Goal }
  | { type: "SET_TONE"; payload: Tone }
  | { type: "SET_ACTIVE_TAB"; payload: Channel }
  | { type: "SET_RIGHT_PANEL"; payload: RightPanel }
  | { type: "SET_RULE_SUB_TAB"; payload: "global" | "channel" }
  | { type: "SET_EDITING_RULE_CH"; payload: Channel }
  | { type: "SET_REFINE_PROMPT"; payload: string }
  | { type: "SET_REFERENCES_ENABLED"; payload: boolean }
  | { type: "SET_AVAILABLE_REFERENCES"; payload: SavedContentReference[] }
  | { type: "TOGGLE_REFERENCE_SELECTION"; payload: string }
  | {
      type: "MARK_CHANNEL_SAVED";
      payload: {
        channel: Channel;
        isHighPerformance: boolean;
        savedAt: string;
        contentId: string;
      };
    }
  | { type: "TOGGLE_GLOBAL_RULE"; payload: string }
  | { type: "REMOVE_GLOBAL_RULE"; payload: string }
  | { type: "ADD_GLOBAL_RULE"; payload: string }
  | { type: "TOGGLE_CHANNEL_RULE"; payload: { channel: Channel; id: string } }
  | { type: "REMOVE_CHANNEL_RULE"; payload: { channel: Channel; id: string } }
  | { type: "ADD_CHANNEL_RULE"; payload: { channel: Channel; text: string } }
  | { type: "SET_CHANNEL_EXTRA"; payload: { channel: Channel; text: string } }
  | { type: "SET_GENERATING"; payload: { channel: Channel; value: boolean } }
  | {
      type: "SET_OUTPUT";
      payload: {
        channel: Channel;
        content: string;
        isRefinement?: boolean;
        instruction?: string;
      };
    }
  | { type: "SET_OUTPUT_ERROR"; payload: { channel: Channel; message: string } }
  | { type: "ROLLBACK_OUTPUT"; payload: Channel }
  | { type: "ADD_LOG"; payload: { msg: string; type?: LogType } }
  | { type: "CLEAR_LOG" }
  | { type: "SET_BLOG_ENHANCEMENT"; payload: Partial<BlogEnhancementState> }
  | { type: "RESET_BLOG_ENHANCEMENT" }
  | {
      type: "SET_MAGAZINE_ENHANCEMENT";
      payload: Partial<MagazineEnhancementState>;
    }
  | { type: "RESET_MAGAZINE_ENHANCEMENT" }
  | { type: "RESET_WORK" }
  | {
      type: "SET_INSTAGRAM_CARDNEWS";
      payload: Partial<import("@/lib/instagram/types").InstagramCardnewsState>;
    };

function createInitialState(): ContentState {
  const defaults = getDefaultPersistedState();
  return {
    ...defaults,
    generating: {},
    rightPanel: "rules",
    log: [],
    refinePrompt: "",
    ruleSubTab: "global",
    editingRuleCh: defaults.activeTab,
    channelSaveState: {},
    referencesEnabled: defaults.referencesEnabled,
    availableReferences: [],
    selectedReferenceIds: defaults.selectedReferenceIds,
    hasHydrated: false,
    blogEnhancement: createEmptyBlogEnhancement(),
    magazineEnhancement: createEmptyMagazineEnhancement(),
    instagramCardnews: createEmptyInstagramCardnews(),
  };
}

function reducer(state: ContentState, action: Action): ContentState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload };

    case "HYDRATE_FROM_STORAGE":
      return {
        ...state,
        draft: action.payload.draft,
        contentType: action.payload.contentType,
        goal: action.payload.goal,
        tone: action.payload.tone,
        activeTab: action.payload.activeTab,
        outputs: action.payload.outputs,
        refinements: action.payload.refinements,
        globalRules: action.payload.globalRules,
        channelRules: action.payload.channelRules,
        channelExtra: action.payload.channelExtra,
        referencesEnabled: action.payload.referencesEnabled,
        selectedReferenceIds: action.payload.selectedReferenceIds,
        editingRuleCh: action.payload.activeTab,
        blogEnhancement: action.payload.blogEnhancement
          ? ({
              ...createEmptyBlogEnhancement(),
              ...normalizeBlogEnhancement(
                action.payload.blogEnhancement as unknown as Record<
                  string,
                  unknown
                >
              ),
              htmlFormatting: false,
              visualGenerating: false,
            } as BlogEnhancementState)
          : createEmptyBlogEnhancement(),
        magazineEnhancement: action.payload.magazineEnhancement
          ? {
              ...createEmptyMagazineEnhancement(),
              ...action.payload.magazineEnhancement,
              htmlFormatting: false,
            }
          : createEmptyMagazineEnhancement(),
        instagramCardnews: action.payload.instagramCardnews
          ? {
              ...createEmptyInstagramCardnews(),
              ...action.payload.instagramCardnews,
              generating: false,
            }
          : createEmptyInstagramCardnews(),
        hasHydrated: true,
      };

    case "SET_DRAFT":
      return { ...state, draft: action.payload };

    case "SET_CONTENT_TYPE":
      return { ...state, contentType: action.payload };

    case "SET_GOAL":
      return { ...state, goal: action.payload };

    case "SET_TONE":
      return { ...state, tone: action.payload };

    case "SET_ACTIVE_TAB":
      return { ...state, activeTab: action.payload };

    case "SET_RIGHT_PANEL":
      return { ...state, rightPanel: action.payload };

    case "SET_RULE_SUB_TAB":
      return { ...state, ruleSubTab: action.payload };

    case "SET_EDITING_RULE_CH":
      return { ...state, editingRuleCh: action.payload };

    case "SET_REFINE_PROMPT":
      return { ...state, refinePrompt: action.payload };

    case "SET_REFERENCES_ENABLED":
      return { ...state, referencesEnabled: action.payload };

    case "SET_AVAILABLE_REFERENCES": {
      const validIds = new Set(action.payload.map((x) => x.id));
      return {
        ...state,
        availableReferences: action.payload,
        selectedReferenceIds: state.selectedReferenceIds.filter((id) =>
          validIds.has(id)
        ),
      };
    }

    case "TOGGLE_REFERENCE_SELECTION": {
      const selected = new Set(state.selectedReferenceIds);
      if (selected.has(action.payload)) {
        selected.delete(action.payload);
      } else {
        selected.add(action.payload);
      }
      return { ...state, selectedReferenceIds: Array.from(selected) };
    }

    case "MARK_CHANNEL_SAVED": {
      const nextSaveState: ChannelSaveState = {
        saved: true,
        isHighPerformance: action.payload.isHighPerformance,
        savedAt: action.payload.savedAt,
        contentId: action.payload.contentId,
      };
      return {
        ...state,
        channelSaveState: {
          ...state.channelSaveState,
          [action.payload.channel]: nextSaveState,
        },
      };
    }

    case "TOGGLE_GLOBAL_RULE":
      return {
        ...state,
        globalRules: state.globalRules.map((r) =>
          r.id === action.payload ? { ...r, enabled: !r.enabled } : r
        ),
      };

    case "REMOVE_GLOBAL_RULE":
      return {
        ...state,
        globalRules: state.globalRules.filter((r) => r.id !== action.payload),
      };

    case "ADD_GLOBAL_RULE":
      return {
        ...state,
        globalRules: [
          ...state.globalRules,
          { id: `gr_${Date.now()}`, text: action.payload, enabled: true },
        ],
      };

    case "TOGGLE_CHANNEL_RULE": {
      const { channel, id } = action.payload;
      const rules = state.channelRules[channel] || [];
      return {
        ...state,
        channelRules: {
          ...state.channelRules,
          [channel]: rules.map((r) =>
            r.id === id ? { ...r, enabled: !r.enabled } : r
          ),
        },
      };
    }

    case "REMOVE_CHANNEL_RULE": {
      const { channel, id } = action.payload;
      const rules = state.channelRules[channel] || [];
      return {
        ...state,
        channelRules: {
          ...state.channelRules,
          [channel]: rules.filter((r) => r.id !== id),
        },
      };
    }

    case "ADD_CHANNEL_RULE": {
      const { channel, text } = action.payload;
      const rules = state.channelRules[channel] || [];
      const newRule: Rule = {
        id: `cr_${Date.now()}`,
        text,
        enabled: true,
      };
      return {
        ...state,
        channelRules: {
          ...state.channelRules,
          [channel]: [...rules, newRule],
        },
      };
    }

    case "SET_CHANNEL_EXTRA":
      return {
        ...state,
        channelExtra: {
          ...state.channelExtra,
          [action.payload.channel]: action.payload.text,
        },
      };

    case "SET_GENERATING":
      return {
        ...state,
        generating: {
          ...state.generating,
          [action.payload.channel]: action.payload.value,
        },
      };

    case "SET_OUTPUT": {
      const { channel, content, isRefinement, instruction } = action.payload;
      const prev = state.outputs[channel] || {
        content: "",
        ts: "",
        history: [],
      };
      const ts = new Date().toLocaleTimeString("ko-KR");
      let history = prev.history;
      let refinements = state.refinements;

      if (isRefinement && prev.content && !prev.content.startsWith("생성 실패")) {
        history = [
          ...prev.history,
          {
            content: prev.content,
            ts: prev.ts,
            instruction,
          },
        ];
        const existing = state.refinements[channel] || [];
        const next = instruction
          ? [...existing, instruction].slice(-10)
          : existing;
        refinements = { ...state.refinements, [channel]: next };
      }

      return {
        ...state,
        refinements,
        outputs: {
          ...state.outputs,
          [channel]: { content, ts, history },
        },
        channelSaveState: {
          ...state.channelSaveState,
          [channel]: { saved: false, isHighPerformance: false },
        },
        ...(channel === "Blog"
          ? { blogEnhancement: createEmptyBlogEnhancement() }
          : {}),
        ...(channel === "Magazine"
          ? { magazineEnhancement: createEmptyMagazineEnhancement() }
          : {}),
      };
    }

    case "SET_OUTPUT_ERROR": {
      const { channel, message } = action.payload;
      const prev = state.outputs[channel] || {
        content: "",
        ts: "",
        history: [],
      };
      return {
        ...state,
        outputs: {
          ...state.outputs,
          [channel]: {
            ...prev,
            content: `생성 실패\n\n${message}`,
            ts: new Date().toLocaleTimeString("ko-KR"),
          },
        },
        channelSaveState: {
          ...state.channelSaveState,
          [channel]: { saved: false, isHighPerformance: false },
        },
        ...(channel === "Blog"
          ? { blogEnhancement: createEmptyBlogEnhancement() }
          : {}),
        ...(channel === "Magazine"
          ? { magazineEnhancement: createEmptyMagazineEnhancement() }
          : {}),
      };
    }

    case "ROLLBACK_OUTPUT": {
      const channel = action.payload;
      const out = state.outputs[channel];
      if (!out?.history.length) {
        return state;
      }
      const prev = out.history[out.history.length - 1];
      return {
        ...state,
        outputs: {
          ...state.outputs,
          [channel]: {
            content: prev.content,
            ts: prev.ts,
            history: out.history.slice(0, -1),
          },
        },
        channelSaveState: {
          ...state.channelSaveState,
          [channel]: { saved: false, isHighPerformance: false },
        },
        ...(channel === "Blog"
          ? { blogEnhancement: createEmptyBlogEnhancement() }
          : {}),
        ...(channel === "Magazine"
          ? { magazineEnhancement: createEmptyMagazineEnhancement() }
          : {}),
      };
    }

    case "ADD_LOG": {
      const entry: LogEntry = {
        id: Date.now(),
        time: formatTime(),
        msg: action.payload.msg,
        type: action.payload.type ?? "info",
      };
      return {
        ...state,
        log: [entry, ...state.log].slice(0, 80),
      };
    }

    case "CLEAR_LOG":
      return { ...state, log: [] };

    case "SET_BLOG_ENHANCEMENT": {
      const nextPayload = { ...action.payload };
      if (nextPayload.visualAssets !== undefined) {
        nextPayload.visualAssets = normalizeVisualAssets(
          nextPayload.visualAssets,
          nextPayload.visualOutputMode ?? state.blogEnhancement.visualOutputMode
        );
      }
      return {
        ...state,
        blogEnhancement: {
          ...state.blogEnhancement,
          ...nextPayload,
        },
      };
    }

    case "RESET_BLOG_ENHANCEMENT":
      return {
        ...state,
        blogEnhancement: createEmptyBlogEnhancement(),
      };

    case "SET_MAGAZINE_ENHANCEMENT":
      return {
        ...state,
        magazineEnhancement: {
          ...state.magazineEnhancement,
          ...action.payload,
        },
      };

    case "RESET_MAGAZINE_ENHANCEMENT":
      return {
        ...state,
        magazineEnhancement: createEmptyMagazineEnhancement(),
      };

    case "RESET_WORK":
      return {
        ...createInitialState(),
        hasHydrated: true,
      };

    case "SET_INSTAGRAM_CARDNEWS":
      return {
        ...state,
        instagramCardnews: {
          ...state.instagramCardnews,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

export function useContentState() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    const persisted = loadPersistedState();
    dispatch({ type: "HYDRATE_FROM_STORAGE", payload: persisted });
    dispatch({
      type: "ADD_LOG",
      payload: { msg: "시스템 초기화 완료.", type: "info" },
    });
  }, []);

  useEffect(() => {
    if (!state.hasHydrated) {
      return;
    }

    savePersistedState({
      draft: state.draft,
      contentType: state.contentType,
      goal: state.goal,
      tone: state.tone,
      activeTab: state.activeTab,
      outputs: state.outputs,
      refinements: state.refinements,
      globalRules: state.globalRules,
      channelRules: state.channelRules,
      channelExtra: state.channelExtra,
      referencesEnabled: state.referencesEnabled,
      selectedReferenceIds: state.selectedReferenceIds,
      blogEnhancement: {
        blogContentRaw: state.blogEnhancement.blogContentRaw,
        blogContentHtml: state.blogEnhancement.blogContentHtml,
        blogParsed: state.blogEnhancement.blogParsed,
      },
      magazineEnhancement: {
        magazineContentRaw: state.magazineEnhancement.magazineContentRaw,
        magazineContentHtml: state.magazineEnhancement.magazineContentHtml,
        magazineParsed: state.magazineEnhancement.magazineParsed,
      },
      instagramCardnews: {
        storyboard: state.instagramCardnews.storyboard,
        cardnewsHtml: state.instagramCardnews.cardnewsHtml,
        caption: state.instagramCardnews.caption,
        hashtags: state.instagramCardnews.hashtags,
        selfReview: state.instagramCardnews.selfReview,
        model: state.instagramCardnews.model,
      },
    });
  }, [
    state.hasHydrated,
    state.draft,
    state.contentType,
    state.goal,
    state.tone,
    state.activeTab,
    state.outputs,
    state.refinements,
    state.globalRules,
    state.channelRules,
    state.channelExtra,
    state.referencesEnabled,
    state.selectedReferenceIds,
    state.blogEnhancement.blogContentRaw,
    state.blogEnhancement.blogContentHtml,
    state.blogEnhancement.blogParsed,
    state.magazineEnhancement.magazineContentRaw,
    state.magazineEnhancement.magazineContentHtml,
    state.magazineEnhancement.magazineParsed,
    state.instagramCardnews.storyboard,
    state.instagramCardnews.cardnewsHtml,
    state.instagramCardnews.caption,
    state.instagramCardnews.hashtags,
    state.instagramCardnews.selfReview,
    state.instagramCardnews.model,
  ]);

  const addLog = useCallback((msg: string, type: LogType = "info") => {
    dispatch({ type: "ADD_LOG", payload: { msg, type } });
  }, []);

  const resetGlobalRules = useCallback(() => {
    dispatch({
      type: "HYDRATE",
      payload: { globalRules: createDefaultGlobalRules() },
    });
  }, []);

  const resetWork = useCallback(() => {
    clearAllAppLocalStorage();
    dispatch({ type: "RESET_WORK" });
    dispatch({
      type: "ADD_LOG",
      payload: { msg: "작업이 초기화되었습니다.", type: "info" },
    });
  }, []);

  return {
    state,
    dispatch,
    addLog,
    resetGlobalRules,
    resetWork,
    hasHydrated: state.hasHydrated,
  };
}
