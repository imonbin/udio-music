import type { MemoryStore } from "./MemoryStore.js";
import type {
  Experiment,
  FailedPattern,
  FavoritePromptFragment,
  FavoriteStructure,
  HistoryEntry,
  StylePreset,
  SuccessfulPattern,
} from "./types.js";

export interface MemoryEngine {
  readonly history: MemoryStore<HistoryEntry>;
  readonly experiments: MemoryStore<Experiment>;
  readonly successfulPatterns: MemoryStore<SuccessfulPattern>;
  readonly failedPatterns: MemoryStore<FailedPattern>;
  readonly favoriteStructures: MemoryStore<FavoriteStructure>;
  readonly favoritePromptFragments: MemoryStore<FavoritePromptFragment>;
  readonly stylePresets: MemoryStore<StylePreset>;
}
