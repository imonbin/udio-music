import { homedir } from "node:os";
import { join } from "node:path";
import { isFailure } from "../core/result/Result.js";
import { EncryptedFileCredentialStore } from "../adapters/secureStore/EncryptedFileCredentialStore.js";
import { PlaywrightBrowserSession } from "../adapters/browser/PlaywrightBrowserSession.js";
import { UdioAuthenticationManager } from "../adapters/renderers/udio/auth/UdioAuthenticationManager.js";
import { UdioManualLoginFlow } from "../adapters/renderers/udio/auth/UdioManualLoginFlow.js";
import { UdioAdapter } from "../adapters/renderers/udio/UdioAdapter.js";
import { generateLongTrack } from "./lib/generateLongTrack.js";

const SECRETS_DIR = join(homedir(), ".udio-producer-mcp", "secrets");

function log(step: string): void {
  console.error(`[STEP] ${step}`);
}

async function main(): Promise<void> {
  const browserSession = new PlaywrightBrowserSession();
  try {
    await run(browserSession);
  } finally {
    log("Chromeを正常終了します...");
    await browserSession.close();
  }
}

async function run(browserSession: PlaywrightBrowserSession): Promise<void> {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "A dark aggressive IDM track, broken beat, 140bpm, glitchy textures";

  const credentialStore = new EncryptedFileCredentialStore(SECRETS_DIR);
  const loginFlow = new UdioManualLoginFlow(browserSession, undefined, log);
  const auth = new UdioAuthenticationManager(credentialStore, loginFlow);

  log("認証状態を確認中...");
  const status = await auth.checkLoginStatus();
  if (isFailure(status)) {
    console.error("認証状態の確認に失敗しました:", status.error);
    process.exitCode = 1;
    return;
  }
  if (status.value !== "valid") {
    console.log(
      "Udioへのログインが必要です。ブラウザウィンドウが開くので手動でログインしてください。",
    );
    const reauth = await auth.requestReauthentication();
    if (isFailure(reauth)) {
      console.error("ログインに失敗しました:", reauth.error);
      process.exitCode = 1;
      return;
    }
    console.log(reauth.value.message);
  }

  const renderer = new UdioAdapter(browserSession, auth, log);
  const trackResult = await generateLongTrack(renderer, prompt, log);
  if (isFailure(trackResult)) {
    console.error("生成に失敗しました:", trackResult.error);
    process.exitCode = 1;
    return;
  }

  console.log("最終結果:");
  console.log(JSON.stringify(trackResult.value, null, 2));
}

main().catch((error: unknown) => {
  console.error("予期しないエラーが発生しました:", error);
  process.exitCode = 1;
});
