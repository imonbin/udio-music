# ADR-001: Renderer抽象化

## Status

Accepted（前提: [ADR-000](./ADR-000-design-principles.md)）

## Context

音楽生成にはUdioを利用するが、Udioには公式の一般公開APIが存在しない。
また、将来的にSuno・Stable Audio・その他の音楽生成AIにも対応したいという明確な要望がある。
このプロジェクトは「Udio自動化ツール」ではなく「AI音楽プロデューサー」であり、
音楽生成エンジン（レンダリングエンジン）はプロデューサーの意思決定にとって交換可能な実行手段の一つに過ぎない。

Udioとの連携方法としては、非公式APIのリバースエンジニアリングとブラウザ自動化の2案を検討した。

## Decision

- `core/renderer/Renderer.ts` に技術非依存の`Renderer` interface（port）を定義する。
  公開するメソッドは `getCapabilities() / submit() / pollStatus() / fetchResult()` の4つのみ。
- Udio向けの実装は `adapters/renderers/udio/UdioAdapter.ts` に置き、`Renderer`を実装する。
  内部ではPlaywrightを用いたブラウザ自動化を行い、UI操作の詳細（Page Object Model）を完全にカプセル化する。
- `RendererCapabilities`（`supportsExtend` 等）をinterfaceに含め、Renderer間の機能差をProducer /
  Prompt Engineer Agent側が吸収できるようにする。
- Udio連携には**ブラウザ自動化（Playwright）**を採用し、非公式APIの直接呼び出しは採用しない。

## Consequences

**得られるもの**

- Project Manager・Producer Agent・Critic AgentはUdioの存在を一切知らずに実装できる。
- 将来Suno等を追加する際は `adapters/renderers/suno/SunoAdapter.ts` を追加するだけで済み、
  core配下のコード変更が不要。
- UdioがUIを変更してもPage Object Model内の修正で局所的に対応できる。

**支払うコスト**

- Playwrightによるブラウザ操作はAPI直接呼び出しに比べて低速・不安定（要素検出失敗、タイムアウト等）になりやすい。
- Udio側のUI変更に追従するメンテナンスコストが継続的に発生する。
- ヘッドレスブラウザの実行環境（依存パッケージ、リソース）を管理する必要がある。

## Alternatives Considered

- **非公式APIの直接呼び出し**：高速・軽量だが、エンドポイント仕様が非公開でいつ変更・廃止されるか分からず、
  リバースエンジニアリングの継続的な追従コストがブラウザ自動化以上に不透明であるため不採用。
- **Renderer抽象化なしにUdio専用コードを直接書く**：初期実装は速いが、
  「将来Renderer差し替え」という明確な要件と矛盾するため不採用。

## Future Review

- Udioが公式APIを公開した場合、`UdioAdapter`の内部実装のみをAPIベースに差し替える
  （`Renderer` interfaceおよびcore側のコードは変更しない）。
- 2つ目のRenderer（Suno等）を実装する時点で、`Renderer` interfaceが実際に十分抽象化されているか
  （Udio固有の概念が漏れ出していないか）を検証する。
