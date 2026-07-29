import type { PageHandle } from "../../../browser/PageHandle.js";
import { noopLogger, type StepLogger } from "../../../browser/StepLogger.js";

const CREATE_URL = "https://www.udio.com/create";
const SONG_URL_PREFIX = "https://www.udio.com/songs/";
const SONG_LINK_SELECTOR = 'a[href*="/songs/"]';
const PROMPT_TEXTAREA_SELECTOR = ":nth-match(textarea, 1)";
const CREATE_BUTTON_SELECTOR = 'role=button[name="Create"]';
const EXTEND_BUTTON_SELECTOR = 'role=button[name="Extend"]';
const EXTEND_MENU_ITEM_SELECTOR = 'text="Extend"';
// 曲個別ページには"Create"という名前のボタンが2つ存在する（0番目: 画面右上のグローバルナビ、
// 1番目: 曲タイトル直下のドロップダウン）。後者がRemix/Extend等のメニューを開く。
// 位置（出現順）に依存するため、Udio側のUI変更で崩れる可能性がある（要監視）。
const SONG_PAGE_DROPDOWN_SELECTOR = 'role=button[name="Create"]';
const SONG_PAGE_DROPDOWN_INDEX = 1;
// ライブラリ行の再生時間表記は "0014m2:10"（いいね0・よくないね0・経過時間14m・再生時間2:10）
// のように連結されているため、末尾のm:ss部分のみを抽出する。
const DURATION_PATTERN = /(\d+):(\d{2})$/;

export type SongInfo = {
  readonly ready: boolean;
  readonly title: string | null;
  readonly durationSec: number | null;
};

