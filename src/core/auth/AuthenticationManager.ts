import type { Result } from "../result/Result.js";
import type { AuthError, AuthStatus, ReauthenticationInstruction, SessionState } from "./types.js";

export interface SessionStatusChecker {
  checkLoginStatus(): Promise<Result<AuthStatus, AuthError>>;
  verifySessionValid(): Promise<Result<boolean, AuthError>>;
}

export interface SessionStore {
  saveSession(state: SessionState): Promise<Result<void, AuthError>>;
  loadSession(): Promise<Result<SessionState | null, AuthError>>;
}

export interface SessionRefresher {
  refreshStorageState(): Promise<Result<void, AuthError>>;
}

export interface ReauthenticationRequester {
  requestReauthentication(): Promise<Result<ReauthenticationInstruction, AuthError>>;
}

/**
 * Renderer実装（Browser Adapter）が必要とする最小限の読み取り専用スライス。
 * 保存・更新・再認証の責務は持たない。
 */
export interface SessionProvider {
  loadSession(): Promise<Result<SessionState | null, AuthError>>;
  verifySessionValid(): Promise<Result<boolean, AuthError>>;
}

export interface AuthenticationManager
  extends SessionStatusChecker, SessionStore, SessionRefresher, ReauthenticationRequester {}
