# udio-music

Udioを使った作曲プロジェクト。

## Scope

このリポジトリはUdio関連の制作・ツール一式を扱う（作曲プロンプト、生成結果のメモ、
素材管理に加えて、udio-producer-mcp等の関連ツールのソースコードも含む）。
report-app / keiba-analysis / ableton-tracks の内容とは混在させない。

## Local ⇄ Cloud 共有ポリシー

Macのターミナルで動くClaude Code CLIと、Claude Code on the web（クラウド環境）は
別々のセッションであり、会話履歴は自動的には共有されない。

共有したい方針・決定事項・学びは、会話ではなく必ずこのファイルに追記してコミット・
プッシュすること。どちらの環境で作業を始めても、まずこのファイルを読めば前提が揃う
ようにする。

## Decisions / Learnings

- 2026-07-29: 当初「作曲プロンプト・素材管理用」として作成したが、実際の制作物である
  udio-producer-mcp（Udioを使ったIDMトラック自律生成MCPサーバー）のソースコード一式を
  このリポジトリで管理する方針に変更。README.mdもリモートの説明文とローカルの技術情報
  （Requirements/Scripts/Status）を統合した。
