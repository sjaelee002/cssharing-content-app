import type { Channel, ContentType, Goal, Tone } from "@/lib/types";

export const MVP_CHANNELS: Channel[] = [
  "Blog",
  "Magazine",
  "Instagram",
  "Facebook",
  "LinkedIn",
];

export const GOAL_CHANNELS: Record<
  Goal,
  { group: string; color: string }
> = {
  인지도: { group: "획득", color: "#7C3AED" },
  참여도: { group: "설득", color: "#7C3AED" },
  전환: { group: "전환", color: "#059669" },
  브랜딩: { group: "PR", color: "#2563EB" },
};

export const GOALS = Object.keys(GOAL_CHANNELS) as Goal[];

export const CH_ICON: Record<Channel, string> = {
  Instagram: "IG",
  Facebook: "FB",
  Blog: "BL",
  Magazine: "MG",
  LinkedIn: "LI",
};

export const CH_LABELS: Record<Channel, string> = {
  Blog: "네이버 블로그",
  Magazine: "홈페이지 매거진",
  Instagram: "인스타그램",
  Facebook: "페이스북",
  LinkedIn: "링크드인",
};

export const TONES: Tone[] = [
  "전문적",
  "대화형",
  "권위있는",
  "영감을 주는",
  "편집적",
  "친근한",
];

export const TYPES: ContentType[] = [
  "인사이트",
  "사례연구",
  "광고",
  "트렌드",
];

export const GENERATION_DELAY_MS = 1500;
