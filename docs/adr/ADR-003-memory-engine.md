# ADR-003: Memory Engine（長期記憶）

## Status

Accepted（前提: [ADR-000](./ADR-000-design-principles.md)）

## Context

本プロジェクトの目標の一つは「使うほどユーザー専用のプロデューサーへ成長すること」である。
単発の生成履歴（history.json）だけでは、成功パターン・失敗パターン・好みの構成・好みのプロンプト
断片・スタイルプリセットといった、長期的に蓄積・再利用すべき知識を区別して扱えない。
また、将来的には蓄積したデータに対する検索（類似プロンプト検索等）が必要になることが見込まれる。

## Decision

- `core/memory/MemoryEngine.ts` にドメインロジックを置き、永続化の実装詳細は
  `core/memory/MemoryStore.ts`（port）の背後に隠蔽する。
- 記憶を以下のカテゴリに分離して管理する。
  - `history`（全生成試行の生ログ、追記型）
  - `knowledge/experiments`
  - `knowledge/successfulPatterns`
  - `knowledge/failedPatterns`
  - `knowledge/favoriteStructures`
  - `knowledge/favoritePromptFragments`
  - `knowledge/stylePresets`
- `MemoryStore` interfaceには、将来の検索機能追加を見据えて、単純なCRUDに加え
  `find(query)` のようなクエリベースのメソッドをPhase1から用意する
  （Phase1の実装は単純な属性フィルタ、将来は全文検索・類似検索に拡張可能な形にする）。
- Phase1の永続化実装は `adapters/persistence/JsonMemoryStore.ts`（ローカルJSONファイル）とする。

## Consequences

**得られるもの**

- カテゴリごとにデータ構造・アクセスパターンを最適化できる。
- 永続化技術（JSON→SQLite等）を差し替えてもMemoryEngineのAPIやAgent側のコードは変更不要。
- 検索interfaceを先に用意しておくことで、Phase2以降のデータ活用機能を後付けしやすい。

**支払うコスト**

- カテゴリ分割により、Phase1時点ではまだ薄いデータしか入らないカテゴリ（experiments等）が生まれる。
- JSON実装は同時書き込み・大量データに弱く、データ量が増えた際に移行作業が発生する。

## Alternatives Considered

- **単一history.jsonのみで運用**：シンプルだが、成功/失敗パターンや好みの抽出に毎回全件走査が必要になり、
  「専用プロデューサーへの成長」という目的に対して不十分なため不採用。
- **最初からSQLite/組み込みDBを採用**：将来的な検索性能には有利だが、Phase1のスコープ（MVP最優先）に対して
  過剰投資と判断し、JSON実装から開始しportで抽象化する方針とした。

## Future Review

- `memory-data/`のデータ量・検索要件が具体化した時点（例：類似プロンプト検索の実装時）で、
  `JsonMemoryStore`をSQLiteやベクトル検索対応ストアに置き換えることを検討する。
- Listener Agents / AudioAnalysis導入後、`knowledge`系カテゴリに実際どのようなデータが
  蓄積されるかを見て、カテゴリ設計自体の見直しを行う。
