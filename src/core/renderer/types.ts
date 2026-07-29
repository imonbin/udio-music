export type JobId = string;

export type GenerationRequest = {
  readonly prompt: string;
  readonly styleTags?: readonly string[];
  readonly durationSec?: number;
  readonly seed?: string;
  readonly negativePrompt?: string;
  readonly rendererParameters?: Readonly<Record<string, unknown>>;
};

export type GeneratedTrack = {
  readonly id: string;
  readonly audioFilePath: string;
  readonly durationSec: number;
  readonly rendererMeta: Readonly<Record<string, unknown>>;
};

export type JobStatus = "pending" | "ready" | "failed";

export type RendererCapabilities = {
  readonly supportsExtend: boolean;
  readonly supportsLyrics: boolean;
  readonly supportsSeed: boolean;
  readonly supportsNegativePrompt: boolean;
  readonly supportsStemExport: boolean;
};

export type RendererError =
  | { readonly type: "SubmissionFailed"; readonly reason: string }
  | { readonly type: "JobNotFound"; readonly jobId: JobId }
  | { readonly type: "Timeout"; readonly jobId: JobId }
  | { readonly type: "CapabilityNotSupported"; readonly capability: string };
