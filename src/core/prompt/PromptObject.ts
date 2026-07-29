import type { PromptFieldDiff, PromptObject } from "./types.js";

type PromptObjectDraft = Omit<PromptObject, "version" | "parentVersion">;

export function createPromptObject(draft: PromptObjectDraft): PromptObject {
  return { ...draft, version: 1 };
}

export function revisePromptObject(
  previous: PromptObject,
  changes: Partial<PromptObjectDraft>,
): PromptObject {
  return {
    ...previous,
    ...changes,
    version: previous.version + 1,
    parentVersion: previous.version,
  };
}

const DIFFABLE_FIELDS = [
  "genre",
  "mood",
  "rhythm",
  "texture",
  "mix",
  "negativePrompt",
  "seed",
  "rendererParameters",
] as const;

export function diffPromptObjects(before: PromptObject, after: PromptObject): PromptFieldDiff[] {
  const diffs: PromptFieldDiff[] = [];

  for (const field of DIFFABLE_FIELDS) {
    const beforeValue = before[field];
    const afterValue = after[field];

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diffs.push({ field, before: beforeValue, after: afterValue });
    }
  }

  return diffs;
}
