export type AudioFilePath = string;

export type AudioFeatures = {
  readonly bpm?: number;
  readonly key?: string;
  readonly loudnessLufs?: number;
  readonly spectralCentroidHz?: number;
};

export type AudioAnalysisError =
  | { readonly type: "FileNotFound"; readonly path: AudioFilePath }
  | { readonly type: "UnsupportedFormat"; readonly path: AudioFilePath }
  | { readonly type: "AnalysisFailed"; readonly message: string };
