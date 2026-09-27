import "server-only";
import { env } from "@/server/env";
import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";
import type { StorageDriver } from "./types";

export type { StorageDriver, StoredObject } from "./types";
export { fileUrl } from "@/lib/files";

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  if (env.STORAGE_DRIVER === "s3") {
    if (!env.S3_BUCKET) throw new Error("S3_BUCKET is required when STORAGE_DRIVER=s3");
    driver = new S3StorageDriver({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: env.S3_BUCKET,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  } else {
    driver = new LocalStorageDriver(env.STORAGE_LOCAL_DIR);
  }
  return driver;
}

/** For tests. */
export function setStorage(next: StorageDriver | null): void {
  driver = next;
}
