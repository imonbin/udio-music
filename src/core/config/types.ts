export type ConfigVersion = 1;

export type RendererSelection = "udio";

export type LLMProviderName = "mcpSampling";

export type AgentLLMAssignment = {
  readonly producer: LLMProviderName;
  readonly promptEngineer: LLMProviderName;
  readonly critic: LLMProviderName;
};

export type WorkflowSettings = {
  readonly maxIterations: number;
  readonly acceptanceThreshold: number;
};

export type IdmPreset = {
  readonly genre: string;
  readonly mood: readonly string[];
  readonly rhythm: string;
  readonly texture: string;
  readonly mix: string;
};

export type StoragePaths = {
  readonly outputDir: string;
  readonly memoryDataDir: string;
};

export type AppConfig = {
  readonly version: ConfigVersion;
  readonly renderer: RendererSelection;
  readonly llmProviders: AgentLLMAssignment;
  readonly workflow: WorkflowSettings;
  readonly idmPreset: IdmPreset;
  readonly storage: StoragePaths;
};

export type ConfigValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type ConfigError =
  | { readonly type: "FileNotFound"; readonly path: string }
  | { readonly type: "ParseError"; readonly message: string }
  | { readonly type: "ValidationError"; readonly issues: readonly ConfigValidationIssue[] };
