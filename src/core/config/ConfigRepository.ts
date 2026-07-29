import type { Result } from "../result/Result.js";
import type { AppConfig, ConfigError } from "./types.js";

export interface ConfigLoader {
  load(): Promise<Result<AppConfig, ConfigError>>;
}

export type ConfigChangeHandler = (config: AppConfig) => void;
export type Unsubscribe = () => void;

/**
 * Phase1では未実装。GUIからの設定変更やホットリロードに備え、
 * ConfigRepositoryとは独立したinterfaceとして先に定義しておく。
 */
export interface ConfigWatcher {
  watch(handler: ConfigChangeHandler): Unsubscribe;
}

export type ConfigRepository = ConfigLoader;
