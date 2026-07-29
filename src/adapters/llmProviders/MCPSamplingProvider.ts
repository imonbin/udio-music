import { failure, isFailure, success } from "../../core/result/Result.js";
import type { Result } from "../../core/result/Result.js";
import type { LLMProvider } from "../../core/llm/LLMProvider.js";
import type {
  GenerateInput,
  ImproveInput,
  LLMError,
  ReviewInput,
  ReviewResult,
  SummarizeInput,
} from "../../core/llm/types.js";
import type { McpSamplingClient } from "./McpSamplingClient.js";

export type MCPSamplingProviderOptions = {
  readonly maxTokens?: number;
};

export class MCPSamplingProvider implements LLMProvider {
  readonly name = "mcpSampling";
  private readonly client: McpSamplingClient;
  private readonly maxTokens: number;

  constructor(client: McpSamplingClient, options: MCPSamplingProviderOptions = {}) {
    this.client = client;
    this.maxTokens = options.maxTokens ?? 1024;
  }

  private async complete(prompt: string, systemPrompt?: string): Promise<Result<string, LLMError>> {
    let response;
    try {
      response = await this.client.createMessage({
        messages: [{ role: "user", content: { type: "text", text: prompt } }],
        ...(systemPrompt !== undefined ? { systemPrompt } : {}),
        maxTokens: this.maxTokens,
      });
    } catch (error) {
      return failure<string, LLMError>({
        type: "ProviderUnavailable",
        providerName: this.name,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    if (response.content.type !== "text") {
      return failure<string, LLMError>({
        type: "InvalidResponse",
        message: `テキスト以外のコンテンツが返されました: ${response.content.type}`,
      });
    }

    return success<string, LLMError>((response.content as { text: string }).text);
  }

  async generate(input: GenerateInput): Promise<Result<string, LLMError>> {
    const context = input.context ? `\n\nContext:\n${JSON.stringify(input.context)}` : "";
    return this.complete(`${input.instruction}${context}`);
  }

  async review(input: ReviewInput): Promise<Result<ReviewResult, LLMError>> {
    const prompt = [
      `Review the following subject against these criteria: ${input.criteria.join(", ")}.`,
      `Subject:\n${input.subject}`,
      `Respond with JSON only: {"score": number between 0 and 1, "summary": string, "notes": string[]}`,
    ].join("\n\n");

    const completion = await this.complete(prompt);
    if (isFailure(completion)) return completion;

    try {
      const parsed = JSON.parse(completion.value) as {
        score: number;
        summary: string;
        notes?: string[];
      };
      return success<ReviewResult, LLMError>({
        score: parsed.score,
        summary: parsed.summary,
        notes: parsed.notes ?? [],
      });
    } catch {
      return failure<ReviewResult, LLMError>({
        type: "InvalidResponse",
        message: "レビュー結果のJSON解析に失敗しました",
      });
    }
  }

  async improve(input: ImproveInput): Promise<Result<string, LLMError>> {
    const prompt = [
      `Revise the following text based on the feedback.`,
      `Original:\n${input.original}`,
      `Feedback:\n${input.feedback}`,
    ].join("\n\n");

    return this.complete(prompt);
  }

  async summarize(input: SummarizeInput): Promise<Result<string, LLMError>> {
    const lengthHint = input.maxLength ? ` in at most ${input.maxLength} characters` : "";
    const prompt = `Summarize the following content${lengthHint}:\n\n${input.content}`;

    return this.complete(prompt);
  }
}
