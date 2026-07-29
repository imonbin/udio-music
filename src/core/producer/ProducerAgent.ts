import type { Result } from "../result/Result.js";
import type { ProducerDirective, ProducerError, ProducerInput } from "./types.js";

export interface ProducerAgent {
  decideDirection(input: ProducerInput): Promise<Result<ProducerDirective, ProducerError>>;
}
