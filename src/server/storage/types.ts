/**
 * Minimal object-storage contract. Implementations exist for the local
 * filesystem and S3-compatible services; IPFS or other backends can be added
 * later by implementing the same interface (see docs/adr/0005-storage-drivers.md).
 */
export interface StoredObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size: number;
}

export interface StorageDriver {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
