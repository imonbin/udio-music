import type { Result } from "../result/Result.js";
import type { ProductionOutcome, ProductionRequest, WorkflowError } from "./types.js";

/**
 * Project Managerから独立した状態機械。Project Manager自身はビジネス判断を持たず、
 * このWorkflowEngineに実行を委譲することで、状態遷移ロジックを単体テスト・差し替え可能にする。
 */
export interface WorkflowEngine {
  run(request: ProductionRequest): Promise<Result<ProductionOutcome, WorkflowError>>;
}
