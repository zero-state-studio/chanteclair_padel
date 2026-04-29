import type { LiveEvent } from "@/types";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const REALTIME_TOPIC = "live-events";
export const REALTIME_EVENT = "live-event";

export async function publishLiveEvent(event: LiveEvent): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "Supabase Realtime non configurato: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY richiesti"
    );
  }

  const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { topic: REALTIME_TOPIC, event: REALTIME_EVENT, payload: event },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Broadcast Realtime fallito: ${res.status} ${text}`);
  }
}
