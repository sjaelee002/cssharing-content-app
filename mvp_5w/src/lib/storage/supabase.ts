import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Channel, ContentType, Goal, Tone } from "@/lib/types";

export interface Database {
  public: {
    Tables: {
      contents: {
        Row: {
          id: string;
          channel: Channel;
          content_type: ContentType | null;
          goal: Goal | null;
          tone: Tone | null;
          draft: string | null;
          content: string;
          is_high_performance: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          channel: Channel;
          content_type?: ContentType | null;
          goal?: Goal | null;
          tone?: Tone | null;
          draft?: string | null;
          content: string;
          is_high_performance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          channel?: Channel;
          content_type?: ContentType | null;
          goal?: Goal | null;
          tone?: Tone | null;
          draft?: string | null;
          content?: string;
          is_high_performance?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

let cachedClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServerClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL이 설정되지 않았습니다.");
  }

  if (!supabaseSecretKey) {
    throw new Error("SUPABASE_SECRET_KEY가 설정되지 않았습니다.");
  }

  cachedClient = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
