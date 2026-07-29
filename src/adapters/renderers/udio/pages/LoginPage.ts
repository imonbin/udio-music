import type { PageHandle } from "../../../browser/PageHandle.js";
import { noopLogger, type StepLogger } from "../../../browser/StepLogger.js";

const HOME_URL = "https://www.udio.com/home";
// ログイン済みの場合のみサイドバー下部に表示されるクレジット残高表示。
// Claude in Chromeでの実サイト調査で確認済み（未ログイン時の表示文言は未検証）。
const LOGGED_IN_MARKER = "credits";

/**
 * ログイン画面を自動操作することは一切行わない。ユーザーが手動でログインを完了する
 * （2FA/CAPTCHAを含む）のを待つだけの役割に限定する。
 * ログインURLの正確な仕様は未検証（Claude in Chromeでの調査時、既にログイン済みだったため）。
 */
export class LoginPage {
  constructor(
    private readonly page: PageHandle,
    private readonly log: StepLogger = noopLogger,
  ) {}

  async open(): Promise<void> {
    this.log("Udioホーム画面へ遷移中...");
    await this.page.goto(HOME_URL);
    this.log("Udioホーム画面の表示完了");
  }

  async isLoggedIn(): Promise<boolean> {
    const bodyText = (await this.page.textContent("body"))?.toLowerCase() ?? "";
    return bodyText.includes(LOGGED_IN_MARKER);
  }

  async waitUntilLoggedIn(timeoutMs: number, pollIntervalMs = 3000): Promise<boolean> {
    this.log("ログイン状態を確認中...");
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isLoggedIn()) {
        this.log("ログイン確認: 済み");
        return true;
      }
      await this.page.waitForTimeout(pollIntervalMs);
    }
    const finalCheck = await this.isLoggedIn();
    this.log(`ログイン確認: ${finalCheck ? "済み" : "未ログイン（タイムアウト）"}`);
    return finalCheck;
  }
}
