"use client";

import { CH_LABELS, GOAL_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import type { Channel, Goal } from "@/lib/types";

interface ChannelOutputProps {
  channel: Channel;
  goal: Goal;
  output?: {
    content: string;
    ts: string;
    history: { content: string; ts: string; instruction?: string }[];
  };
  isGenerating: boolean;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onRollback: () => void;
}

export function ChannelOutput({
  channel,
  goal,
  output,
  isGenerating,
  onCopy,
  onRegenerate,
  onRollback,
}: ChannelOutputProps) {
  const goalMeta = GOAL_CHANNELS[goal];
  const hasContent = isValidOutput(output?.content);
  const isError = output?.content?.startsWith("생성 실패");
  const historyCount = output?.history.length ?? 0;

  return (
    <div className="channel-output">
      <div className="channel-output-header">
        <div className="channel-output-title">
          <h2>{CH_LABELS[channel]}</h2>
          <span className="goal-badge small" style={{ color: goalMeta.color }}>
            {goalMeta.group}
          </span>
        </div>
        <div className="channel-output-actions">
          {hasContent && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => onCopy(output!.content)}
            >
              🔗 복사
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
      ) : output?.content ? (
        <div className={`output-card ${isError ? "error" : ""}`}>
          <div className="output-meta">
            <span>생성됨 · {output.ts}</span>
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
            {hasContent && (
              <button
                type="button"
                className="ghost-btn small"
                onClick={() => onCopy(output.content)}
              >
                복사
              </button>
            )}
          </div>
          <div className="output-content">{output.content}</div>
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
