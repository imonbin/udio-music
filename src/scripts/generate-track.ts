import { homedir } from "node:os";
import { join } from "node:path";
import { isFailure } from "../core/result/Result.js";
import { EncryptedFileCredentialStore } from "../adapters/secureStore/EncryptedFileCredentialStore.js";
import { PlaywrightBrowserSession } from "../adapters/browser/PlaywrightBrowserSession.js";
import { UdioAuthenticationManager } from "../adapters/renderers/udio/auth/UdioAuthenticationManager.js";
import { UdioManualLoginFlow } from "../adapters/renderers/udio/auth/UdioManualLoginFlow.js";
import { UdioAdapter } from "../adapters/renderers/udio/UdioAdapter.js";

const SECRETS_DIR = join(homedir(), ".udio-producer-mcp", "secrets");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(step: string): void {
  console.error(`[STEP] ${step}`);
}

async function main(): Promise<void> {
  const browserSession = new PlaywrightBrowserSession();
  try {
    await run(browserSession);
  } finally {
    // 強制終了(kill -9)はChromeを異常終了状態にし、次回起動時に「復元」ポップアップが
    // 表示されてクリックを妨げる原因になるため、必ず正常にcloseする。
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
  log(`認証状態: ${status.value}`);

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

  console.log(`プロンプトを送信します: "${prompt}"`);
  const submitResult = await renderer.submit({ prompt });
  if (isFailure(submitResult)) {
    console.error("生成の開始に失敗しました:", submitResult.error);
    process.exitCode = 1;
    return;
  }

  const jobId = submitResult.value;
  console.log(`ジョブID（曲ID）: ${jobId}`);
  console.log(`曲URL: https://www.udio.com/songs/${jobId}`);

  console.log("生成完了を待機します...");
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(`生成完了待機 (${attempt}/${maxAttempts})`);
    const pollResult = await renderer.pollStatus(jobId);
    if (isFailure(pollResult)) {
      console.error("状態確認に失敗しました:", pollResult.error);
      process.exitCode = 1;
      return;
    }
    if (pollResult.value === "ready") break;
    await sleep(5000);
  }

  const resultResult = await renderer.fetchResult(jobId);
  if (isFailure(resultResult)) {
    console.error("結果の取得に失敗しました:", resultResult.error);
    process.exitCode = 1;
    return;
  }

  console.log("生成完了:");
  console.log(JSON.stringify(resultResult.value, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("予期しないエラーが発生しました:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
