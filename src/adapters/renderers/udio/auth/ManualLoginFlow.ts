import type { Result } from "../../../../core/result/Result.js";
import type { AuthError } from "../../../../core/auth/types.js";

export type CapturedSession = {
  readonly serializedState: string;
  readonly capturedAt: string;
};

/**
 * 実際にブラウザを開き、ユーザーの手動ログイン（2FA/CAPTCHAを含む）完了を待ってから
 * storageStateを捕捉する。具体的なPlaywright実装はUdio Rendererのステップで追加する。
 * このinterfaceにより、UdioAuthenticationManager側はPlaywrightを一切意識しない。
 */
export interface ManualLoginFlow {
  run(): Promise<Result<CapturedSession, AuthError>>;
}
