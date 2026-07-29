import type { Result } from "../result/Result.js";
import type {
  GenerateInput,
  ImproveInput,
  LLMError,
  ReviewInput,
  ReviewResult,
  SummarizeInput,
} from "./types.js";

export interface TextGenerator {
  generate(input: GenerateInput): Promise<Result<string, LLMError>>;
}

export interface ReviewGenerator {
  review(input: ReviewInput): Promise<Result<ReviewResult, LLMError>>;
}

export interface ImprovementGenerator {
  improve(input: ImproveInput): Promise<Result<string, LLMError>>;
}

export interface Summarizer {
  summarize(input: SummarizeInput): Promise<Result<string, LLMError>>;
}

export interface LLMProvider
  extends TextGenerator, ReviewGenerator, ImprovementGenerator, Summarizer {
  readonly name: string;
}
