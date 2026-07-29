import { describe, expect, it } from "vitest";
import { isSuccess, success } from "../result/Result.js";
import type { MemoryStore } from "./MemoryStore.js";
import type { MemoryError, MemoryQuery } from "./types.js";

type Note = { readonly id: string; readonly text: string };

class FakeMemoryStore<T extends { readonly id: string }> implements MemoryStore<T> {
  private readonly entries: T[] = [];

  async record(entry: T) {
    this.entries.push(entry);
    return success<void, MemoryError>(undefined);
  }

  async list() {
    return success<readonly T[], MemoryError>([...this.entries]);
  }

  async findById(id: string) {
    return success<T | null, MemoryError>(this.entries.find((entry) => entry.id === id) ?? null);
  }

  async find(query: MemoryQuery) {
    const limited = query.limit ? this.entries.slice(0, query.limit) : this.entries;
    return success<readonly T[], MemoryError>(limited);
  }
}

describe("MemoryStore contract", () => {
  it("records an entry and lists it back", async () => {
    const store: MemoryStore<Note> = new FakeMemoryStore<Note>();
    await store.record({ id: "1", text: "granular texture works well at 140bpm" });

    const result = await store.list();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("finds an entry by id", async () => {
    const store: MemoryStore<Note> = new FakeMemoryStore<Note>();
    await store.record({ id: "1", text: "note" });

    const result = await store.findById("1");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value?.id).toBe("1");
    }
  });

  it("returns null (not throw) when an id is not found", async () => {
    const store: MemoryStore<Note> = new FakeMemoryStore<Note>();
    const result = await store.findById("missing");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeNull();
    }
  });

  it("find respects a limit query for future search extensions", async () => {
    const store: MemoryStore<Note> = new FakeMemoryStore<Note>();
    await store.record({ id: "1", text: "a" });
    await store.record({ id: "2", text: "b" });

    const result = await store.find({ limit: 1 });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toHaveLength(1);
    }
  });
});
