import type { Result } from "../result/Result.js";
import type { MemoryError, MemoryQuery } from "./types.js";

export interface MemoryWriter<T extends { readonly id: string }> {
  record(entry: T): Promise<Result<void, MemoryError>>;
}

export interface MemoryReader<T extends { readonly id: string }> {
  list(): Promise<Result<readonly T[], MemoryError>>;
  findById(id: string): Promise<Result<T | null, MemoryError>>;
}

/**
 * 現時点では単純な属性フィルタのみを想定するが、将来の全文検索・類似検索への
 * 拡張余地を残すためcore側にportとして先に用意する。
 */
export interface MemorySearcher<T extends { readonly id: string }> {
  find(query: MemoryQuery): Promise<Result<readonly T[], MemoryError>>;
}

export interface MemoryStore<T extends { readonly id: string }>
  extends MemoryWriter<T>, MemoryReader<T>, MemorySearcher<T> {}
