import { describe, expect, it } from "vitest";
import { failure, isFailure, isSuccess, success } from "../result/Result.js";
import type { LLMProvider } from "./LLMProvider.js";
import type {
  GenerateInput,
  ImproveInput,
  LLMError,
  ReviewInput,
  ReviewResult,
  SummarizeInput,
} from "./types.js";

class FakeLLMProvider implements LLMProvider {
  readonly name = "fake";
  private readonly available: boolean;

  constructor(available: boolean) {
    this.available = available;
  }

  private unavailable<T>() {
    return failure<T, LLMError>({
      type: "ProviderUnavailable",
      providerName: this.name,
      message: "利用できません",
    });
  }

  async generate(input: GenerateInput) {
    if (!this.available) return this.unavailable<string>();
    return success<string, LLMError>(`generated: ${input.instruction}`);
  }

  async review(input: ReviewInput) {
    if (!this.available) return this.unavailable<ReviewResult>();
    return success<ReviewResult, LLMError>({
      score: 0.8,
      summary: `reviewed: ${input.subject}`,
      notes: [],
    });
  }

  async improve(input: ImproveInput) {
    if (!this.available) return this.unavailable<string>();
    return success<string, LLMError>(`${input.original} (improved: ${input.feedback})`);
  }

  async summarize(input: SummarizeInput) {
    if (!this.available) return this.unavailable<string>();
    return success<string, LLMError>(input.content.slice(0, input.maxLength ?? 100));
  }
}

describe("LLMProvider contract", () => {
  it("generate returns a Success with text", async () => {
    const provider: LLMProvider = new FakeLLMProvider(true);
    const result = await provider.generate({ instruction: "dark IDM track" });

    expect(isSuccess(result)).toBe(true);
  });

  it("returns a typed ProviderUnavailable error instead of throwing when the provider is down", async () => {
    const provider: LLMProvider = new FakeLLMProvider(false);
    const result = await provider.generate({ instruction: "dark IDM track" });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ProviderUnavailable");
    }
  });

  it("review returns a score and summary", async () => {
    const provider: LLMProvider = new FakeLLMProvider(true);
    const result = await provider.review({ subject: "track-1", criteria: ["rhythm"] });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.score).toBeGreaterThanOrEqual(0);
      expect(result.value.score).toBeLessThanOrEqual(1);
    }
  });
});
