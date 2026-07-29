import { describe, expect, it } from "vitest";
import { createPromptObject, diffPromptObjects, revisePromptObject } from "./PromptObject.js";
import type { PromptObject } from "./types.js";

const basePrompt: PromptObject = {
  genre: "IDM",
  mood: ["dark", "glitchy"],
  rhythm: "broken beat, 140bpm",
  texture: "granular, bitcrushed",
  mix: "wide stereo, saturated low end",
  rendererParameters: {},
  version: 1,
};

describe("createPromptObject", () => {
  it("creates a version 1 PromptObject with no parentVersion", () => {
    const prompt = createPromptObject({
      genre: "IDM",
      mood: ["dark"],
      rhythm: "broken beat",
      texture: "granular",
      mix: "wide stereo",
      rendererParameters: {},
    });

    expect(prompt.version).toBe(1);
    expect(prompt.parentVersion).toBeUndefined();
  });
});

describe("revisePromptObject", () => {
  it("increments the version and sets parentVersion to the previous version", () => {
    const revised = revisePromptObject(basePrompt, { mood: ["dark", "aggressive"] });

    expect(revised.version).toBe(2);
    expect(revised.parentVersion).toBe(1);
  });

  it("applies only the given field changes and keeps the rest untouched", () => {
    const revised = revisePromptObject(basePrompt, { rhythm: "syncopated, 150bpm" });

    expect(revised.rhythm).toBe("syncopated, 150bpm");
    expect(revised.genre).toBe(basePrompt.genre);
    expect(revised.texture).toBe(basePrompt.texture);
  });
});

describe("diffPromptObjects", () => {
  it("returns an empty array when prompts are identical", () => {
    expect(diffPromptObjects(basePrompt, basePrompt)).toEqual([]);
  });

  it("reports only fields that changed", () => {
    const next: PromptObject = {
      ...basePrompt,
      mood: ["dark", "aggressive"],
      version: 2,
      parentVersion: 1,
    };

    const diff = diffPromptObjects(basePrompt, next);

    expect(diff).toEqual([{ field: "mood", before: basePrompt.mood, after: next.mood }]);
  });

  it("reports multiple changed fields", () => {
    const next: PromptObject = {
      ...basePrompt,
      rhythm: "syncopated, 150bpm",
      mix: "narrow stereo",
      version: 2,
      parentVersion: 1,
    };

    const diff = diffPromptObjects(basePrompt, next);
    const fields = diff.map((entry) => entry.field).sort();

    expect(fields).toEqual(["mix", "rhythm"]);
  });
});
