import type { AuthenticationManager } from "../../../../core/auth/AuthenticationManager.js";
import type {
  AuthError,
  AuthStatus,
  ReauthenticationInstruction,
  SessionState,
} from "../../../../core/auth/types.js";
import { failure, isFailure, success } from "../../../../core/result/Result.js";
import type { Result } from "../../../../core/result/Result.js";
import type { SecureCredentialStore } from "../../../secureStore/SecureCredentialStore.js";
import type { ManualLoginFlow } from "./ManualLoginFlow.js";

const SESSION_KEY = "udio-session";

export type UdioAuthenticationManagerOptions = {
  readonly now?: () => Date;
};

function isExpired(session: SessionState, now: () => Date): boolean {
  if (!session.expiresAt) return false;
  return new Date(session.expiresAt).getTime() <= now().getTime();
}

export class UdioAuthenticationManager implements AuthenticationManager {
  private readonly store: SecureCredentialStore;
  private readonly loginFlow: ManualLoginFlow;
  private readonly now: () => Date;

  constructor(
    store: SecureCredentialStore,
    loginFlow: ManualLoginFlow,
    options: UdioAuthenticationManagerOptions = {},
  ) {
    this.store = store;
    this.loginFlow = loginFlow;
    this.now = options.now ?? (() => new Date());
  }

  async loadSession(): Promise<Result<SessionState | null, AuthError>> {
    const stored = await this.store.load(SESSION_KEY);
    if (isFailure(stored)) {
      return failure<SessionState | null, AuthError>({
        type: "StorageUnavailable",
        message: stored.error.message,
      });
    }
    if (stored.value === null) {
      return success<SessionState | null, AuthError>(null);
    }

    try {
      return success<SessionState | null, AuthError>(JSON.parse(stored.value) as SessionState);
    } catch {
      return failure<SessionState | null, AuthError>({
        type: "StorageUnavailable",
        message: "保存されたセッションデータの解析に失敗しました",
      });
    }
  }

  async saveSession(state: SessionState): Promise<Result<void, AuthError>> {
    const saved = await this.store.save(SESSION_KEY, JSON.stringify(state));
    if (isFailure(saved)) {
      return failure<void, AuthError>({ type: "StorageUnavailable", message: saved.error.message });
    }
    return success<void, AuthError>(undefined);
  }

  async checkLoginStatus(): Promise<Result<AuthStatus, AuthError>> {
    const sessionResult = await this.loadSession();
    if (isFailure(sessionResult)) return sessionResult;

    const session = sessionResult.value;
    if (!session) return success<AuthStatus, AuthError>("unauthenticated");
    if (isExpired(session, this.now)) return success<AuthStatus, AuthError>("expired");
    return success<AuthStatus, AuthError>("valid");
  }

  async verifySessionValid(): Promise<Result<boolean, AuthError>> {
    const statusResult = await this.checkLoginStatus();
    if (isFailure(statusResult)) return statusResult;
    return success<boolean, AuthError>(statusResult.value === "valid");
  }

  async refreshStorageState(): Promise<Result<void, AuthError>> {
    const sessionResult = await this.loadSession();
    if (isFailure(sessionResult)) return sessionResult;
    if (!sessionResult.value) {
      return failure<void, AuthError>({ type: "SessionNotFound" });
    }
    return success<void, AuthError>(undefined);
  }

  async requestReauthentication(): Promise<Result<ReauthenticationInstruction, AuthError>> {
    const loginResult = await this.loginFlow.run();
    if (isFailure(loginResult)) return loginResult;

    const saveResult = await this.saveSession({
      serialized: loginResult.value.serializedState,
      savedAt: loginResult.value.capturedAt,
    });
    if (isFailure(saveResult)) return saveResult;

    return success<ReauthenticationInstruction, AuthError>({
      message: "ログインが完了し、セッションを保存しました。",
      requiresManualBrowserAction: false,
    });
  }
}
