"use client";

import { useEffect, useState } from "react";
import { saveChapterAction } from "@/server/actions/stories";

export type SaveState =
  | { kind: "saved"; at: Date | null }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "offline" }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string };

interface Draft {
  title: string;
  content: unknown;
}

interface Backup extends Draft {
  baseRevision: number;
  at: number;
}

const DEBOUNCE_MS = 1200;
const RETRY_MS = 5000;

function backupKey(chapterId: string) {
  return `authowrite:unsaved:${chapterId}`;
}

/**
 * Returns unsaved local changes for a chapter. `stale` means they were made on
 * top of an older version than the one just loaded (e.g. after a conflict),
 * so the writer should decide whether to restore them.
 */
export function readBackup(
  chapterId: string,
  revision: number,
): { backup: Backup; stale: boolean } | null {
  try {
    const raw = localStorage.getItem(backupKey(chapterId));
    if (!raw) return null;
    const backup = JSON.parse(raw) as Backup;
    return { backup, stale: backup.baseRevision !== revision };
  } catch {
    return null;
  }
}

export function discardBackup(chapterId: string) {
  try {
    localStorage.removeItem(backupKey(chapterId));
  } catch {}
}

/**
 * Debounced saver with optimistic concurrency and a local safety net: every
 * change is mirrored to localStorage until the server confirms it, so nothing
 * is lost if the connection drops or the tab closes.
 */
class ChapterSaver {
  private revision: number;
  private pending: Draft | null = null;
  private inFlight = false;
  private blocked = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly chapterId: string,
    initialRevision: number,
    private readonly onState: (state: SaveState) => void,
  ) {
    this.revision = initialRevision;
  }

  get hasUnsavedWork(): boolean {
    return this.pending !== null || this.inFlight;
  }

  schedule(draft: Draft) {
    this.pending = draft;
    if (!this.blocked) this.onState({ kind: "dirty" });
    try {
      const backup: Backup = { ...draft, baseRevision: this.revision, at: Date.now() };
      localStorage.setItem(backupKey(this.chapterId), JSON.stringify(backup));
    } catch {}
    this.arm(DEBOUNCE_MS);
  }

  private arm(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }

  /** Saves immediately. Resolves true when everything is on the server. */
  async flush(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.blocked) return false;
    if (this.inFlight) {
      // A save is running; wait for it, then save whatever is left.
      await new Promise((resolve) => setTimeout(resolve, 150));
      return this.flush();
    }
    const draft = this.pending;
    if (!draft) return true;
    this.pending = null;
    this.inFlight = true;
    this.onState({ kind: "saving" });
    try {
      const result = await saveChapterAction(this.chapterId, { ...draft, expectedRevision: this.revision });
      if (result.ok) {
        this.revision = result.data.revision;
        if (!this.pending) {
          discardBackup(this.chapterId);
          this.onState({ kind: "saved", at: new Date(result.data.savedAt) });
        }
        return true;
      }
      this.pending ??= draft;
      if (result.code === 409) {
        this.blocked = true;
        this.onState({ kind: "conflict", message: result.error });
      } else {
        this.onState({ kind: "error", message: result.error });
        this.arm(RETRY_MS);
      }
      return false;
    } catch {
      // Network failure: keep the local copy and retry.
      this.pending ??= draft;
      this.onState({ kind: "offline" });
      this.arm(RETRY_MS);
      return false;
    } finally {
      this.inFlight = false;
      if (this.pending && !this.timer && !this.blocked) this.arm(DEBOUNCE_MS);
    }
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
  }
}

export function useAutosave(chapterId: string, initialRevision: number) {
  const [state, setState] = useState<SaveState>({ kind: "saved", at: null });
  const [saver] = useState(() => new ChapterSaver(chapterId, initialRevision, setState));

  useEffect(() => {
    const onOnline = () => void saver.flush();
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saver.hasUnsavedWork) event.preventDefault();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void saver.flush();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      saver.dispose();
    };
  }, [saver]);

  return {
    state,
    schedule: (draft: Draft) => saver.schedule(draft),
    flush: () => saver.flush(),
  };
}
