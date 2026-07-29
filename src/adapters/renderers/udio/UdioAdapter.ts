import { failure, isFailure, success } from "../../../core/result/Result.js";
import type { Result } from "../../../core/result/Result.js";
import type { Renderer, RendererExtender } from "../../../core/renderer/Renderer.js";
import type {
  GeneratedTrack,
  GenerationRequest,
  JobId,
  JobStatus,
  RendererCapabilities,
  RendererError,
} from "../../../core/renderer/types.js";
import type { SessionProvider } from "../../../core/auth/AuthenticationManager.js";
import type { BrowserSession } from "../../browser/BrowserSession.js";
import type { PageHandle } from "../../browser/PageHandle.js";
import { noopLogger, type StepLogger } from "../../browser/StepLogger.js";
import { CreatePage } from "./pages/CreatePage.js";

const SONG_URL_PREFIX = "https://www.udio.com/songs/";

export class UdioAdapter implements Renderer, RendererExtender {
  private readonly session: BrowserSession;
  private readonly sessionProvider: SessionProvider;
  private readonly log: StepLogger;
  private page: PageHandle | null = null;

  constructor(
    session: BrowserSession,
    sessionProvider: SessionProvider,
    log: StepLogger = noopLogger,
  ) {
    this.session = session;
    this.sessionProvider = sessionProvider;
    this.log = log;
  }

  getCapabilities(): RendererCapabilities {
    return {
      supportsExtend: true,
      supportsLyrics: true,
      supportsSeed: true,
      supportsNegativePrompt: true,
      supportsStemExport: false,
    };
  }

  private async ensurePage(): Promise<Result<PageHandle, RendererError>> {
    if (this.page) return success<PageHandle, RendererError>(this.page);

    const sessionResult = await this.sessionProvider.loadSession();
    if (isFailure(sessionResult)) {
      return failure<PageHandle, RendererError>({
        type: "SubmissionFailed",
        reason: "認証セッションの読み込みに失敗しました",
      });
    }
    if (!sessionResult.value) {
      return failure<PageHandle, RendererError>({
        type: "SubmissionFailed",
        reason: "Udioにログインしていません。先に認証を行ってください",
      });
    }

    this.log("Chrome起動中...");
    this.page = await this.session.open();
    this.log("Chrome起動完了");
    return success<PageHandle, RendererError>(this.page);
  }

  async submit(request: GenerationRequest): Promise<Result<JobId, RendererError>> {
    const pageResult = await this.ensurePage();
    if (isFailure(pageResult)) return pageResult;

    const createPage = new CreatePage(pageResult.value, this.log);
    await createPage.open();

    const newSongIds = await createPage.submitPrompt(request.prompt);
    if (newSongIds.length === 0) {
      return failure<JobId, RendererError>({
        type: "SubmissionFailed",
        reason: "生成開始後に新しい曲IDを検出できませんでした",
      });
    }

    return success<JobId, RendererError>(newSongIds[0] as JobId);
  }

  async extend(jobId: JobId): Promise<Result<JobId, RendererError>> {
    const pageResult = await this.ensurePage();
    if (isFailure(pageResult)) return pageResult;

    const createPage = new CreatePage(pageResult.value, this.log);
    const newSongIds = await createPage.extendSong(jobId);
    if (newSongIds.length === 0) {
      return failure<JobId, RendererError>({
        type: "SubmissionFailed",
        reason: "Extendの開始後に新しい曲IDを検出できませんでした",
      });
    }

    return success<JobId, RendererError>(newSongIds[0] as JobId);
  }

  async pollStatus(jobId: JobId): Promise<Result<JobStatus, RendererError>> {
    const pageResult = await this.ensurePage();
    if (isFailure(pageResult)) return pageResult;

    const createPage = new CreatePage(pageResult.value, this.log);
    const ready = await createPage.isSongReady(jobId);
    this.log(`生成状態確認: ${ready ? "完了" : "生成中"}`);
    return success<JobStatus, RendererError>(ready ? "ready" : "pending");
  }

  async fetchResult(jobId: JobId): Promise<Result<GeneratedTrack, RendererError>> {
    const pageResult = await this.ensurePage();
    if (isFailure(pageResult)) return pageResult;

    const createPage = new CreatePage(pageResult.value, this.log);
    const info = await createPage.getSongInfo(jobId);
    if (!info.ready) {
      return failure<GeneratedTrack, RendererError>({ type: "JobNotFound", jobId });
    }

    return success<GeneratedTrack, RendererError>({
      id: jobId,
      // ダウンロードは未実装（Widevine DRMのため要検証・要確認、docs/adr参照）
      audioFilePath: "",
      durationSec: info.durationSec ?? 0,
      rendererMeta: { songUrl: `${SONG_URL_PREFIX}${jobId}`, title: info.title },
    });
  }
}
