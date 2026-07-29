import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { failure, success } from "../../core/result/Result.js";
import type { Result } from "../../core/result/Result.js";
import type { SecureCredentialStore, SecureStoreError } from "./SecureCredentialStore.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class EncryptedFileCredentialStore implements SecureCredentialStore {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private keyPath(): string {
    return join(this.baseDir, "master.key");
  }

  private valuePath(key: string): string {
    return join(this.baseDir, `${key}.enc`);
  }

  private async loadOrCreateMasterKey(): Promise<Buffer> {
    try {
      return await readFile(this.keyPath());
    } catch (error) {
      if (!isFileNotFoundError(error)) throw error;

      const key = randomBytes(32);
      await mkdir(this.baseDir, { recursive: true });
      await writeFile(this.keyPath(), key, { mode: 0o600 });
      return key;
    }
  }

  async save(key: string, value: string): Promise<Result<void, SecureStoreError>> {
    try {
      const masterKey = await this.loadOrCreateMasterKey();
      const iv = randomBytes(IV_LENGTH);
      const cipher = createCipheriv(ALGORITHM, masterKey, iv, { authTagLength: AUTH_TAG_LENGTH });
      const encrypted = Buffer.concat([cipher.update(value, "utf-8"), cipher.final()]);
      const authTag = cipher.getAuthTag();
      const payload = Buffer.concat([iv, authTag, encrypted]);

      await mkdir(this.baseDir, { recursive: true });
      await writeFile(this.valuePath(key), payload, { mode: 0o600 });
      return success<void, SecureStoreError>(undefined);
    } catch (error) {
      return failure<void, SecureStoreError>({
        type: "WriteFailed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async load(key: string): Promise<Result<string | null, SecureStoreError>> {
    let payload: Buffer;
    try {
      payload = await readFile(this.valuePath(key));
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return success<string | null, SecureStoreError>(null);
      }
      return failure<string | null, SecureStoreError>({
        type: "ReadFailed",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return failure<string | null, SecureStoreError>({
        type: "ReadFailed",
        message: "暗号化データの形式が不正です",
      });
    }

    try {
      const masterKey = await this.loadOrCreateMasterKey();
      const iv = payload.subarray(0, IV_LENGTH);
      const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const decipher = createDecipheriv(ALGORITHM, masterKey, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return success<string | null, SecureStoreError>(decrypted.toString("utf-8"));
    } catch (error) {
      return failure<string | null, SecureStoreError>({
        type: "ReadFailed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(key: string): Promise<Result<void, SecureStoreError>> {
    try {
      await rm(this.valuePath(key), { force: true });
      return success<void, SecureStoreError>(undefined);
    } catch (error) {
      return failure<void, SecureStoreError>({
        type: "WriteFailed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
