"use client";

import { useEffect, useRef, useState } from "react";
import { saveProgressAction } from "@/server/actions/social";

/**
 * Thin progress bar at the top of the reader. For signed-in readers it also
 * remembers where they stopped (throttled).
 */
export function ReadingProgress({
  targetId,
  storyId,
  chapterId,
  track,
}: {
  targetId: string;
  storyId: string;
  chapterId: string;
  track: boolean;
}) {
  const [percent, setPercent] = useState(0);
  const lastSaved = useRef({ percent: -1, at: 0 });
  const current = useRef(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    function save(force = false) {
      if (!track) return;
      const now = Date.now();
      const p = current.current;
      if (
        !force &&
        (now - lastSaved.current.at < 4000 || Math.abs(p - lastSaved.current.percent) < 0.03)
      )
        return;
      lastSaved.current = { percent: p, at: now };
      void saveProgressAction({ storyId, chapterId, percent: p });
    }

    function onScroll() {
      const rect = target!.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const read = Math.min(1, Math.max(0, -rect.top / Math.max(1, total)));
      current.current = read;
      setPercent(read);
      save();
    }
    const onHide = () => document.visibilityState === "hidden" && save(true);

    onScroll();
    save(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      save(true);
    };
  }, [targetId, storyId, chapterId, track]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent * 100)}
    >
      <div
        className="bg-accent h-full origin-left transition-transform duration-150"
        style={{ transform: `scaleX(${percent})` }}
      />
    </div>
  );
}
