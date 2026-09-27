/** Public URL for a stored object. All files are served through the app. */
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key}` : null;
}
