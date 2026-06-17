import { NextResponse } from "next/server";

import { MVP_CHANNELS } from "@/lib/prompts/constants";
import { getSupabaseServerClient } from "@/lib/storage/supabase";
import type { Channel, ContentType, Goal, Tone } from "@/lib/types";
import type { Database } from "@/lib/storage/supabase";

interface SaveContentBody {
  channel?: string;
  contentType?: ContentType;
  goal?: Goal;
  tone?: Tone;
  draft?: string;
  content?: string;
  isHighPerformance?: boolean;
}

function isChannel(value: string): value is Channel {
  return (MVP_CHANNELS as string[]).includes(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SaveContentBody;

    if (!body.channel || !isChannel(body.channel)) {
      return NextResponse.json(
        { error: "유효한 channel 값이 필요합니다." },
        { status: 400 }
      );
    }

    if (!body.content?.trim()) {
      return NextResponse.json(
        { error: "저장할 content가 비어 있습니다." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const payload: Database["public"]["Tables"]["contents"]["Insert"] = {
      channel: body.channel,
      content_type: body.contentType ?? null,
      goal: body.goal ?? null,
      tone: body.tone ?? null,
      draft: body.draft?.trim() ? body.draft : null,
      content: body.content,
      is_high_performance: Boolean(body.isHighPerformance),
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("contents")
      .insert(payload)
      .select("id, created_at, is_high_performance")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      id: data.id as string,
      createdAt: data.created_at as string,
      isHighPerformance: data.is_high_performance as boolean,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "콘텐츠 저장 중 알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
