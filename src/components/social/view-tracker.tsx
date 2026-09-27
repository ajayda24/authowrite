"use client";

import { useEffect } from "react";
import { recordViewAction } from "@/server/actions/social";

/** Counts one view per story per browser session. */
export function ViewTracker({ storyId }: { storyId: string }) {
  useEffect(() => {
    const key = `authowrite:viewed:${storyId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    void recordViewAction(storyId);
  }, [storyId]);
  return null;
}
