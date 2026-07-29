import type { StyleProfile } from "../prompt/types.js";

export type ProducerInput = {
  readonly theme: string;
  readonly previousFeedback?: string;
};

export type ProducerDirective = {
  readonly concept: string;
  readonly guidance: string;
  readonly targetProfile: StyleProfile;
};

export type ProducerError =
  | { readonly type: "InvalidInput"; readonly message: string }
  | { readonly type: "LLMFailure"; readonly message: string };
