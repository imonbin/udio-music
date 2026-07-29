import { failure, success } from "../../../../core/result/Result.js";
import type { Result } from "../../../../core/result/Result.js";
import type { AuthError } from "../../../../core/auth/types.js";
import type { BrowserSession } from "../../../browser/BrowserSession.js";
import { noopLogger, type StepLogger } from "../../../browser/StepLogger.js";
import { LoginPage } from "../pages/LoginPage.js";
import type { CapturedSession, ManualLoginFlow } from "./ManualLoginFlow.js";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * 既存Chromeのタブでユーザーが手動でログイン（2FA/CAPTCHA含む）を完了するのを待つ。
 * ログイン画面自体の操作は一切行わない。
 */
export class UdioManualLoginFlow implements ManualLoginFlow {
  constructor(
    private readonly session: BrowserSession,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
    private readonly log: StepLogger = noopLogger,
  ) {}

  async run(): Promise<Result<CapturedSession, AuthError>> {
    this.log("Chrome起動中...");
    const page = await this.session.open();
    this.log("Chrome起動完了");

    const loginPage = new LoginPage(page, this.log);
    await loginPage.open();

    const loggedIn = await loginPage.waitUntilLoggedIn(this.timeoutMs);
    if (!loggedIn) {
      return failure<CapturedSession, AuthError>({
        type: "SessionNotFound",
      });
    }

    const serializedState = await page.captureStorageState();
    return success<CapturedSession, AuthError>({
      serializedState,
      capturedAt: new Date().toISOString(),
    });
  }
}
