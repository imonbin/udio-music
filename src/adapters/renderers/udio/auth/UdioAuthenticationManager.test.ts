import { describe, expect, it } from "vitest";
import { failure, isFailure, isSuccess, success } from "../../../../core/result/Result.js";
import type { Result } from "../../../../core/result/Result.js";
import type { AuthError } from "../../../../core/auth/types.js";
import type {
  SecureCredentialStore,
  SecureStoreError,
} from "../../../secureStore/SecureCredentialStore.js";
import type { CapturedSession, ManualLoginFlow } from "./ManualLoginFlow.js";
import { UdioAuthenticationManager } from "./UdioAuthenticationManager.js";

class FakeSecureCredentialStore implements SecureCredentialStore {
  private readonly values = new Map<string, string>();

  async save(key: string, value: string): Promise<Result<void, SecureStoreError>> {
    this.values.set(key, value);
    return success(undefined);
  }

  async load(key: string): Promise<Result<string | null, SecureStoreError>> {
    return success(this.values.get(key) ?? null);
  }

  async delete(key: string): Promise<Result<void, SecureStoreError>> {
    this.values.delete(key);
    return success(undefined);
  }
}

class FakeManualLoginFlow implements ManualLoginFlow {
  constructor(private readonly outcome: () => Result<CapturedSession, AuthError>) {}

  async run(): Promise<Result<CapturedSession, AuthError>> {
    return this.outcome();
  }
}

const fixedNow = () => new Date("2026-07-27T00:00:00.000Z");

describe("UdioAuthenticationManager", () => {
  it("reports unauthenticated when no session has been saved", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
      { now: fixedNow },
    );

    const result = await manager.checkLoginStatus();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toBe("unauthenticated");
  });

  it("reports valid when a session without expiresAt is saved", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
      { now: fixedNow },
    );

    await manager.saveSession({ serialized: "{}", savedAt: "2026-07-27T00:00:00.000Z" });
    const result = await manager.checkLoginStatus();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toBe("valid");
  });

  it("reports expired when the stored session's expiresAt is in the past", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
      { now: fixedNow },
    );

    await manager.saveSession({
      serialized: "{}",
      savedAt: "2026-07-01T00:00:00.000Z",
      expiresAt: "2026-07-20T00:00:00.000Z",
    });
    const result = await manager.checkLoginStatus();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toBe("expired");
  });

  it("round-trips a saved session through loadSession", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
    );

    const state = { serialized: '{"cookies":[]}', savedAt: "2026-07-27T00:00:00.000Z" };
    await manager.saveSession(state);
    const result = await manager.loadSession();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toEqual(state);
  });

  it("verifySessionValid returns false when unauthenticated", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
    );

    const result = await manager.verifySessionValid();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) expect(result.value).toBe(false);
  });

  it("refreshStorageState returns SessionNotFound when nothing is stored", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        success({ serializedState: "{}", capturedAt: "2026-07-27T00:00:00.000Z" }),
      ),
    );

    const result = await manager.refreshStorageState();

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.error.type).toBe("SessionNotFound");
  });

  it("requestReauthentication runs the manual login flow and saves the captured session", async () => {
    const store = new FakeSecureCredentialStore();
    const manager = new UdioAuthenticationManager(
      store,
      new FakeManualLoginFlow(() =>
        success({ serializedState: '{"cookies":[]}', capturedAt: "2026-07-27T01:00:00.000Z" }),
      ),
    );

    const result = await manager.requestReauthentication();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.requiresManualBrowserAction).toBe(false);
    }

    const status = await manager.checkLoginStatus();
    if (isSuccess(status)) expect(status.value).toBe("valid");
  });

  it("requestReauthentication propagates a failure from the manual login flow without throwing", async () => {
    const manager = new UdioAuthenticationManager(
      new FakeSecureCredentialStore(),
      new FakeManualLoginFlow(() =>
        failure<CapturedSession, AuthError>({
          type: "CaptchaRequired",
          message: "CAPTCHAが検出されました",
        }),
      ),
    );

    const result = await manager.requestReauthentication();

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.error.type).toBe("CaptchaRequired");
  });
});
