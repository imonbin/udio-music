import type { Result } from "../result/Result.js";
import type { ProducerDirective } from "../producer/types.js";
import type { RendererCapabilities } from "../renderer/types.js";
import type { PromptEngineerError, PromptObject } from "./types.js";

export interface PromptEngineerAgent {
  buildPrompt(
    directive: ProducerDirective,
    capabilities: RendererCapabilities,
    previous?: PromptObject,
  ): Promise<Result<PromptObject, PromptEngineerError>>;
}
