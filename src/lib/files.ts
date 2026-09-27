/** Shape of keys created by the upload service: u/<userId>/<yyyy-mm>/<random>.<ext> */
export const UPLOAD_KEY_PATTERN =
  /^u\/[A-Za-z0-9_-]+\/\d{4}-\d{2}\/[A-Za-z0-9_-]+\.(png|jpg|webp|gif|avif)$/;

export const FILES_PREFIX = "/api/files/";

/** Public URL for a stored object. All files are served through the app. */
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `${FILES_PREFIX}${key}` : null;
}

/** True if `key` is an upload key, optionally owned by `ownerId`. */
export function isUploadKey(key: unknown, ownerId?: string): key is string {
  if (typeof key !== "string" || !UPLOAD_KEY_PATTERN.test(key)) return false;
  return ownerId === undefined || key.startsWith(`u/${ownerId}/`);
}

/** True if `url` is the URL of an uploaded file, optionally owned by `ownerId`. */
export function isUploadUrl(url: unknown, ownerId?: string): url is string {
  return (
    typeof url === "string" &&
    url.startsWith(FILES_PREFIX) &&
    isUploadKey(url.slice(FILES_PREFIX.length), ownerId)
  );
}
