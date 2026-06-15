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

export type RightPanel = "rules" | "refine" | "log";

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
}

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
}
