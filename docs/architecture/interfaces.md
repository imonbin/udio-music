# Interface一覧

`src/core`配下に定義したすべてのinterface（公開契約）を一覧化する。前提は [ADR-000](../adr/ADR-000-design-principles.md)。

## 設計ルール

- Interfaceには実装依存の型を書かない（Playwright型・Node.js固有型・LLM SDK型・Renderer固有型をcoreへ持ち込まない）。すべてcore独自の型として定義する。
- 例外は`throw`ではなく`Result<T, E>`（`core/result/Result.ts`）で扱う。
- Interface Segregation Principleに従い、巨大なInterfaceを避け責務ごとに小さく分割する。分割した小さなinterfaceをconsumer側が必要な粒度で個別に利用でき、便宜上のcomposite interface（例：`Renderer`）も用意する。

## Result型

| 型/関数                                                                           | 場所                    | 役割                                                           |
| --------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `Result<T, E>` / `Success<T>` / `Failure<E>`                                      | `core/result/Result.ts` | 全interfaceの戻り値の基盤。例外を投げず成功/失敗を型で表現する |
| `success / failure / isSuccess / isFailure / map / mapError / flatMap / unwrapOr` | `core/result/Result.ts` | Result操作のための純粋関数（TDDで実装、12テスト）              |

## Interface一覧と責務

| Interface               | 場所                                    | 責務                                                                                                                                                       | 分割された小さいinterface                                                                                                                                  |
| ----------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Renderer`              | `core/renderer/Renderer.ts`             | 音楽生成エンジンの抽象化                                                                                                                                   | `RendererCapabilityProvider`（能力照会）/ `RendererJobSubmitter`（投入）/ `RendererJobStatusChecker`（状態確認）/ `RendererResultFetcher`（結果取得）      |
| `AuthenticationManager` | `core/auth/AuthenticationManager.ts`    | 認証状態・セッションの管理                                                                                                                                 | `SessionStatusChecker` / `SessionStore` / `SessionRefresher` / `ReauthenticationRequester`。加えてBrowser Adapter向けの読み取り専用`SessionProvider`を用意 |
| `LLMProvider`           | `core/llm/LLMProvider.ts`               | LLM推論の抽象化                                                                                                                                            | `TextGenerator` / `ReviewGenerator` / `ImprovementGenerator` / `Summarizer`                                                                                |
| `ListenerAgent`         | `core/listeners/ListenerAgent.ts`       | 生成トラックの一評価軸での評価（Phase2で実装追加）                                                                                                         | —                                                                                                                                                          |
| `AudioAnalyzer`         | `core/audio/AudioAnalyzer.ts`           | 音声特徴量の抽出（Phase2で実装追加）                                                                                                                       | —                                                                                                                                                          |
| `EventBus`              | `core/eventBus/EventBus.ts`             | Agent間の疎結合なイベント配送。実装は`core/eventBus/SynchronousEventBus.ts`（同期dispatch、購読者の例外を隔離しResultで通知）                              | `EventPublisher`（発行専用）/ `EventSubscriber`（購読専用）                                                                                                |
| `MemoryStore<T>`        | `core/memory/MemoryStore.ts`            | 1カテゴリ分の記憶の永続化（汎用ジェネリック port）                                                                                                         | `MemoryWriter<T>` / `MemoryReader<T>` / `MemorySearcher<T>`（将来の検索機能を見据えたquery port）                                                          |
| `MemoryEngine`          | `core/memory/MemoryEngine.ts`           | カテゴリ別`MemoryStore`の集約（history / experiments / successfulPatterns / failedPatterns / favoriteStructures / favoritePromptFragments / stylePresets） | —                                                                                                                                                          |
| `ProducerAgent`         | `core/producer/ProducerAgent.ts`        | クリエイティブディレクション（意図の決定）                                                                                                                 | —                                                                                                                                                          |
| `PromptEngineerAgent`   | `core/prompt/PromptEngineerAgent.ts`    | Producerの意図をPromptObjectへ変換                                                                                                                         | —                                                                                                                                                          |
| `CriticAgent`           | `core/critic/CriticAgent.ts`            | Listener結果の集約・総合判定・改善指示生成                                                                                                                 | —                                                                                                                                                          |
| `WorkflowEngine`        | `core/workflow/WorkflowEngine.ts`       | 生成→評価→反復のワークフロー実行（状態機械）。Project Managerから分離                                                                                      | —                                                                                                                                                          |
| `ProjectManager`        | `core/projectManager/ProjectManager.ts` | MCPツール層からの唯一の入口。Agent呼び出し・状態遷移・エラー処理・イベント通知のみを担う薄いオーケストレーター                                             | —                                                                                                                                                          |
| `ConfigRepository`      | `core/config/ConfigRepository.ts`       | `settings.yaml`から検証済み`AppConfig`を取得する。実装は`adapters/config/YamlConfigRepository.ts`のみがYAML/fsを知る                                       | `ConfigLoader`（読み込み専用、`ConfigRepository`はこのエイリアス）/ `ConfigWatcher`（将来のホットリロード用、Phase1は未実装）                              |

## 主要な型

| 型                                                            | 場所                          | 備考                                                                                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PromptObject`                                                | `core/prompt/types.ts`        | プロンプトを文字列ではなく構造化オブジェクトとして管理（Genre/Mood/Rhythm/Texture/Mix/NegativePrompt/Seed/RendererParameters + version/parentVersion）                                           |
| `createPromptObject / revisePromptObject / diffPromptObjects` | `core/prompt/PromptObject.ts` | PromptObjectの生成・改訂・差分比較（TDDで実装、6テスト）                                                                                                                                         |
| `StyleProfile`                                                | `core/prompt/types.ts`        | Producer/Critic/Listenerが目標とする音楽的方向性を表す共通の型                                                                                                                                   |
| `RendererCapabilities`                                        | `core/renderer/types.ts`      | Extend/Lyrics/Seed/NegativePrompt/StemExportへの対応可否をRenderer間で吸収する                                                                                                                   |
| `DomainEvent`                                                 | `core/eventBus/events.ts`     | `GenerationRequested → GenerationCompleted → (AudioAnalyzed) → (ListenerReviewed) → CriticReviewed → ProducerImproved → TrackAdopted/TrackRejected/IterationLimitReached` 等の判別可能な union型 |

