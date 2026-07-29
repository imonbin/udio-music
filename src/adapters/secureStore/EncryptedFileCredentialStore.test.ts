import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isFailure, isSuccess } from "../../core/result/Result.js";
import { EncryptedFileCredentialStore } from "./EncryptedFileCredentialStore.js";

describe("EncryptedFileCredentialStore", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "udio-producer-mcp-secrets-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("saves and loads a value round-trip", async () => {
    const store = new EncryptedFileCredentialStore(dir);

    await store.save("udio-session", "secret-session-state");
    const result = await store.load("udio-session");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe("secret-session-state");
    }
  });

  it("returns null (not an error) when the key does not exist", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    const result = await store.load("missing-key");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeNull();
    }
  });

  it("stores ciphertext on disk, not the plaintext value", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    await store.save("udio-session", "super-secret-cookie-value");

    const filePath = join(dir, "udio-session.enc");
    const raw = await (await import("node:fs/promises")).readFile(filePath);

    expect(raw.toString("utf-8")).not.toContain("super-secret-cookie-value");
  });

  it("deletes a stored value so it is no longer retrievable", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    await store.save("udio-session", "secret");

    await store.delete("udio-session");
    const result = await store.load("udio-session");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBeNull();
    }
  });

  it("restricts the master key file permissions to the owner only", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    await store.save("udio-session", "secret");

    const keyStat = await stat(join(dir, "master.key"));
    expect(keyStat.mode & 0o777).toBe(0o600);
  });

  it("round-trips a value containing JSON", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    const payload = JSON.stringify({ cookies: [{ name: "session", value: "abc123" }] });

    await store.save("udio-session", payload);
    const result = await store.load("udio-session");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe(payload);
    }
  });

  it("returns a typed error instead of throwing when the ciphertext is corrupted", async () => {
    const store = new EncryptedFileCredentialStore(dir);
    await store.save("udio-session", "secret");

    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(dir, "udio-session.enc"), Buffer.from("not-valid-ciphertext"));

    const result = await store.load("udio-session");

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ReadFailed");
    }
  });
});
