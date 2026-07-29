# ADR-000: プロジェクト全体の設計原則

## Status

Accepted

## Context

本プロジェクトは数年単位で育てることを前提とした「Autonomous IDM Producer MCP」である。
単なるUdio自動化スクリプトではなく、知性（LLM）・音楽生成エンジン（Renderer）・ブラウザ自動化・音声分析という
性質の異なる4つの関心事を長期にわたって独立に進化させる必要がある。

この前提のもとでは、初速（実装の速さ）よりも以下が優先される。

- 各コンポーネントを単体でテストできること
- 外部技術（Playwright / Udio / 特定LLM SDK / 特定音声解析ライブラリ）の変更が
  ドメインロジックに波及しないこと
- 新しいRenderer・LLM Provider・Audio Analyzer・Listener Agentを
  「1ファイル追加する」レベルの労力で追加できること

以降のすべてのADR（ADR-001以降）は、本ADR-000で定めた原則を前提として意思決定されている。

## Decision

以下7つの原則を全モジュール設計の前提とする。

### 1. Clean Architectureの採用

`src/core`（技術非依存のドメイン層）と`src/adapters`（技術詳細の実装層）を明確に分離する。
依存の方向は常に `adapters → core`（core は adapters を import しない）。
`core`配下のいかなるファイルもPlaywright・Udio固有API・特定LLM SDK・特定ファイルI/Oライブラリを
直接importしない。

### 2. Interface First（Port定義優先）

新しいコンポーネントを実装する際は、必ず先にinterface（port）を定義し、テストとドメインロジックを
そのinterfaceに対して書く。具体的な実装（adapter）は後から追加する。

### 3. Dependency Inversion（依存性逆転）

上位のポリシー（Producer Agent, Critic Agent, Project Manager等）は下位の実装詳細
（Playwright, 特定LLM API, ファイルシステム）に依存せず、両者ともinterfaceに依存する。
実装の組み立て（DI）はcomposition root（MCP Server起動処理）でのみ行う。

### 4. Plugin First（差し替え容易性）

Renderer・LLM Provider・Audio Analyzer・永続化層は、対応するinterfaceを実装した
新しいファイルを`src/adapters/`配下の対応するサブフォルダに追加するだけで拡張できる構成にする。
既存コードの修正を必要としない。

### 5. Testability First（テスト容易性優先）

すべてのcoreモジュールは、外部依存のFake/In-Memory実装を用いてPlaywright・実LLM API・
実ファイルシステムなしに単体テスト可能でなければならない。TDD（テストを先に書く）を基本とする。

### 6. Replaceability First（交換可能性優先）

「このコンポーネントが将来別のものに置き換わる」ことを常に前提に設計する
（Udio→他のRenderer、MCP Sampling→他のLLM Provider、JSON永続化→DB等）。
交換可能性を損なう安易な密結合（例：Producer AgentがPlaywrightの型を直接扱う）は禁止する。

### 7. Long-term Maintainability（長期保守性優先）

コード量の少なさや実装速度よりも、責務の明確な分離・命名の一貫性・ADRによる意思決定の記録を優先する。
「今動けばよい」実装は行わない。

## Consequences

**得られるもの**

- 各モジュールをFake実装で隔離してテストできる
- Renderer・LLM Provider追加時に既存コードへの影響がほぼゼロになる
- 数年後に別の開発者（または将来の自分自身）が意思決定の背景を追える

**支払うコスト**

- 初期実装の手間がやや増える（interfaceの設計・DIの配線が必要）
- 小さな機能追加でも「どのレイヤーに置くべきか」を都度検討する必要がある
- 過度に抽象化するとかえって理解しづらくなるリスクがあるため、YAGNIとのバランスを都度判断する

## Alternatives Considered

- **とにかく動くものを最短で作る（プロトタイプ優先）**：初速は出るが、数年運用する前提と矛盾するため不採用。
- **モノリシックな1ファイル実装**：初期は理解しやすいが、Renderer/LLM Providerの差し替えが困難になるため不採用。
- **DDD（ドメイン駆動設計）のフル導入（集約・値オブジェクト等の厳密な適用）**：
  現時点のドメインの複雑さに対してオーバーエンジニアリングと判断し、
  Clean Architectureの層分離のみを採用し、DDD戦術パターンは必要になった時点で部分的に導入する。

## Future Review

- Rendererが2種類以上（Udio + Suno等）に増えた時点で、抽象化の妥当性（過不足）を再検証する。
- 実装が数万行規模になり、現在のレイヤー粒度では見通しが悪くなった場合、
  core配下をさらに機能単位でパッケージ分割することを検討する。
