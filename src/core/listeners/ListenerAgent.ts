import type { Result } from "../result/Result.js";
import type { StyleProfile } from "../prompt/types.js";
import type { GeneratedTrack } from "../renderer/types.js";
import type { ListenerError, ListenerScore } from "./types.js";

export interface ListenerAgent {
  readonly name: string;
  evaluate(
    track: GeneratedTrack,
    targetProfile: StyleProfile,
  ): Promise<Result<ListenerScore, ListenerError>>;
}
