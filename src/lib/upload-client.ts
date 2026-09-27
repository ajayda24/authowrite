"use client";

/** Uploads an image via /api/uploads. Throws an Error with a friendly message. */
export async function uploadImageFile(file: File): Promise<{ url: string; key: string }> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.");
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/uploads", { method: "POST", body });
  const data = (await response.json().catch(() => ({}))) as {
    url?: string;
    key?: string;
    error?: string;
  };
  if (!response.ok || !data.url || !data.key) throw new Error(data.error ?? "Upload failed.");
  return { url: data.url, key: data.key };
}
