/**
 * Image uploads (covers, avatars, images inside chapters).
 *
 * The file type is detected from the bytes themselves, never from the
 * client-supplied name or MIME type.
 */
import { fileTypeFromBuffer } from "file-type";
import { nanoid } from "nanoid";
import { db } from "@/server/db";
import { uploads } from "@/server/db/schema";
import { getStorage } from "@/server/storage";
import { assertRateLimit } from "@/server/rate-limit";
import { fileUrl } from "@/lib/files";
import { ValidationError, requireActor, type Actor } from "./errors";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function uploadImage(actor: Actor, bytes: Uint8Array) {
  const user = requireActor(actor);
  assertRateLimit(`upload:${user.id}`, 30, 10 * 60_000);

  if (bytes.byteLength === 0) throw new ValidationError("That file is empty.");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new ValidationError("Images must be 5 MB or smaller.");
  }
  const detected = await fileTypeFromBuffer(bytes);
  const extension = detected ? ALLOWED_TYPES[detected.mime] : undefined;
  if (!detected || !extension) {
    throw new ValidationError("Please upload a PNG, JPEG, WebP, AVIF or GIF image.");
  }

  const month = new Date().toISOString().slice(0, 7);
  const key = `u/${user.id}/${month}/${nanoid(16)}.${extension}`;
  await getStorage().put(key, bytes, detected.mime);
  await db.insert(uploads).values({
    key,
    ownerId: user.id,
    mime: detected.mime,
    bytes: bytes.byteLength,
  });
  return { key, url: fileUrl(key)!, mime: detected.mime };
}