## 依存関係

```
core/result           ← 全interfaceが依存する基盤（Result<T,E>）
core/prompt           ← StyleProfile / PromptObject を core/producer, core/listeners, core/critic, core/renderer(request生成時) が利用
core/renderer         ← core/listeners, core/eventBus, core/workflow が GeneratedTrack/JobId を利用
core/auth             ← core/eventBus が ReauthenticationInstruction を利用
core/producer         ← core/prompt(PromptEngineerAgent), core/eventBus が ProducerDirective を利用
core/critic           ← core/eventBus, core/memory(HistoryEntry) が CriticVerdict を利用
core/listeners        ← core/critic(CriticAgent.review), core/eventBus が ListenerScore を利用
core/memory           ← core/prompt, core/renderer, core/critic の型を集約してHistoryEntry等を構成
core/workflow         ← core/critic, core/renderer の型を用いてProductionOutcomeを構成
core/projectManager   ← core/workflow に処理を委譲するのみ（ビジネスロジックを持たない）
core/eventBus         ← 他のほぼ全モジュールの型を横断的に参照するドメインイベント定義
```

依存の向きは常に「上位（Project Manager）→ 下位（各Agent/Port)」であり、`core`配下のどのファイルも`adapters`配下やPlaywright・特定LLM SDK・Node.js組み込みAPIを一切importしない。

## Result型採用状況

すべてのinterfaceメソッドが`Promise<Result<T, E>>`を返す（例外的にRendererの`getCapabilities()`は同期・副作用なしの値取得のためResultでラップしていない）。エラー型はモジュールごとに判別可能なunion型（`RendererError` / `AuthError` / `LLMError` / `ListenerError` / `AudioAnalysisError` / `MemoryError` / `ProducerError` / `CriticError` / `PromptEngineerError` / `WorkflowError`）として定義し、呼び出し側が`instanceof`ではなく`.type`フィールドで分岐できるようにしている。

## テスト方針

- `Result<T, E>`と`PromptObject`の純粋関数は実際のTDD（Red→Green）で実装した。
- `Renderer` / `AuthenticationManager` / `LLMProvider` / `MemoryStore<T>` の4つの主要adapter向けportについては、Fake実装による`*.contract.test.ts`を用意した。これらのFakeは後続ステップ（Project Manager等）のテストでも再利用できる。
- `ProducerAgent` / `CriticAgent` / `PromptEngineerAgent` / `ListenerAgent` / `AudioAnalyzer` / `WorkflowEngine` / `ProjectManager` / `EventBus`は、対応する実装ステップ（5, 9, 10, 11, 12, 13）で具体的な振る舞いとともに実際のテストを追加する。
