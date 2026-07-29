export type GenerateInput = {
  readonly instruction: string;
  readonly context?: Readonly<Record<string, unknown>>;
};

export type ReviewInput = {
  readonly subject: string;
  readonly criteria: readonly string[];
  readonly context?: Readonly<Record<string, unknown>>;
};

export type ReviewResult = {
  readonly score: number;
  readonly summary: string;
  readonly notes: readonly string[];
};

export type ImproveInput = {
  readonly original: string;
  readonly feedback: string;
};

export type SummarizeInput = {
  readonly content: string;
  readonly maxLength?: number;
};

export type LLMError =
  | {
      readonly type: "ProviderUnavailable";
      readonly providerName: string;
      readonly message: string;
    }
  | { readonly type: "InvalidResponse"; readonly message: string }
  | { readonly type: "RateLimited"; readonly retryAfterSec?: number };
