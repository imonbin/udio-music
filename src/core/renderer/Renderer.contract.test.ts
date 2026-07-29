import { describe, expect, it } from "vitest";
import { failure, isFailure, isSuccess, success } from "../result/Result.js";
import type { Renderer } from "./Renderer.js";
import type {
  GeneratedTrack,
  GenerationRequest,
  JobId,
  JobStatus,
  RendererCapabilities,
  RendererError,
} from "./types.js";

class FakeRenderer implements Renderer {
  private readonly capabilities: RendererCapabilities;
  private readonly track: GeneratedTrack;

  constructor(capabilities: RendererCapabilities, track: GeneratedTrack) {
    this.capabilities = capabilities;
    this.track = track;
  }

  getCapabilities(): RendererCapabilities {
    return this.capabilities;
  }

  async submit(_request: GenerationRequest) {
    return success<JobId, RendererError>("job-1");
  }

  async pollStatus(_jobId: JobId) {
    return success<JobStatus, RendererError>("ready");
  }

  async fetchResult(jobId: JobId) {
    if (jobId !== "job-1") {
      return failure<GeneratedTrack, RendererError>({ type: "JobNotFound", jobId });
    }
    return success<GeneratedTrack, RendererError>(this.track);
  }
}

const capabilities: RendererCapabilities = {
  supportsExtend: true,
  supportsLyrics: false,
  supportsSeed: true,
  supportsNegativePrompt: true,
  supportsStemExport: false,
};

const track: GeneratedTrack = {
  id: "job-1",
  audioFilePath: "/output/tracks/job-1.mp3",
  durationSec: 180,
  rendererMeta: {},
};

describe("Renderer contract", () => {
  it("exposes capabilities without side effects", () => {
    const renderer: Renderer = new FakeRenderer(capabilities, track);
    expect(renderer.getCapabilities()).toEqual(capabilities);
  });

  it("submits a request and returns a JobId on success", async () => {
    const renderer: Renderer = new FakeRenderer(capabilities, track);
    const result = await renderer.submit({ prompt: "dark IDM, 140bpm" });

    expect(isSuccess(result)).toBe(true);
  });

  it("fetches the result for a known job", async () => {
    const renderer: Renderer = new FakeRenderer(capabilities, track);
    const result = await renderer.fetchResult("job-1");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual(track);
    }
  });

  it("returns a typed RendererError for an unknown job instead of throwing", async () => {
    const renderer: Renderer = new FakeRenderer(capabilities, track);
    const result = await renderer.fetchResult("unknown-job");

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toEqual({ type: "JobNotFound", jobId: "unknown-job" });
    }
  });
});
