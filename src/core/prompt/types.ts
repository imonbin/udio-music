export type StyleProfile = {
  readonly genre: string;
  readonly mood: readonly string[];
  readonly rhythm: string;
  readonly texture: string;
  readonly mix: string;
};

export type PromptObject = {
  readonly genre: string;
  readonly mood: readonly string[];
  readonly rhythm: string;
  readonly texture: string;
  readonly mix: string;
  readonly negativePrompt?: string;
  readonly seed?: string;
  readonly rendererParameters: Readonly<Record<string, unknown>>;
  readonly version: number;
  readonly parentVersion?: number;
};

export type PromptFieldDiff = {
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
};

export type PromptEngineerError =
  | { readonly type: "UnsupportedCapability"; readonly capability: string }
  | { readonly type: "InvalidDirective"; readonly message: string }
  | { readonly type: "LLMFailure"; readonly message: string };
