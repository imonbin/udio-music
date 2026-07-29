# ADR-004: Event Bus

## Status

Accepted（前提: [ADR-000](./ADR-000-design-principles.md)）

## Context

Project Managerを「薄いオーケストレーター」に保つ（ADR未採番だがProject Manager実装ステップの前提方針）
一方で、Agent同士を直接呼び出す設計のままでは、将来Listener Agentsのような並列に動作する
複数の評価者を追加する際、Project Manager本体の呼び出しロジックを都度変更する必要が生じる。
Agent間の結合度をさらに下げ、新しいAgent/購読者の追加時に既存コードを変更しない構造が求められた。

## Decision

- `core/eventBus/EventBus.ts` に型付きpub/subのEventBusを実装する。
- ドメインイベント（`GenerationRequested` / `GenerationCompleted` / `AudioAnalyzed` /
  `ListenerReviewed` / `CriticReviewed` / `ProducerImproved` / `TrackAdopted` /
  `TrackRejected` / `IterationLimitReached` / `ReauthenticationRequired` 等）を
  `core/eventBus/events.ts` に型として定義する。
- Phase1では、Project Manager（`WorkflowEngine`経由）が引き続き明示的にAgentを順番に呼び出す
  （直接呼び出し）が、各呼び出しの前後で対応するイベントをEventBusへ発行する
  （ロギング・MCP進捗通知・将来の購読者拡張のため）。
- Phase2でListener Agentsを追加する際は、新しいAgentが`GenerationCompleted`を購読して
  独立に`ListenerReviewed`を発行する形に拡張し、Project Manager本体の変更を避ける。

## Consequences

**得られるもの**

- ロギング・進捗通知・将来の監視機能をEventBus購読という形で疎結合に追加できる。
- Phase2でのListener Agents追加時、Project Managerの変更を最小限に抑えられる。

**支払うコスト**

- 直接呼び出しとイベント発行を併用するハイブリッド構成のため、「今どちらの経路で処理が進んでいるか」を
  把握するための一定の学習コストがある。
- イベント駆動特有の問題（発行したが誰も購読していないイベント、購読順序への暗黙の依存）に
  注意深く対処する必要がある。

## Alternatives Considered

- **完全イベント駆動（Project Managerも含めすべてイベント経由）**：将来の拡張性は最も高いが、
  Phase1の「テーマ入力→自律ループで1曲完成」という単純な直列フローに対しては
  デバッグ容易性を損なうオーバーエンジニアリングと判断し不採用。
- **EventBusを導入せず直接呼び出しのみ**：Phase1はシンプルになるが、Phase2のListener追加時に
  Project Manager本体の修正が避けられなくなり、ADR-000の Plugin First 原則に反するため不採用。

## Future Review

- Listener Agents導入（Phase2）時に、直接呼び出しからイベント購読への移行を実際に行い、
  Project Managerの変更量が想定通り最小限で済むかを検証する。
- イベントの追跡・デバッグが困難になった場合、イベントログの可視化ツール導入を検討する。
