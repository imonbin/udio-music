import { describe, expect, it } from "vitest";
import { failure, isFailure, isSuccess, success } from "../result/Result.js";
import type { AuthenticationManager } from "./AuthenticationManager.js";
import type { AuthError, AuthStatus, ReauthenticationInstruction, SessionState } from "./types.js";

class FakeAuthenticationManager implements AuthenticationManager {
  private session: SessionState | null;

  constructor(session: SessionState | null) {
    this.session = session;
  }

  async checkLoginStatus() {
    if (!this.session) {
      return success<AuthStatus, AuthError>("unauthenticated");
    }
    return success<AuthStatus, AuthError>("valid");
  }

  async verifySessionValid() {
    return success<boolean, AuthError>(this.session !== null);
  }

  async saveSession(state: SessionState) {
    this.session = state;
    return success<void, AuthError>(undefined);
  }

  async loadSession() {
    return success<SessionState | null, AuthError>(this.session);
  }

  async refreshStorageState() {
    if (!this.session) {
      return failure<void, AuthError>({ type: "SessionNotFound" });
    }
    return success<void, AuthError>(undefined);
  }

  async requestReauthentication() {
    return success<ReauthenticationInstruction, AuthError>({
      message: "ブラウザで手動ログインを完了してください。",
      requiresManualBrowserAction: true,
    });
  }
}

describe("AuthenticationManager contract", () => {
  it("reports unauthenticated when no session is stored", async () => {
    const manager: AuthenticationManager = new FakeAuthenticationManager(null);
    const result = await manager.checkLoginStatus();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe("unauthenticated");
    }
  });

  it("saves and loads a session without throwing", async () => {
    const manager: AuthenticationManager = new FakeAuthenticationManager(null);
    const state: SessionState = { serialized: "{}", savedAt: "2026-07-27T00:00:00.000Z" };

    await manager.saveSession(state);
    const result = await manager.loadSession();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual(state);
    }
  });

  it("returns a typed AuthError instead of throwing when refresh has nothing to refresh", async () => {
    const manager: AuthenticationManager = new FakeAuthenticationManager(null);
    const result = await manager.refreshStorageState();

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("SessionNotFound");
    }
  });

  it("returns a Japanese reauthentication instruction", async () => {
    const manager: AuthenticationManager = new FakeAuthenticationManager(null);
    const result = await manager.requestReauthentication();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.requiresManualBrowserAction).toBe(true);
    }
  });
});
