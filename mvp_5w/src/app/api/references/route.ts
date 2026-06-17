import { NextResponse } from "next/server";

import { MVP_CHANNELS } from "@/lib/prompts/constants";
import { getSupabaseServerClient } from "@/lib/storage/supabase";
import type { Database } from "@/lib/storage/supabase";
import type { Channel } from "@/lib/types";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseLimit(searchParams: URLSearchParams) {
  const raw = Number(searchParams.get("limit"));
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(raw), MAX_LIMIT);
}

function isChannel(value: string): value is Channel {
  return (MVP_CHANNELS as string[]).includes(value);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams);
    const channel = searchParams.get("channel");

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("contents")
      .select(
        "id, channel, content_type, goal, tone, draft, content, is_high_performance, created_at"
      )
      .eq("is_high_performance", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    const channelFilter = channel?.trim();
    if (channelFilter && isChannel(channelFilter)) {
      query = query.eq("channel", channelFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data || []) as Database["public"]["Tables"]["contents"]["Row"][];
    const items = rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      contentType: row.content_type,
      goal: row.goal,
      tone: row.tone,
      draft: row.draft,
      content: row.content,
      isHighPerformance: row.is_high_performance,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "참고자료 조회 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
