# udio-producer-mcp

Autonomous IDM Producer MCP Server

Udio（レンダリングエンジンの一つとして抽象化）を用いて、テーマ指定から自律ループ（生成 → 評価 → 改善 → 反復）でIDMトラックを制作するMCPサーバー。

設計方針・意思決定の背景は `docs/adr/` を参照。

## Requirements

- Node.js >= 20

## Scripts

- `npm run build` — TypeScriptビルド
- `npm test` — テスト実行（Vitest）
- `npm run test:watch` — テストをウォッチモードで実行
- `npm run typecheck` — 型チェックのみ
- `npm run lint` — ESLint
- `npm run format` — Prettierによるフォーマット

## Status

Phase 1 (MVP) 実装中。
