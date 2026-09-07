"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CouncilEvent, CouncilSynthesis } from "@/types/council";

export type RealtimeState = "mock" | "connecting" | "connected" | "error";

function isCouncilEvent(value: unknown): value is CouncilEvent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  const type = (value as { type?: unknown }).type;
  if (type === "message") return "message" in value;
  if (type === "conflict") return "flag" in value;
  if (type === "synthesis") return "synthesis" in value;
  return false;
}

export function useCouncilRealtime(initialEvents: CouncilEvent[]) {
  const [events, setEvents] = useState<CouncilEvent[]>(initialEvents);
  const [state, setState] = useState<RealtimeState>("mock");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setState("mock");
      return;
    }

    setState("connecting");
    const channelName = process.env.NEXT_PUBLIC_COUNCIL_CHANNEL || "amir-dev-brain:council";
    const channel = supabase
      .channel(channelName, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "council_event" }, ({ payload }) => {
        if (isCouncilEvent(payload)) {
          setEvents((current) => [...current, payload]);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setState("connected");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setState("error");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const injectMockEvent = useCallback((event: CouncilEvent) => {
    setEvents((current) => [...current, event]);
  }, []);

  const latestSynthesis = useMemo<CouncilSynthesis | null>(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type === "synthesis") return event.synthesis;
    }
    return null;
  }, [events]);

  return { events, latestSynthesis, state, injectMockEvent };
}
