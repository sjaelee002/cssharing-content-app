import type { BlogEnhancementState } from "@/lib/blog/types";
import type { InstagramCardnewsState } from "@/lib/instagram/types";
import type { MagazineEnhancementState } from "@/lib/magazine/types";

export type Channel = "Blog" | "Magazine" | "Instagram" | "Facebook" | "LinkedIn";

export type ContentType = "인사이트" | "사례연구" | "광고" | "트렌드";

export type Goal = "인지도" | "참여도" | "전환" | "브랜딩";

export type Tone =
  | "전문적"
  | "대화형"
  | "권위있는"
  | "영감을 주는"
  | "편집적"
  | "친근한";

export type RightPanel = "rules" | "refine" | "references" | "log";

export type LogType = "info" | "success" | "error" | "warn";

export interface Rule {
  id: string;
  text: string;
  enabled: boolean;
}

export interface HistoryEntry {
  content: string;
  ts: string;
  instruction?: string;
}

export interface ChannelOutput {
  content: string;
  ts: string;
  history: HistoryEntry[];
}

export interface LogEntry {
  id: number;
  time: string;
  msg: string;
  type: LogType;
}

export interface PromptContext {
  draft: string;
  contentType: ContentType;
  goal: Goal;
  tone: Tone;
  globalRules: Rule[];
  channelRules: Partial<Record<Channel, Rule[]>>;
  channelExtra: Partial<Record<Channel, string>>;
  refinements: Partial<Record<Channel, string[]>>;
  references?: SavedContentReference[];
}

export interface SavedContentReference {
  id: string;
  channel: Channel;
  contentType: ContentType | null;
  goal: Goal | null;
  tone: Tone | null;
  draft: string | null;
  content: string;
  isHighPerformance: boolean;
  createdAt: string;
}

export interface ChannelSaveState {
  saved: boolean;
  isHighPerformance: boolean;
  savedAt?: string;
  contentId?: string;
}

export type {
  BlogEnhancementState,
  BlogParsed,
  GeneratedVisual,
  VisualOutputMode,
  VisualType,
} from "@/lib/blog/types";

export type {
  MagazineEnhancementState,
  MagazineParsed,
} from "@/lib/magazine/types";

export type { InstagramCardnewsState } from "@/lib/instagram/types";

export interface ContentState {
  draft: string;
  contentType: ContentType;
  goal: Goal;
  tone: Tone;
  activeTab: Channel;
  outputs: Partial<Record<Channel, ChannelOutput>>;
  generating: Partial<Record<Channel, boolean>>;
  globalRules: Rule[];
  channelRules: Partial<Record<Channel, Rule[]>>;
  channelExtra: Partial<Record<Channel, string>>;
  refinements: Partial<Record<Channel, string[]>>;
  rightPanel: RightPanel;
  log: LogEntry[];
  refinePrompt: string;
  ruleSubTab: "global" | "channel";
  editingRuleCh: Channel;
  channelSaveState: Partial<Record<Channel, ChannelSaveState>>;
  referencesEnabled: boolean;
  availableReferences: SavedContentReference[];
  selectedReferenceIds: string[];
  hasHydrated: boolean;
  blogEnhancement: BlogEnhancementState;
  magazineEnhancement: MagazineEnhancementState;
  instagramCardnews: InstagramCardnewsState;
}

export interface PersistedBlogEnhancement {
  blogContentRaw: string;
  blogContentHtml: string;
  blogParsed: BlogEnhancementState["blogParsed"];
}

export interface PersistedMagazineEnhancement {
  magazineContentRaw: string;
  magazineContentHtml: string;
  magazineParsed: MagazineEnhancementState["magazineParsed"];
}

export interface PersistedState {
  draft: string;
  contentType: ContentType;
  goal: Goal;
  tone: Tone;
  activeTab: Channel;
  outputs: Partial<Record<Channel, ChannelOutput>>;
  refinements: Partial<Record<Channel, string[]>>;
  globalRules: Rule[];
  channelRules: Partial<Record<Channel, Rule[]>>;
  channelExtra: Partial<Record<Channel, string>>;
  referencesEnabled: boolean;
  selectedReferenceIds: string[];
  blogEnhancement?: PersistedBlogEnhancement;
  magazineEnhancement?: PersistedMagazineEnhancement;
  instagramCardnews?: Omit<
    import("@/lib/instagram/types").InstagramCardnewsState,
    "generating" | "error"
  >;
}
