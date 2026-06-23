"use client";

import { useCallback, useEffect, useState } from "react";

import { AccessGate } from "@/components/AccessGate";
import { BlogOutputPanel } from "@/components/blog/BlogOutputPanel";
import { MagazineOutputPanel } from "@/components/magazine/MagazineOutputPanel";
import { InstagramOutputPanel } from "@/components/instagram/InstagramOutputPanel";
import { SocialOutputPanel } from "@/components/social/SocialOutputPanel";
import { ChannelOutput } from "@/components/ChannelOutput";
import { ChannelTabs } from "@/components/ChannelTabs";
import { DraftPanel } from "@/components/DraftPanel";
import { GenerationControls } from "@/components/GenerationControls";
import { RightPanel } from "@/components/RightPanel";
import { useContentState } from "@/hooks/useContentState";
import { useBlogEnhancement } from "@/hooks/useBlogEnhancement";
import { useMagazineEnhancement } from "@/hooks/useMagazineEnhancement";
import { useInstagramCardnews } from "@/hooks/useInstagramCardnews";
import { useGeneration } from "@/hooks/useGeneration";
import { getBlogContentForStorage } from "@/lib/blog/getBlogContentForStorage";
import { getMagazineContentForStorage } from "@/lib/magazine/sanitizeMagazineRaw";
import {
  getSocialContentForStorage,
  isSocialChannel,
} from "@/lib/social/sanitizeSocialContent";
import type {
  Channel,
  ContentType,
  Goal,
  RightPanel as RightPanelTab,
  SavedContentReference,
  Tone,
} from "@/lib/types";

