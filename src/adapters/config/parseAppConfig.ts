import { parse } from "yaml";
import { failure, success } from "../../core/result/Result.js";
import type { Result } from "../../core/result/Result.js";
import type { AppConfig, ConfigError } from "../../core/config/types.js";
import { appConfigSchema } from "./schema.js";

export function parseAppConfig(raw: string): Result<AppConfig, ConfigError> {
  let parsed: unknown;
  try {
    parsed = parse(raw);
  } catch (error) {
    return failure<AppConfig, ConfigError>({
      type: "ParseError",
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const validated = appConfigSchema.safeParse(parsed);

  if (!validated.success) {
    const issues = validated.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return failure<AppConfig, ConfigError>({ type: "ValidationError", issues });
  }

  return success<AppConfig, ConfigError>(validated.data);
}
