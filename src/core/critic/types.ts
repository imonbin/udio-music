export type CriticRecommendation = "adopt" | "iterate" | "reject";

export type CriticVerdict = {
  readonly recommendation: CriticRecommendation;
  readonly score: number;
  readonly feedback: string;
};

export type CriticError =
  | { readonly type: "NoScoresAvailable" }
  | { readonly type: "LLMFailure"; readonly message: string };
