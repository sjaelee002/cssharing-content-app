"use client";

import { CH_ICON, GOALS, MVP_CHANNELS, TONES, TYPES } from "@/lib/prompts/constants";
import type { Channel, ContentType, Goal, Tone } from "@/lib/types";

interface GenerationControlsProps {
  draft: string;
  hasHydrated: boolean;
  contentType: ContentType;
  goal: Goal;
  tone: Tone;
  generating: Partial<Record<Channel, boolean>>;
  onContentTypeChange: (value: ContentType) => void;
  onGoalChange: (value: Goal) => void;
  onToneChange: (value: Tone) => void;
  onGenerateAll: () => void;
  onGenerateChannel: (channel: Channel) => void;
}

export function GenerationControls({
  draft,
  hasHydrated,
  contentType,
  goal,
  tone,
  generating,
  onContentTypeChange,
  onGoalChange,
  onToneChange,
  onGenerateAll,
  onGenerateChannel,
}: GenerationControlsProps) {
  const hasDraft = hasHydrated && draft.trim().length > 0;
  const isAnyGenerating = MVP_CHANNELS.some((ch) => generating[ch]);

  return (
    <section className="panel-section controls-section">
      <div>
        <div className="field-label">콘텐츠 유형</div>
        <div className="button-grid">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip-btn ${contentType === t ? "active" : ""}`}
              onClick={() => onContentTypeChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="field-label">캠페인 목표</div>
        <div className="button-grid">
          {GOALS.map((g) => (
            <button
              key={g}
              type="button"
              className={`chip-btn ${goal === g ? "active" : ""}`}
              onClick={() => onGoalChange(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="tone-select">
          콘텐츠 톤
        </label>
        <select
          id="tone-select"
          className="select-input"
          value={tone}
          onChange={(e) => onToneChange(e.target.value as Tone)}
        >
          {TONES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="generate-actions">
        <button
          type="button"
          className="primary-btn"
          disabled={!hasDraft || isAnyGenerating}
          onClick={onGenerateAll}
        >
          ⚡ 전체 채널 생성
        </button>
        <div className="channel-quick-btns">
          {MVP_CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              className="channel-quick-btn"
              disabled={!hasDraft || generating[ch]}
              onClick={() => onGenerateChannel(ch)}
              title={ch}
            >
              {generating[ch] ? "…" : CH_ICON[ch]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
