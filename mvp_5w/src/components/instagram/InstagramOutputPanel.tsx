"use client";

import { ChannelOutput } from "@/components/ChannelOutput";
import { InstagramCardnewsPanel } from "@/components/instagram/InstagramCardnewsPanel";
import { isInstagramCardnewsEnabled } from "@/lib/features";
import type { InstagramCardnewsState } from "@/lib/instagram/types";
import type {
  BlogEnhancementState,
  Channel,
  ChannelSaveState,
  Goal,
} from "@/lib/types";

interface InstagramOutputPanelProps {
  goal: Goal;
  hasHydrated: boolean;
  output?: {
    content: string;
    ts: string;
    history: { content: string; ts: string; instruction?: string }[];
  };
  blogEnhancement: BlogEnhancementState;
  cardnews: InstagramCardnewsState;
  isGenerating: boolean;
  isSaving: boolean;
  saveState?: ChannelSaveState;
  onCopy: (text: string) => void;
  onRegenerate: () => void;
  onRollback: () => void;
  onSave: (isHighPerformance: boolean) => void;
  onGenerateCardnews: () => void;
}

export function InstagramOutputPanel({
  goal,
  hasHydrated,
  output,
  blogEnhancement,
  cardnews,
  isGenerating,
  isSaving,
  saveState,
  onCopy,
  onRegenerate,
  onRollback,
  onSave,
  onGenerateCardnews,
}: InstagramOutputPanelProps) {
  const channel: Channel = "Instagram";
  const showCardnews = isInstagramCardnewsEnabled();

  return (
    <div className="instagram-output-panel">
      <ChannelOutput
        channel={channel}
        goal={goal}
        hasHydrated={hasHydrated}
        output={output}
        isGenerating={isGenerating}
        isSaving={isSaving}
        saveState={saveState}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        onRollback={onRollback}
        onSave={onSave}
      />
      {showCardnews && (
        <InstagramCardnewsPanel
          blogEnhancement={blogEnhancement}
          cardnews={cardnews}
          onGenerate={onGenerateCardnews}
          onCopyCaption={onCopy}
          onCopyHashtags={onCopy}
        />
      )}
    </div>
  );
}
