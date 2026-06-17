"use client";

import { useCallback, useState } from "react";

import { ChannelOutput } from "@/components/ChannelOutput";
import { ChannelTabs } from "@/components/ChannelTabs";
import { DraftPanel } from "@/components/DraftPanel";
import { GenerationControls } from "@/components/GenerationControls";
import { RightPanel } from "@/components/RightPanel";
import { useContentState } from "@/hooks/useContentState";
import { useGeneration } from "@/hooks/useGeneration";
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
  const { state, dispatch, addLog, hasHydrated } = useContentState();
  const [toast, setToast] = useState<string | null>(null);
  const [savingChannels, setSavingChannels] = useState<Partial<Record<Channel, boolean>>>({});
  const [referencesLoading, setReferencesLoading] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const { generateChannel, generateAll, refineActiveChannel } = useGeneration({
    state,
    dispatch,
    addLog,
    onToast: showToast,
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
        const response = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            contentType: state.contentType,
            goal: state.goal,
            tone: state.tone,
            draft: state.draft,
            content: output.content,
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
    [addLog, dispatch, refreshReferences, showToast, state]
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
