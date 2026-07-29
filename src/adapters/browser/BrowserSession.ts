import type { PageHandle } from "./PageHandle.js";

export type BrowserSessionOptions = {
  readonly debugPort?: number;
};

/**
 * ブラウザ接続の抽象化。UdioAdapter・各種ログインフローはこのinterfaceにのみ依存し、
 * 具体的な接続方式（CDP接続か、将来別方式か）を意識しない。
 */
export interface BrowserSession {
  open(options?: BrowserSessionOptions): Promise<PageHandle>;
  close(): Promise<void>;
}
