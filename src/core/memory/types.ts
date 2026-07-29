import type { CriticVerdict } from "../critic/types.js";
import type { PromptObject, StyleProfile } from "../prompt/types.js";
import type { GeneratedTrack } from "../renderer/types.js";

export type HistoryEntry = {
  readonly id: string;
  readonly occurredAt: string;
  readonly prompt: PromptObject;
  readonly track?: GeneratedTrack;
  readonly verdict?: CriticVerdict;
};

export type Experiment = {
  readonly id: string;
  readonly hypothesis: string;
  readonly prompt: PromptObject;
  readonly outcome?: string;
};

export type SuccessfulPattern = {
  readonly id: string;
  readonly description: string;
  readonly prompt: PromptObject;
  readonly score: number;
};

export type FailedPattern = {
  readonly id: string;
  readonly description: string;
  readonly prompt: PromptObject;
  readonly reason: string;
};

export type FavoriteStructure = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export type FavoritePromptFragment = {
  readonly id: string;
  readonly field: keyof PromptObject;
  readonly value: string;
};

export type StylePreset = {
  readonly id: string;
  readonly name: string;
  readonly profile: StyleProfile;
};

export type MemoryQuery = {
  readonly text?: string;
  readonly limit?: number;
};

export type MemoryError =
  | { readonly type: "NotFound"; readonly id: string }
  | { readonly type: "StorageUnavailable"; readonly message: string };
