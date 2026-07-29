import { describe, expect, it } from "vitest";
import { isFailure, isSuccess } from "../../core/result/Result.js";
import { parseAppConfig } from "./parseAppConfig.js";

describe("parseAppConfig", () => {
  it("parses a fully specified settings.yaml", () => {
    const yaml = `
version: 1
renderer: udio
llmProviders:
  producer: mcpSampling
  promptEngineer: mcpSampling
  critic: mcpSampling
workflow:
  maxIterations: 5
  acceptanceThreshold: 0.8
idmPreset:
  genre: IDM
  mood: [dark, aggressive]
  rhythm: syncopated, 150bpm
  texture: bitcrushed
  mix: narrow stereo
storage:
  outputDir: output/tracks
  memoryDataDir: memory-data
`;

    const result = parseAppConfig(yaml);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.version).toBe(1);
      expect(result.value.workflow.maxIterations).toBe(5);
      expect(result.value.idmPreset.mood).toEqual(["dark", "aggressive"]);
    }
  });

  it("fails validation when the required version field is missing", () => {
    const yaml = `
renderer: udio
`;

    const result = parseAppConfig(yaml);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ValidationError");
      if (result.error.type === "ValidationError") {
        expect(result.error.issues.some((issue) => issue.path === "version")).toBe(true);
      }
    }
  });

  it("fails validation on a type mismatch", () => {
    const yaml = `
version: 1
workflow:
  maxIterations: "three"
`;

    const result = parseAppConfig(yaml);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ValidationError");
      if (result.error.type === "ValidationError") {
        expect(result.error.issues.some((issue) => issue.path === "workflow.maxIterations")).toBe(
          true,
        );
      }
    }
  });

  it("applies documented default values when optional fields are omitted", () => {
    const yaml = `
version: 1
`;

    const result = parseAppConfig(yaml);

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.renderer).toBe("udio");
      expect(result.value.llmProviders).toEqual({
        producer: "mcpSampling",
        promptEngineer: "mcpSampling",
        critic: "mcpSampling",
      });
      expect(result.value.workflow).toEqual({ maxIterations: 3, acceptanceThreshold: 0.7 });
      expect(result.value.storage).toEqual({
        outputDir: "output/tracks",
        memoryDataDir: "memory-data",
      });
    }
  });

  it("fails validation when an unknown top-level field is present", () => {
    const yaml = `
version: 1
unknownField: true
`;

    const result = parseAppConfig(yaml);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ValidationError");
    }
  });

  it("reports a ParseError for syntactically invalid YAML", () => {
    const yaml = `
version: 1
  renderer: [unclosed
`;

    const result = parseAppConfig(yaml);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ParseError");
    }
  });
});
