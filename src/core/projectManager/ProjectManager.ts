import type { Result } from "../result/Result.js";
import type { ProductionOutcome, ProductionRequest, WorkflowError } from "../workflow/types.js";

/**
 * MCPツール層からの唯一の入口。Agent呼び出し・状態遷移・エラー処理・イベント通知のみを担い、
 * 品質判断（採用/反復/却下）はWorkflowEngine経由でCritic Agentの結果を機械的に照合するのみ。
 */
export interface ProjectManager {
  produceTrack(request: ProductionRequest): Promise<Result<ProductionOutcome, WorkflowError>>;
}
