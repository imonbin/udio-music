import { homedir } from "node:os";
import { join } from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { BrowserSession, BrowserSessionOptions } from "./BrowserSession.js";
import type { LinkRow, PageHandle } from "./PageHandle.js";

const DEDICATED_PROFILE_DIR = join(homedir(), ".udio-producer-mcp", "chrome-profile");

export class ChromeConnectionError extends Error {}

function wrapPage(page: Page): PageHandle {
  return {
    async goto(url) {
      await page.goto(url);
    },
    async fill(selector, value) {
      await page.fill(selector, value);
    },
    async click(selector) {
      await page.click(selector);
    },
    async clickNth(selector, index) {
      await page.locator(selector).nth(index).click();
    },
    async textContent(selector) {
      return page.textContent(selector);
    },
    async hrefs(selector) {
      return page.$$eval(selector, (elements) =>
        elements.map((el) => el.getAttribute("href") ?? "").filter((href) => href.length > 0),
      );
    },
    async rowTexts(linkSelector): Promise<LinkRow[]> {
      return page.$$eval(linkSelector, (links) =>
        links.map((link) => {
          // Udioのライブラリ行DOMでは、リンクの2階層上の親要素が
          // タイトル・タグ・再生時間をちょうど過不足なく含む行コンテナになる
          // （Claude in Chromeでの実サイト調査で確認済み。closest("button")は
          //  タイトルのみしか含まない別要素にマッチしてしまうため使わない）。
          const row = link.parentElement?.parentElement ?? link.parentElement ?? link;
          const texts = [...row.querySelectorAll("span,div")]
            .map((el) => (el.textContent ?? "").trim())
            .filter((text) => text.length > 0);
          return { href: link.getAttribute("href") ?? "", texts };
        }),
      );
    },
    async isVisible(selector) {
      return page.isVisible(selector);
    },
    async waitForTimeout(ms) {
      await page.waitForTimeout(ms);
    },
    async captureStorageState() {
      return JSON.stringify(await page.context().storageState());
    },
  };
}

/**
 * Playwrightを直接importする唯一のモジュール。UdioAdapter・各種ログインフロー・
 * Page Object Modelはこのクラスが実装する`BrowserSession` interfaceのみに依存し、
 * Playwright本体を意識しない。
 *
 * 経緯（要点）:
 *   - ユーザーの日常使いのChromeプロファイルは、Chrome自体の仕様（2024年以降）により
 *     デフォルトプロファイルでのリモートデバッグが無効化されており、CDP接続できない。
 *   - 手動起動した実Chrome.appプロセスへのPlaywright connectOverCDP()も、
 *     ブラウザレベルの自動化機能（複数コンテキスト管理）が使えず失敗する。
 *   - 唯一確実に動作するのは、Playwright自身がlaunchPersistentContext()で
 *     ブラウザを起動する方式。日常使いのプロファイルを複製した専用ディレクトリ
 *     （DEDICATED_PROFILE_DIR）を使うことで、Udioログイン状態を引き継ぎつつ
 *     日常使いのChromeには一切触れない。
 *
 * 1プロセス内では同じBrowserContext（同じタブ）を使い回し、close()はタブのみを閉じる。
 */
export class PlaywrightBrowserSession implements BrowserSession {
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  async open(_options: BrowserSessionOptions = {}): Promise<PageHandle> {
    if (this.page) return wrapPage(this.page);

    try {
      this.context = await chromium.launchPersistentContext(DEDICATED_PROFILE_DIR, {
        headless: false,
        channel: "chrome",
        // 複製元プロファイルの言語設定に関わらず判定ロジックを安定させるため英語UIに固定する
        locale: "en-US",
      });
      this.page = this.context.pages()[0] ?? (await this.context.newPage());
    } catch (error) {
      throw new ChromeConnectionError(
        `専用プロファイル（${DEDICATED_PROFILE_DIR}）でのChrome起動に失敗しました。` +
          ` (原因: ${error instanceof Error ? error.message : String(error)})`,
      );
    }

    return wrapPage(this.page);
  }

  /** タブのみを閉じる。専用プロファイルのChromeプロセス自体は次回実行のため残す設計だが、
   *  launchPersistentContextはプロセスと1対1のため、実際にはプロセスも終了する。 */
  async close(): Promise<void> {
    await this.context?.close();
    this.context = null;
    this.page = null;
  }
}
