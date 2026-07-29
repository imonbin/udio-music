import type { ReauthenticationInstruction } from "../auth/types.js";
import type { CriticVerdict } from "../critic/types.js";
import type { ListenerScore } from "../listeners/types.js";
import type { ProducerDirective } from "../producer/types.js";
import type { PromptObject } from "../prompt/types.js";
import type { GeneratedTrack, JobId } from "../renderer/types.js";

export type GenerationRequested = {
  readonly type: "GenerationRequested";
  readonly prompt: PromptObject;
};
export type GenerationCompleted = {
  readonly type: "GenerationCompleted";
  readonly jobId: JobId;
  readonly track: GeneratedTrack;
};
export type GenerationFailed = {
  readonly type: "GenerationFailed";
  readonly jobId: JobId;
  readonly reason: string;
};
export type AudioAnalyzed = { readonly type: "AudioAnalyzed"; readonly jobId: JobId };
export type ListenerReviewed = {
  readonly type: "ListenerReviewed";
  readonly jobId: JobId;
  readonly score: ListenerScore;
};
export type CriticReviewed = {
  readonly type: "CriticReviewed";
  readonly jobId: JobId;
  readonly verdict: CriticVerdict;
};
export type ProducerImproved = {
  readonly type: "ProducerImproved";
  readonly jobId: JobId;
  readonly directive: ProducerDirective;
};
export type TrackAdopted = {
  readonly type: "TrackAdopted";
  readonly jobId: JobId;
  readonly track: GeneratedTrack;
};
export type TrackRejected = {
  readonly type: "TrackRejected";
  readonly jobId: JobId;
  readonly reason: string;
};
export type IterationLimitReached = {
  readonly type: "IterationLimitReached";
  readonly jobId: JobId;
  readonly iterations: number;
};
export type ReauthenticationRequired = {
  readonly type: "ReauthenticationRequired";
  readonly instruction: ReauthenticationInstruction;
};

export type DomainEvent =
  | GenerationRequested
  | GenerationCompleted
  | GenerationFailed
  | AudioAnalyzed
  | ListenerReviewed
  | CriticReviewed
  | ProducerImproved
  | TrackAdopted
  | TrackRejected
  | IterationLimitReached
  | ReauthenticationRequired;
