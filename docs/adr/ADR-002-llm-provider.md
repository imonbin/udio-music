# ADR-002: LLM Provider抽象化

## Status

Accepted（前提: [ADR-000](./ADR-000-design-principles.md)）

## Context

Producer Agent（創造的方向性の決定）、Prompt Engineer Agent（プロンプト化）、Critic Agent（評価解釈・
改善指示）、Listener Agents（Phase2、個別評価軸の判断）は、いずれも何らかのLLM推論を必要とする。
実現手段として以下を検討した。

- MCP Sampling（MCPサーバーがホスト側、すなわちClaudeにcreateMessageリクエストを送り推論させる）
- 独自にAnthropic API等を直接呼び出す（サーバー自身がAPIキーを保持）
- ルールベース・テンプレートのみ（LLM不使用）

また、将来的にAgentごとに異なるLLM（Producer→Claude、Listener B→Gemini等）を使い分けたいという要望がある。

## Decision

- `core/llm/LLMProvider.ts` に `generate() / review() / improve() / summarize()` の
  4メソッドのみを公開する `LLMProvider` interfaceを定義する。
- Producer Agent・Prompt Engineer Agent・Critic Agent・Listener Agentsは、この`LLMProvider`
  interfaceにのみ依存し、実装（MCP Samplingか、直接API呼び出しか）を一切知らない。
- Phase1（MVP）では `adapters/llmProviders/MCPSamplingProvider.ts` のみを実装する。
  Anthropic / OpenAI / Gemini / Ollama向けの実装はinterfaceのみ用意し、実装はPhase2以降に行う。
- 各Agentが使用する`LLMProvider`の実装は設定（`settings.yaml`）で個別に指定できる構造にする。
- LLMが利用できない場合でもシステム全体を停止させず、日本語でエラー内容と選択肢を提示する
  エラーハンドリングを`LLMProvider`利用箇所すべてに設ける。

## Consequences

**得られるもの**

- 追加のAPIキー管理なしにMVPを動かせる（MCP Samplingはホストの認証情報をそのまま利用する）。
- 将来Agentごとに異なるLLMを使い分ける拡張が、`LLMProvider`実装を追加するだけで可能になる。
- LLM呼び出し箇所がinterfaceに集約されているため、Fake実装によるAgentの単体テストが容易。

**支払うコスト**

- MCP Samplingはホスト（MCPクライアント）がSampling機能に対応している場合のみ動作する。
  非対応ホストで実行した場合は明示的なエラーとして扱う必要がある。
- Provider間で推論品質・応答形式が異なる可能性があり、`review()`等の戻り値の解釈がProvider依存に
  ならないよう、interface側で戻り値の型を厳密に定義する必要がある。

## Alternatives Considered

- **独自にAnthropic APIを直接呼び出す**：ホストのSampling対応状況に依存しない利点はあるが、
  別途APIキー管理・課金管理が必要になり、MVPの導入障壁を上げるため、Phase1では不採用
  （interfaceとしては将来実装できるよう準備済み）。
- **ルールベース・テンプレートのみ**：予測可能でシンプルだが、「AI音楽プロデューサー」としての
  創造的判断力を持たせるという目的に反するため不採用。

## Future Review

- MCP Sampling非対応ホストでの利用要望が出た時点で、`AnthropicProvider`等の実装に着手する。
- Listener Agentsを追加する時点（Phase2）で、Agentごとの複数Provider混在運用を実際に検証する。
