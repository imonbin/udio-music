import type { Result } from "../result/Result.js";
import type { StyleProfile } from "../prompt/types.js";
import type { GeneratedTrack } from "../renderer/types.js";
import type { ListenerScore } from "../listeners/types.js";
import type { CriticError, CriticVerdict } from "./types.js";

export interface CriticAgent {
  review(
    track: GeneratedTrack,
    listenerScores: readonly ListenerScore[],
    targetProfile: StyleProfile,
  ): Promise<Result<CriticVerdict, CriticError>>;
}
