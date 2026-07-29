import type { Result } from "../../core/result/Result.js";

export type SecureStoreError =
  | { readonly type: "WriteFailed"; readonly message: string }
  | { readonly type: "ReadFailed"; readonly message: string };

export interface SecureCredentialStore {
  save(key: string, value: string): Promise<Result<void, SecureStoreError>>;
  load(key: string): Promise<Result<string | null, SecureStoreError>>;
  delete(key: string): Promise<Result<void, SecureStoreError>>;
}