async function fetchHighPerformanceReferences(limit = 20) {
  const response = await fetch(`/api/references?limit=${limit}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const data = (await response.json()) as {
    items?: SavedContentReference[];
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error || "참고자료 조회에 실패했습니다.");
  }
  return data.items || [];
}

export default function HomePage() {
  return (
    <AccessGate>
      <ContentOsApp />
    </AccessGate>
  );
}

function ContentOsApp() {
  const { state, dispatch, addLog, hasHydrated, resetWork } = useContentState();
  const [toast, setToast] = useState<string | null>(null);
  const [savingChannels, setSavingChannels] = useState<Partial<Record<Channel, boolean>>>({});
  const [referencesLoading, setReferencesLoading] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const { processBlogContent } = useBlogEnhancement({
      dispatch,
      addLog,
      onToast: showToast,
    });

  const { processMagazineContent } = useMagazineEnhancement({
    dispatch,
    addLog,
    onToast: showToast,
  });

  const { generateCardnews } = useInstagramCardnews({
    dispatch,
    addLog,
    onToast: showToast,
  });

  const { generateChannel, generateAll, refineActiveChannel } = useGeneration({
    state,
    dispatch,
    addLog,
    onToast: showToast,
    onBlogGenerated: processBlogContent,
    onMagazineGenerated: (content) =>
      processMagazineContent(content, state.blogEnhancement),
  });

  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast("📋 복사되었습니다!");
      } catch {
        showToast("⚠️ 복사 실패");
      }
    },
    [showToast]
  );

  const handleCopyHtml = useCallback(
    async (html: string) => {
      try {
        const blob = new Blob([html], { type: "text/html" });
        const plainBlob = new Blob(
          [html.replace(/<[^>]+>/g, "")],
          { type: "text/plain" }
        );
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blob,
            "text/plain": plainBlob,
          }),
        ]);
        showToast("📋 HTML 서식 포함 복사되었습니다!");
      } catch {
        try {
          await navigator.clipboard.writeText(html);
          showToast("📋 HTML 복사되었습니다!");
        } catch {
          showToast("⚠️ 복사 실패");
        }
      }
    },
    [showToast]
  );

  const handleBlogRollback = useCallback(() => {
    const out = state.outputs.Blog;
    if (!out?.history.length) {
      return;
    }
    const prev = out.history[out.history.length - 1];
    dispatch({ type: "ROLLBACK_OUTPUT", payload: "Blog" });
    void processBlogContent(prev.content);
  }, [dispatch, processBlogContent, state.outputs.Blog]);

  const handleMagazineRollback = useCallback(() => {
    const out = state.outputs.Magazine;
    if (!out?.history.length) {
      return;
    }
    const prev = out.history[out.history.length - 1];
    dispatch({ type: "ROLLBACK_OUTPUT", payload: "Magazine" });
    void processMagazineContent(prev.content, state.blogEnhancement);
  }, [dispatch, processMagazineContent, state.blogEnhancement, state.outputs.Magazine]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    const blogOutput = state.outputs.Blog?.content;
    if (!blogOutput || blogOutput.startsWith("생성 실패")) {
      return;
    }
    if (
      state.blogEnhancement.blogContentRaw === blogOutput &&
      state.blogEnhancement.blogContentHtml
    ) {
      return;
    }
    void processBlogContent(blogOutput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    const magazineOutput = state.outputs.Magazine?.content;
    if (!magazineOutput || magazineOutput.startsWith("생성 실패")) {
      return;
    }
    if (
      state.magazineEnhancement.magazineContentRaw &&
      state.magazineEnhancement.magazineContentHtml
    ) {
      return;
    }
    void processMagazineContent(magazineOutput, state.blogEnhancement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  const resolveContentForSave = useCallback(
    (channel: Channel, outputContent: string): string => {
      if (channel === "Blog") {
        return getBlogContentForStorage(
          outputContent,
          state.blogEnhancement
        );
      }
      if (channel === "Magazine") {
        return getMagazineContentForStorage(
          state.magazineEnhancement,
          outputContent
        );
      }
      if (isSocialChannel(channel)) {
        return getSocialContentForStorage(channel, outputContent);
      }
      return outputContent;
    },
    [state.blogEnhancement, state.magazineEnhancement]
  );

  const refreshReferences = useCallback(async () => {
    setReferencesLoading(true);
    try {
      const items = await fetchHighPerformanceReferences(20);
      dispatch({ type: "SET_AVAILABLE_REFERENCES", payload: items });
      addLog(`고성과 참고자료 ${items.length}개 불러옴`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "참고자료 조회 실패";
      addLog(`참고자료 조회 오류: ${message}`, "error");
      showToast(`❌ ${message}`);
    } finally {
      setReferencesLoading(false);
    }
  }, [addLog, dispatch, showToast]);

  const handleSaveChannel = useCallback(
    async (channel: Channel, isHighPerformance: boolean) => {
      const output = state.outputs[channel];
      if (!output?.content || output.content.startsWith("생성 실패")) {
        showToast("⚠️ 저장할 콘텐츠가 없습니다.");
        return;
      }

      setSavingChannels((prev) => ({ ...prev, [channel]: true }));
      try {
        const contentToSave = resolveContentForSave(channel, output.content);
        const response = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            contentType: state.contentType,
            goal: state.goal,
            tone: state.tone,
            draft: state.draft,
            content: contentToSave,
            isHighPerformance,
          }),
        });

        const data = (await response.json()) as {
          id?: string;
          createdAt?: string;
          isHighPerformance?: boolean;
          error?: string;
        };

        if (!response.ok || !data.id || !data.createdAt) {
          throw new Error(data.error || "저장에 실패했습니다.");
        }

        dispatch({
          type: "MARK_CHANNEL_SAVED",
          payload: {
            channel,
            savedAt: data.createdAt,
            contentId: data.id,
            isHighPerformance: Boolean(data.isHighPerformance),
          },
        });

        const message = data.isHighPerformance
          ? "⭐ 고성과 글로 저장되었습니다."
          : "💾 저장되었습니다.";
        addLog(`${channel} ${message}`, "success");
        showToast(message);

        if (data.isHighPerformance) {
          await refreshReferences();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "저장 실패";
        addLog(`${channel} 저장 오류: ${message}`, "error");
        showToast(`❌ 저장 실패: ${message}`);
      } finally {
        setSavingChannels((prev) => ({ ...prev, [channel]: false }));
      }
    },
    [addLog, dispatch, refreshReferences, resolveContentForSave, showToast, state]
  );

  const handleToggleReferencesEnabled = useCallback(() => {
    dispatch({
      type: "SET_REFERENCES_ENABLED",
      payload: !state.referencesEnabled,
    });
  }, [dispatch, state.referencesEnabled]);

  const handleRightPanelChange = useCallback(
    (panel: RightPanelTab) => {
      dispatch({ type: "SET_RIGHT_PANEL", payload: panel });
      if (panel === "references" && state.availableReferences.length === 0) {
        void refreshReferences();
      }
    },
    [dispatch, refreshReferences, state.availableReferences.length]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-header">
          <div className="logo-icon" aria-hidden>
            ◎
          </div>
          <div>
            <h1>콘텐츠 운영 OS</h1>
            <p>Claude · MVP Step 1~4</p>
          </div>
        </header>
        <div className="sidebar-scroll">
          <DraftPanel
            draft={state.draft}
            onDraftChange={(value) =>
              dispatch({ type: "SET_DRAFT", payload: value })
            }
            onResetWork={resetWork}
          />
          <GenerationControls
            draft={state.draft}
            hasHydrated={hasHydrated}
            contentType={state.contentType}
            goal={state.goal}
            tone={state.tone}
            generating={state.generating}
            onContentTypeChange={(value: ContentType) =>
              dispatch({ type: "SET_CONTENT_TYPE", payload: value })
            }
            onGoalChange={(value: Goal) =>
              dispatch({ type: "SET_GOAL", payload: value })
            }
            onToneChange={(value: Tone) =>
              dispatch({ type: "SET_TONE", payload: value })
            }
            onGenerateAll={generateAll}
            onGenerateChannel={generateChannel}
          />
        </div>
      </aside>

      <main className="center-panel">
        <ChannelTabs
          activeTab={state.activeTab}
          goal={state.goal}
          hasHydrated={hasHydrated}
          outputs={state.outputs}
          generating={state.generating}
          onTabChange={(channel: Channel) =>
            dispatch({ type: "SET_ACTIVE_TAB", payload: channel })
          }
        />
        <div className="center-body">
          {state.activeTab === "Blog" ? (
            <BlogOutputPanel
              goal={state.goal}
              hasHydrated={hasHydrated}
              output={state.outputs.Blog}
              blogEnhancement={state.blogEnhancement}
              isGenerating={Boolean(state.generating.Blog)}
              isSaving={Boolean(savingChannels.Blog)}
              saveState={state.channelSaveState.Blog}
              onCopyText={handleCopy}
              onCopyHtml={handleCopyHtml}
              onRegenerate={() => generateChannel("Blog")}
              onRollback={handleBlogRollback}
              onSave={(isHighPerformance) =>
                handleSaveChannel("Blog", isHighPerformance)
              }
            />
          ) : state.activeTab === "Magazine" ? (
            <MagazineOutputPanel
              goal={state.goal}
              hasHydrated={hasHydrated}
              output={state.outputs.Magazine}
              magazineEnhancement={state.magazineEnhancement}
              isGenerating={Boolean(state.generating.Magazine)}
              isSaving={Boolean(savingChannels.Magazine)}
              saveState={state.channelSaveState.Magazine}
              onCopyText={handleCopy}
              onCopyHtml={handleCopyHtml}
              onRegenerate={() => generateChannel("Magazine")}
              onRollback={handleMagazineRollback}
              onSave={(isHighPerformance) =>
                handleSaveChannel("Magazine", isHighPerformance)
              }
            />
          ) : state.activeTab === "Instagram" ? (
            <InstagramOutputPanel
              goal={state.goal}
              hasHydrated={hasHydrated}
              output={state.outputs.Instagram}
              blogEnhancement={state.blogEnhancement}
              cardnews={state.instagramCardnews}
              isGenerating={Boolean(state.generating.Instagram)}
              isSaving={Boolean(savingChannels.Instagram)}
              saveState={state.channelSaveState.Instagram}
              onCopy={handleCopy}
              onRegenerate={() => generateChannel("Instagram")}
              onRollback={() =>
                dispatch({ type: "ROLLBACK_OUTPUT", payload: "Instagram" })
              }
              onSave={(isHighPerformance) =>
                handleSaveChannel("Instagram", isHighPerformance)
              }
              onGenerateCardnews={() =>
                generateCardnews(
                  state.blogEnhancement,
                  state.outputs.Instagram?.content,
                  state.tone
                )
              }
            />
          ) : state.activeTab === "Facebook" || state.activeTab === "LinkedIn" ? (
            <SocialOutputPanel
              channel={state.activeTab}
              goal={state.goal}
              hasHydrated={hasHydrated}
              output={state.outputs[state.activeTab]}
              isGenerating={Boolean(state.generating[state.activeTab])}
              isSaving={Boolean(savingChannels[state.activeTab])}
              saveState={state.channelSaveState[state.activeTab]}
              onCopy={handleCopy}
              onRegenerate={() => generateChannel(state.activeTab)}
              onRollback={() =>
                dispatch({ type: "ROLLBACK_OUTPUT", payload: state.activeTab })
              }
              onSave={(isHighPerformance) =>
                handleSaveChannel(state.activeTab, isHighPerformance)
              }
            />
          ) : (
            <ChannelOutput
              channel={state.activeTab}
              goal={state.goal}
              hasHydrated={hasHydrated}
              output={state.outputs[state.activeTab]}
              isGenerating={Boolean(state.generating[state.activeTab])}
              isSaving={Boolean(savingChannels[state.activeTab])}
              saveState={state.channelSaveState[state.activeTab]}
              onCopy={handleCopy}
              onRegenerate={() => generateChannel(state.activeTab)}
              onRollback={() =>
                dispatch({ type: "ROLLBACK_OUTPUT", payload: state.activeTab })
              }
              onSave={(isHighPerformance) =>
                handleSaveChannel(state.activeTab, isHighPerformance)
              }
            />
          )}
        </div>
      </main>

      <RightPanel
        state={state}
        hasHydrated={hasHydrated}
        onRightPanelChange={handleRightPanelChange}
        onRuleSubTabChange={(tab) =>
          dispatch({ type: "SET_RULE_SUB_TAB", payload: tab })
        }
        onEditingRuleChChange={(channel) =>
          dispatch({ type: "SET_EDITING_RULE_CH", payload: channel })
        }
        onToggleGlobalRule={(id) =>
          dispatch({ type: "TOGGLE_GLOBAL_RULE", payload: id })
        }
        onRemoveGlobalRule={(id) =>
          dispatch({ type: "REMOVE_GLOBAL_RULE", payload: id })
        }
        onAddGlobalRule={(text) =>
          dispatch({ type: "ADD_GLOBAL_RULE", payload: text })
        }
        onToggleChannelRule={(channel, id) =>
          dispatch({
            type: "TOGGLE_CHANNEL_RULE",
            payload: { channel, id },
          })
        }
        onRemoveChannelRule={(channel, id) =>
          dispatch({
            type: "REMOVE_CHANNEL_RULE",
            payload: { channel, id },
          })
        }
        onAddChannelRule={(channel, text) =>
          dispatch({
            type: "ADD_CHANNEL_RULE",
            payload: { channel, text },
          })
        }
        onChannelExtraChange={(channel, text) =>
          dispatch({
            type: "SET_CHANNEL_EXTRA",
            payload: { channel, text },
          })
        }
        onRefinePromptChange={(text) =>
          dispatch({ type: "SET_REFINE_PROMPT", payload: text })
        }
        onRefine={() => refineActiveChannel(state.refinePrompt)}
        references={state.availableReferences}
        referencesEnabled={state.referencesEnabled}
        selectedReferenceIds={state.selectedReferenceIds}
        referencesLoading={referencesLoading}
        onToggleReferencesEnabled={handleToggleReferencesEnabled}
        onToggleReferenceSelection={(id) =>
          dispatch({ type: "TOGGLE_REFERENCE_SELECTION", payload: id })
        }
        onRefreshReferences={refreshReferences}
        onClearLog={() => dispatch({ type: "CLEAR_LOG" })}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
