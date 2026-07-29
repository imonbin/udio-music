import { isFailure, success } from "../../core/result/Result.js";
import type { Result } from "../../core/result/Result.js";
import type { GeneratedTrack, JobId, RendererError } from "../../core/renderer/types.js";
import type { UdioAdapter } from "../../adapters/renderers/udio/UdioAdapter.js";

export type StepLogFn = (step: string) => void;

const TARGET_MIN_SEC = 180;
const TARGET_MAX_SEC = 300;
const MAX_EXTENDS = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(
  renderer: UdioAdapter,
  jobId: JobId,
  log: StepLogFn,
  maxAttempts = 30,
): Promise<Result<void, RendererError>> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    log(`完了待機 (${attempt}/${maxAttempts})`);
    const pollResult = await renderer.pollStatus(jobId);
    if (isFailure(pollResult)) return pollResult;
    if (pollResult.value === "ready") return success<void, RendererError>(undefined);
    await sleep(5000);
  }
  return success<void, RendererError>(undefined);
}

/**
 * 1曲を生成し、目標時間（3〜5分）に届くまでExtendを繰り返す。
 * MAX_EXTENDS回で届かない場合は、その時点の最新トラックを返す（失敗にはしない）。
 */
export async function generateLongTrack(
  renderer: UdioAdapter,
  prompt: string,
  log: StepLogFn,
): Promise<Result<GeneratedTrack, RendererError>> {
  log(`プロンプトを送信します: "${prompt}"`);
  const submitResult = await renderer.submit({ prompt });
  if (isFailure(submitResult)) return submitResult;

  let jobId: JobId = submitResult.value;
  log(`ジョブID（曲ID）: ${jobId}`);

  const readyResult = await waitForReady(renderer, jobId, log);
  if (isFailure(readyResult)) return readyResult;

  let trackResult = await renderer.fetchResult(jobId);
  if (isFailure(trackResult)) return trackResult;

  log(
    `初回生成完了: "${String(trackResult.value.rendererMeta.title)}" (${trackResult.value.durationSec}秒)`,
  );

  let extendCount = 0;
  while (trackResult.value.durationSec < TARGET_MIN_SEC && extendCount < MAX_EXTENDS) {
    extendCount++;
    log(
      `目標時間(${TARGET_MIN_SEC}〜${TARGET_MAX_SEC}秒)に届いていません。Extendします (${extendCount}/${MAX_EXTENDS})...`,
    );

    const extendResult = await renderer.extend(jobId);
    if (isFailure(extendResult)) return extendResult;

    jobId = extendResult.value;
    log(`Extend後のジョブID: ${jobId}`);

    const extendReadyResult = await waitForReady(renderer, jobId, log);
    if (isFailure(extendReadyResult)) return extendReadyResult;

    trackResult = await renderer.fetchResult(jobId);
    if (isFailure(trackResult)) return trackResult;

    log(
      `Extend完了: "${String(trackResult.value.rendererMeta.title)}" (${trackResult.value.durationSec}秒)`,
    );
  }

  return trackResult;
}
