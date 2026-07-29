import { readFile } from "node:fs/promises";
import type { ConfigRepository } from "../../core/config/ConfigRepository.js";
import type { AppConfig, ConfigError } from "../../core/config/types.js";
import { failure } from "../../core/result/Result.js";
import type { Result } from "../../core/result/Result.js";
import { parseAppConfig } from "./parseAppConfig.js";

function isFileNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class YamlConfigRepository implements ConfigRepository {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async load(): Promise<Result<AppConfig, ConfigError>> {
    let raw: string;

    try {
      raw = await readFile(this.filePath, "utf-8");
    } catch (error) {
      if (isFileNotFoundError(error)) {
        return failure<AppConfig, ConfigError>({ type: "FileNotFound", path: this.filePath });
      }
      return failure<AppConfig, ConfigError>({
        type: "ParseError",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    return parseAppConfig(raw);
  }
}
