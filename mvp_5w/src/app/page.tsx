"use client";

import { useCallback, useState } from "react";

import { ChannelOutput } from "@/components/ChannelOutput";
import { ChannelTabs } from "@/components/ChannelTabs";
import { DraftPanel } from "@/components/DraftPanel";
import { GenerationControls } from "@/components/GenerationControls";
import { RightPanel } from "@/components/RightPanel";
import { useContentState } from "@/hooks/useContentState";
import { useGeneration } from "@/hooks/useGeneration";
import type { Channel, ContentType, Goal, RightPanel as RightPanelTab, Tone } from "@/lib/types";

export default function HomePage() {
  const { state, dispatch, addLog } = useContentState();
  const [toast, setToast] = useState<string | null>(null);

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
            output={state.outputs[state.activeTab]}
            isGenerating={Boolean(state.generating[state.activeTab])}
            onCopy={handleCopy}
            onRegenerate={() => generateChannel(state.activeTab)}
            onRollback={() =>
              dispatch({ type: "ROLLBACK_OUTPUT", payload: state.activeTab })
            }
          />
        </div>
      </main>

      <RightPanel
        state={state}
        onRightPanelChange={(panel: RightPanelTab) =>
          dispatch({ type: "SET_RIGHT_PANEL", payload: panel })
        }
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
        onClearLog={() => dispatch({ type: "CLEAR_LOG" })}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
