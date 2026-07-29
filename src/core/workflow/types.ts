import type { CriticVerdict } from "../critic/types.js";
import type { GeneratedTrack } from "../renderer/types.js";

export type WorkflowState =
  | "idle"
  | "producing"
  | "rendering"
  | "reviewing"
  | "deciding"
  | "completed"
  | "iterating"
  | "aborted";

export type ProductionRequest = {
  readonly theme: string;
  readonly maxIterations?: number;
  readonly acceptanceThreshold?: number;
};

export type ProductionOutcome = {
  readonly track: GeneratedTrack;
  readonly verdict: CriticVerdict;
  readonly iterations: number;
};

export type WorkflowError =
  | { readonly type: "IterationLimitReached"; readonly iterations: number }
  | { readonly type: "ReauthenticationRequired"; readonly message: string }
  | { readonly type: "StageFailed"; readonly stage: WorkflowState; readonly message: string };
