export type ListenerScore = {
  readonly axis: string;
  readonly score: number;
  readonly notes?: string;
};

export type ListenerError =
  | { readonly type: "AnalysisFailed"; readonly message: string }
  | { readonly type: "LLMFailure"; readonly message: string };
