import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageDriver, StoredObject } from "./types";

/** Stores objects as files under `rootDir`, with a sidecar file for the content type. */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(rootDir: string) {
    this.root = path.resolve(rootDir);
  }

  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return target;
  }

  async put(key: string, data: Uint8Array, contentType: string): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    await writeFile(`${target}.meta`, contentType, "utf8");
  }

  async get(key: string): Promise<StoredObject | null> {
    const target = this.resolve(key);
    try {
      const [info, contentType] = await Promise.all([
        stat(target),
        readFile(`${target}.meta`, "utf8").catch(() => "application/octet-stream"),
      ]);
      const body = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;
      return { body, contentType, size: info.size };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve(key);
    await rm(target, { force: true });
    await rm(`${target}.meta`, { force: true });
  }
}
