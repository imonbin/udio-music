import { homedir } from "node:os";
import { join } from "node:path";
import { isFailure } from "../core/result/Result.js";
import type { GeneratedTrack } from "../core/renderer/types.js";
import { EncryptedFileCredentialStore } from "../adapters/secureStore/EncryptedFileCredentialStore.js";
import { PlaywrightBrowserSession } from "../adapters/browser/PlaywrightBrowserSession.js";
import { UdioAuthenticationManager } from "../adapters/renderers/udio/auth/UdioAuthenticationManager.js";
import { UdioManualLoginFlow } from "../adapters/renderers/udio/auth/UdioManualLoginFlow.js";
import { UdioAdapter } from "../adapters/renderers/udio/UdioAdapter.js";
import { generateLongTrack } from "./lib/generateLongTrack.js";

const SECRETS_DIR = join(homedir(), ".udio-producer-mcp", "secrets");

const PROMPTS = [
  "A dark aggressive IDM track, broken beat, 140bpm, glitchy textures",
  "A melancholic ambient IDM track, granular textures, slow evolving pads, 90bpm",
  "An intricate braindance track, complex polyrhythms, warm analog textures, 160bpm",
  "A hypnotic minimal techno-influenced IDM track, driving rhythm, cold metallic tones, 130bpm",
  "A chaotic drill'n'bass track, fast breakbeats, distorted bass, 170bpm",
];

function log(step: string): void {
  console.error(`[STEP] ${step}`);
}

async function main(): Promise<void> {
  const browserSession = new PlaywrightBrowserSession();
  const results: Array<{ prompt: string; track?: GeneratedTrack; error?: unknown }> = [];

  try {
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

    for (let i = 0; i < PROMPTS.length; i++) {
      const prompt = PROMPTS[i] as string;
      console.log(`\n===== 曲 ${i + 1}/${PROMPTS.length} =====`);
      const trackResult = await generateLongTrack(renderer, prompt, log);
      if (isFailure(trackResult)) {
        console.error(`曲${i + 1}の生成に失敗しました:`, trackResult.error);
        results.push({ prompt, error: trackResult.error });
        continue;
      }
      console.log(`曲${i + 1}完了:`, JSON.stringify(trackResult.value, null, 2));
      results.push({ prompt, track: trackResult.value });
    }
  } finally {
    log("Chromeを正常終了します...");
    await browserSession.close();
  }

  console.log("\n===== バッチ生成サマリー =====");
  for (const [i, result] of results.entries()) {
    if (result.track) {
      console.log(
        `${i + 1}. "${String(result.track.rendererMeta.title)}" - ${result.track.durationSec}秒 - ${String(result.track.rendererMeta.songUrl)}`,
      );
    } else {
      console.log(`${i + 1}. 失敗: ${JSON.stringify(result.error)}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error("予期しないエラーが発生しました:", error);
  process.exitCode = 1;
});
