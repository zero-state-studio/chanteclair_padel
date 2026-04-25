"use client";

import { useEffect, useRef } from "react";
import type { LiveEvent } from "@/types";

export function useSSE(onEvent: (event: LiveEvent) => void) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (e) => {
      try {
        const event: LiveEvent = JSON.parse(e.data);
        handlerRef.current(event);
      } catch {
        // ignora heartbeat / dati non JSON
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection error, browser will reconnect...");
    };

    return () => {
      eventSource.close();
    };
  }, []);
}
