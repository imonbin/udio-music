export type LinkRow = {
  readonly href: string;
  readonly texts: readonly string[];
};

/**
 * Playwrightの実装詳細を隠蔽する最小限のページ操作interface。
 * adapters/renderers配下のPage Object Model（CreatePage等）や
 * adapters/renderers配下の各ログインフローは、この interfaceにのみ依存し
 * Playwright本体を直接importしない。
 */
export interface PageHandle {
  goto(url: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  /** selectorに一致する要素が複数ある場合にindex番目をクリックする。 */
  clickNth(selector: string, index: number): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  hrefs(selector: string): Promise<string[]>;
  /** linkSelectorに一致する各リンクについて、hrefと祖先要素内のテキスト一覧を返す。 */
  rowTexts(linkSelector: string): Promise<LinkRow[]>;
  isVisible(selector: string): Promise<boolean>;
  waitForTimeout(ms: number): Promise<void>;
  captureStorageState(): Promise<string>;
}
