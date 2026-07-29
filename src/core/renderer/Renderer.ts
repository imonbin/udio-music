import type { Result } from "../result/Result.js";
import type {
  GenerationRequest,
  GeneratedTrack,
  JobId,
  JobStatus,
  RendererCapabilities,
  RendererError,
} from "./types.js";

export interface RendererCapabilityProvider {
  getCapabilities(): RendererCapabilities;
}

export interface RendererJobSubmitter {
  submit(request: GenerationRequest): Promise<Result<JobId, RendererError>>;
}

export interface RendererJobStatusChecker {
  pollStatus(jobId: JobId): Promise<Result<JobStatus, RendererError>>;
}

export interface RendererResultFetcher {
  fetchResult(jobId: JobId): Promise<Result<GeneratedTrack, RendererError>>;
}

/**
 * getCapabilities().supportsExtendがtrueのRendererのみが実装する。
 * 既存のトラックを延長し、新しいJobId（延長後のトラック）を返す。
 */
export interface RendererExtender {
  extend(jobId: JobId): Promise<Result<JobId, RendererError>>;
}

export interface Renderer
  extends
    RendererCapabilityProvider,
    RendererJobSubmitter,
    RendererJobStatusChecker,
    RendererResultFetcher {}
