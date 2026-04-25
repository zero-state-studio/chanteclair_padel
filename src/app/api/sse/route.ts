import { NextRequest } from "next/server";
import { sseEmitter } from "@/lib/sse";
import type { LiveEvent } from "@/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const heartbeat = setInterval(() => {
        safeEnqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      const onLiveEvent = (event: LiveEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        safeEnqueue(encoder.encode(data));
      };

      sseEmitter.on("live-event", onLiveEvent);

      safeEnqueue(encoder.encode(": connected\n\n"));

      const cleanup = () => {
        if (closed) return;
        closed = true;
        sseEmitter.off("live-event", onLiveEvent);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
