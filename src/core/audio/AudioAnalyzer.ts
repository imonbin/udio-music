import type { Result } from "../result/Result.js";
import type { AudioAnalysisError, AudioFeatures, AudioFilePath } from "./types.js";

export interface AudioAnalyzer {
  readonly name: string;
  analyze(audioFilePath: AudioFilePath): Promise<Result<AudioFeatures, AudioAnalysisError>>;
}
