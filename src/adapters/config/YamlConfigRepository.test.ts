import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isFailure, isSuccess } from "../../core/result/Result.js";
import { YamlConfigRepository } from "./YamlConfigRepository.js";

describe("YamlConfigRepository", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "udio-producer-mcp-config-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loads and validates an existing settings.yaml", async () => {
    const filePath = join(dir, "settings.yaml");
    await writeFile(filePath, "version: 1\nrenderer: udio\n", "utf-8");

    const repository = new YamlConfigRepository(filePath);
    const result = await repository.load();

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.version).toBe(1);
      expect(result.value.renderer).toBe("udio");
    }
  });

  it("returns a FileNotFound error instead of throwing when the file is missing", async () => {
    const filePath = join(dir, "does-not-exist.yaml");

    const repository = new YamlConfigRepository(filePath);
    const result = await repository.load();

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toEqual({ type: "FileNotFound", path: filePath });
    }
  });
});