function extractSongId(href: string): string {
  const match = href.match(/\/songs\/([^/?#]+)/);
  return match?.[1] ?? "";
}

function findDurationMatch(texts: readonly string[]): RegExpMatchArray | null {
  for (const text of texts) {
    const match = text.match(DURATION_PATTERN);
    if (match) return match;
  }
  return null;
}

function parseDurationToSeconds(match: RegExpMatchArray): number {
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

/**
 * Udioの/createページのPage Object Model。
 * セレクタはClaude in Chromeによる実サイト調査で確認済み（2026-07-27時点）。
 * Udio側のUI変更に追従が必要になった場合はこのファイルのみを修正すればよい。
 */
export class CreatePage {
  constructor(
    private readonly page: PageHandle,
    private readonly log: StepLogger = noopLogger,
  ) {}

  /**
   * ライブラリ一覧の非同期読み込みが完了する前にsubmitPrompt()の「生成前」スナップショットを
   * 取ってしまうと、既存の古い曲IDを新規曲と誤検知するため、最低1件の曲リンクが
   * 描画されるまで待ってから返す。
   */
  async open(timeoutMs = 15000): Promise<void> {
    this.log("Create画面へ遷移中...");
    await this.page.goto(CREATE_URL);

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const hrefs = await this.page.hrefs(SONG_LINK_SELECTOR);
      if (hrefs.length > 0) {
        this.log(`Create画面 表示完了（既存曲${hrefs.length}件を検出）`);
        return;
      }
      await this.page.waitForTimeout(500);
    }
    this.log("警告: Create画面でライブラリ一覧の読み込みを検出できませんでした（タイムアウト）");
  }

  private async currentSongIds(): Promise<Set<string>> {
    const hrefs = await this.page.hrefs(SONG_LINK_SELECTOR);
    return new Set(hrefs.map(extractSongId).filter(Boolean));
  }

  /**
   * プロンプトを入力しCreateを押下する。Udioは1回のCreateで2曲を生成するため、
   * 新規に出現した曲IDをすべて返す（Phase1のUdioAdapterは先頭の1件のみを使用する）。
   *
   * クリックが実際の生成をトリガーしないことが稀にある（クレジットも消費されない、
   * 実サイト調査で確認済みの既知の不安定挙動）ため、1回のフォーム再入力+再クリックまで
   * リトライする。
   */
  async submitPrompt(
    prompt: string,
    perAttemptTimeoutMs = 45000,
    maxAttempts = 2,
  ): Promise<string[]> {
    const before = await this.stableSongIds();
    this.log(`プロンプト入力前の基準: 既存曲${before.size}件`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.log(`送信試行 ${attempt}/${maxAttempts}`);

      await this.page.fill(PROMPT_TEXTAREA_SELECTOR, prompt);
      this.log(`プロンプト入力完了: "${prompt}" (セレクタ: ${PROMPT_TEXTAREA_SELECTOR})`);

      await this.page.click(CREATE_BUTTON_SELECTOR);
      this.log(
        `Createボタンをクリックしました (セレクタ: ${CREATE_BUTTON_SELECTOR})。新規曲IDの出現を待機中...`,
      );

      const newIds = await this.waitForNewSongIds(before, perAttemptTimeoutMs);
      if (newIds.length > 0) {
        this.log(`新規曲IDを検出: ${newIds.join(", ")}`);
        return newIds;
      }

      this.log(`失敗理由: 試行${attempt}でクリックが生成をトリガーしなかった（新規曲ID未検出）`);
    }

    this.log(`警告: ${maxAttempts}回試行しても新規曲IDを検出できませんでした`);
    return [];
  }

  private async stableSongIds(): Promise<Set<string>> {
    // ライブラリ一覧が読み込み途中で件数が増え続けている間は「生成前」の基準にしない。
    let ids = await this.currentSongIds();
    for (let i = 0; i < 5; i++) {
      await this.page.waitForTimeout(500);
      const recheck = await this.currentSongIds();
      if (recheck.size === ids.size) break;
      ids = recheck;
    }
    return ids;
  }

  private async waitForNewSongIds(before: Set<string>, timeoutMs: number): Promise<string[]> {
    const start = Date.now();
    let lastLoggedSecond = -1;
    while (Date.now() - start < timeoutMs) {
      const after = await this.currentSongIds();
      const newIds = [...after].filter((id) => !before.has(id));
      if (newIds.length > 0) return newIds;

      const elapsedSec = Math.floor((Date.now() - start) / 5000) * 5;
      if (elapsedSec !== lastLoggedSecond) {
        lastLoggedSecond = elapsedSec;
        this.log(
          `新規曲ID待機中... (${elapsedSec}秒経過、セレクタ: ${SONG_LINK_SELECTOR}、現在${after.size}件)`,
        );
      }
      await this.page.waitForTimeout(1000);
    }
    return [];
  }

  /**
   * 既存の曲の個別ページを開き、「Create」ドロップダウン→「Extend」を選択して
   * /createページのExtendモードへ遷移し、Extendボタンを押下する。
   * プロンプトや延長位置（Extension Placement）は既定値のまま変更しない
   * （どの位置に追加しても再生時間は伸びるため、MVPでは選択しない）。
   */
  async extendSong(
    songId: string,
    perAttemptTimeoutMs = 45000,
    maxAttempts = 2,
  ): Promise<string[]> {
    this.log(`曲個別ページへ遷移中... (songId=${songId})`);
    await this.page.goto(`${SONG_URL_PREFIX}${songId}`);
    await this.page.waitForTimeout(2000);

    await this.page.clickNth(SONG_PAGE_DROPDOWN_SELECTOR, SONG_PAGE_DROPDOWN_INDEX);
    this.log(
      `Createドロップダウンを開きました (セレクタ: ${SONG_PAGE_DROPDOWN_SELECTOR}[${SONG_PAGE_DROPDOWN_INDEX}])`,
    );

    await this.page.click(EXTEND_MENU_ITEM_SELECTOR);
    this.log(`Extendメニューを選択しました (セレクタ: ${EXTEND_MENU_ITEM_SELECTOR})`);
    await this.page.waitForTimeout(2000);

    const before = await this.stableSongIds();
    this.log(`Extend実行前の基準: 既存曲${before.size}件`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.log(`Extend送信試行 ${attempt}/${maxAttempts}`);

      await this.page.click(EXTEND_BUTTON_SELECTOR);
      this.log(
        `Extendボタンをクリックしました (セレクタ: ${EXTEND_BUTTON_SELECTOR})。新規曲IDの出現を待機中...`,
      );

      const newIds = await this.waitForNewSongIds(before, perAttemptTimeoutMs);
      if (newIds.length > 0) {
        this.log(`Extend後の新規曲IDを検出: ${newIds.join(", ")}`);
        return newIds;
      }

      this.log(
        `失敗理由: Extend試行${attempt}でクリックが延長をトリガーしなかった（新規曲ID未検出）`,
      );
    }

    this.log(`警告: ${maxAttempts}回試行してもExtend後の新規曲IDを検出できませんでした`);
    return [];
  }

  async isSongReady(songId: string): Promise<boolean> {
    return (await this.getSongInfo(songId)).ready;
  }

  /** タイトルは行内の最初のテキストと仮定する（実サイト調査で確認したDOM順序に基づく）。 */
  async getSongInfo(songId: string): Promise<SongInfo> {
    const rows = await this.page.rowTexts(SONG_LINK_SELECTOR);
    const row = rows.find((r) => extractSongId(r.href) === songId);
    if (!row) {
      this.log(
        `曲情報取得失敗: songId=${songId} がセレクタ ${SONG_LINK_SELECTOR} の結果(${rows.length}件)に見つかりません`,
      );
      return { ready: false, title: null, durationSec: null };
    }

    const durationMatch = findDurationMatch(row.texts);
    return {
      ready: durationMatch !== null,
      title: row.texts[0] ?? null,
      durationSec: durationMatch ? parseDurationToSeconds(durationMatch) : null,
    };
  }
}
