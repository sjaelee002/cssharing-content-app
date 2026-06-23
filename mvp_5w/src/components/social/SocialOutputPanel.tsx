"use client";

import { CH_LABELS, GOAL_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import {
  formatSocialContentForDisplay,
  parseLinkedInContent,
} from "@/lib/social/sanitizeSocialContent";
import type { ChannelSaveState, Goal } from "@/lib/types";

interface SocialOutputPanelProps {
  channel: "Instagram" | "Facebook" | "LinkedIn";
  goal: Goal;
  hasHydrated: boolean;
  output?: {
    content: string;
    ts: string;
    history: { content: string; ts: string; instruction?: string }[];
  };
  isGenerating: boolean;
  isSaving: boolean;
  saveState?: ChannelSaveState;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onRollback: () => void;
  onSave: (isHighPerformance: boolean) => void;
}

export function SocialOutputPanel({
  channel,
  goal,
  hasHydrated,
  output,
  isGenerating,
  isSaving,
  saveState,
  onCopy,
  onRegenerate,
  onRollback,
  onSave,
}: SocialOutputPanelProps) {
  const goalMeta = GOAL_CHANNELS[goal];
  const hasContent = hasHydrated && isValidOutput(output?.content);
  const isError =
    hasHydrated && Boolean(output?.content?.startsWith("생성 실패"));
  const historyCount = hasHydrated ? (output?.history.length ?? 0) : 0;

  const displayText = output?.content
    ? formatSocialContentForDisplay(channel, output.content)
    : "";
  const linkedIn = channel === "LinkedIn" ? parseLinkedInContent(output?.content ?? "") : null;

  const copyLabel =
    channel === "Instagram" ? "📋 캡션 복사" : "📋 복사";

  return (
    <div className="channel-output social-output-panel">
      <div className="channel-output-header">
        <div className="channel-output-title">
          <h2>{CH_LABELS[channel]}</h2>
          <span className="goal-badge small" style={{ color: goalMeta.color }}>
            {goalMeta.group}
          </span>
        </div>
        <div className="channel-output-actions">
          {hasContent && (
            <>
              <button
                type="button"
                className="ghost-btn"
                disabled={isSaving}
                onClick={() => onSave(false)}
              >
                {isSaving ? "저장 중..." : "💾 저장"}
              </button>
              <button
                type="button"
                className="ghost-btn"
                disabled={isSaving}
                onClick={() => onSave(true)}
              >
                {isSaving ? "저장 중..." : "⭐ 고성과 저장"}
              </button>
            </>
          )}
          {hasContent && displayText && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onCopy(displayText)}
            >
              {copyLabel}
            </button>
          )}
          <button
            type="button"
            className="ghost-btn accent"
            disabled={isGenerating}
            onClick={onRegenerate}
          >
            {isGenerating ? "⟳ 생성중..." : "↺ 재생성"}
          </button>
        </div>
      </div>

      {isGenerating ? (
        <div className="output-placeholder loading">
          <div className="spinner" />
          <p>{CH_LABELS[channel]} 콘텐츠 생성 중...</p>
        </div>
      ) : hasHydrated && output?.content ? (
        <div className={`output-card ${isError ? "error" : ""}`}>
          <div className="output-meta">
            <span>생성됨 · {output.ts}</span>
            {saveState?.saved && (
              <span className="saved-badge">
                {saveState.isHighPerformance ? "⭐ 고성과 저장됨" : "💾 저장됨"}
              </span>
            )}
            {historyCount > 0 && (
              <button
                type="button"
                className="rollback-btn"
                onClick={() => {
                  if (window.confirm("이전 버전으로 되돌릴까요?")) {
                    onRollback();
                  }
                }}
              >
                ↩ v{historyCount} 되돌리기
              </button>
            )}
          </div>

          {channel === "LinkedIn" && linkedIn?.title ? (
            <div className="blog-sections">
              <div className="blog-adopted-title">
                <span className="blog-adopted-label">첫 줄 (제목)</span>
                <h3>{linkedIn.title}</h3>
              </div>
              {linkedIn.body && (
                <div className="output-content social-body">{linkedIn.body}</div>
              )}
            </div>
          ) : (
            <div className="output-content social-body">{displayText}</div>
          )}
        </div>
      ) : (
        <div className="output-placeholder">
          <p className="placeholder-title">{CH_LABELS[channel]} 콘텐츠 없음</p>
          <p className="placeholder-sub">
            왼쪽 ⚡ 전체 채널 생성을 클릭하세요
          </p>
        </div>
      )}
    </div>
  );
}
