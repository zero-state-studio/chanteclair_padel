"use client";

import { useEffect, useRef } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LiveEvent } from "@/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const TOPIC = "live-events";
const EVENT = "live-event";

let cachedClient: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedClient;
}

export function useRealtime(onEvent: (event: LiveEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const supabase = getClient();
    if (!supabase) {
      console.warn("Supabase client non configurato per Realtime");
      return;
    }

    const channel = supabase.channel(TOPIC);
    channel.on("broadcast", { event: EVENT }, ({ payload }) => {
      handlerRef.current(payload as LiveEvent);
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
