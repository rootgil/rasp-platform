"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribe to GET /api/events/stream and refresh the current RSC page
 * when a new event or alert arrives (debounced).
 */
export function useEventStream(enabled = true) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;

    const es = new EventSource("/api/events/stream");
    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh.current < 1500) return;
      lastRefresh.current = now;
      router.refresh();
    };

    es.addEventListener("event", refresh);
    es.addEventListener("alert", refresh);
    es.onerror = () => {
      // Browser will reconnect; avoid hammering refresh on error storms.
    };

    return () => {
      es.close();
    };
  }, [enabled, router]);
}

/** Drop-in companion to AutoRefresh for events/alerts pages. */
export function EventStreamRefresh() {
  useEventStream(true);
  return null;
}
