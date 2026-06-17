"use client";

import { CH_ICON, CH_LABELS, GOAL_CHANNELS, MVP_CHANNELS } from "@/lib/prompts/constants";
import { isValidOutput } from "@/lib/local-storage";
import type { Channel, Goal } from "@/lib/types";

interface ChannelTabsProps {
  activeTab: Channel;
  goal: Goal;
  hasHydrated: boolean;
  outputs: Partial<
    Record<
      Channel,
      { content: string; ts: string; history: { content: string; ts: string }[] }
    >
  >;
  generating: Partial<Record<Channel, boolean>>;
  onTabChange: (channel: Channel) => void;
}

export function ChannelTabs({
  activeTab,
  goal,
  hasHydrated,
  outputs,
  generating,
  onTabChange,
}: ChannelTabsProps) {
  const goalMeta = GOAL_CHANNELS[goal];

  return (
    <div className="channel-tabs">
      {MVP_CHANNELS.map((ch) => {
        const active = activeTab === ch;
        const out = outputs[ch];
        const isGenerating = generating[ch];
        const hasContent = hasHydrated && isValidOutput(out?.content);

        return (
          <button
            key={ch}
            type="button"
            className={`channel-tab ${active ? "active" : ""}`}
            onClick={() => onTabChange(ch)}
          >
            <span className="channel-tab-icon">{CH_ICON[ch]}</span>
            <span>{CH_LABELS[ch]}</span>
            {hasHydrated && isGenerating && (
              <span className="status-dot pulse" />
            )}
            {hasHydrated && !isGenerating && hasContent && (
              <span className="status-dot success" />
            )}
          </button>
        );
      })}
      <span className="goal-badge" style={{ color: goalMeta.color }}>
        {goalMeta.group}
      </span>
    </div>
  );
}
