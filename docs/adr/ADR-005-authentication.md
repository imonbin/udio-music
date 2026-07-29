# ADR-005: Authentication Manager

## Status

Accepted（前提: [ADR-000](./ADR-000-design-principles.md)）

## Context

Udioには公式ログインAPI/OAuthが存在せず、ブラウザセッション（Cookie / Storage State）に依存した
認証状態の維持が必要になる。一方で、メールアドレスやパスワードをコードや設定ファイルに保存することは
セキュリティ上避けたい。また、2段階認証（2FA）やCAPTCHAが表示された場合に自動操作で突破しようとする
実装は、Udioの利用規約上の問題やアカウント停止リスクを招くため避けるべきである。

## Decision

- `core/auth/AuthenticationManager.ts` に、以下6つの責務のみを持つ`AuthenticationManager` interfaceを
  定義する：ログイン状態確認 / Cookie保存 / Cookie読込 / Storage State更新 / セッション有効性確認 /
  再認証要求。
- Udio向け実装 `adapters/renderers/udio/auth/UdioAuthenticationManager.ts` は、Playwrightの
  `storageState`機能を用いてセッションを保存・復元する。メールアドレス・パスワードはコード・設定ファイル
  いずれにも保存しない。
- 初回のみ手動ログインを行い、認証後のCookie/Storage Stateを`adapters/secureStore/SecureCredentialStore.ts`
  （OSセキュアストレージ、利用可能な場合はKeychain。フォールバックとして暗号化ローカルファイル）に保存する。
- Cookieの有効期限切れを自動検知し、期限切れの場合は日本語で再ログインを促すメッセージを返す。
- ログイン画面を自動操作することは行わない。2FA/CAPTCHAを検知した場合は自動操作を停止し、
  ブラウザを開いたまま日本語で状況を説明し、ユーザーの手動操作を待つ。
- `UdioAdapter`（Renderer実装）は`AuthenticationManager`にセッションの取得のみを依頼し、
  Cookie保存形式・期限管理・Keychainアクセスといった認証の実装詳細を一切知らない。
- 認証情報・Cookieはプロジェクトディレクトリ外（例：`~/Library/Application Support/udio-producer-mcp/secrets/`）
  に保存し、`.gitignore`でも`secrets/`を除外することで二重に防御し、Gitへのコミットを徹底して防ぐ。

## Consequences

**得られるもの**

- 認証情報が平文でコード・リポジトリに含まれるリスクを排除できる。
- Udioが公式API/OAuthを提供した場合、`UdioAuthenticationManager`のみを差し替えれば、
  `core/auth`のportおよび`UdioAdapter`の呼び出し側コードは変更不要。
- 2FA/CAPTCHAへの自動対応を行わないことで、規約違反や検知リスクを回避できる。

**支払うコスト**

- 初回ログインおよびCookie失効時の再ログインには、ユーザーの手動操作が必須になる
  （完全無人運用はできない。ただし対話的オンデマンド利用のみという要件と整合している）。
- Keychain等のOSセキュアストレージへの依存は、実行環境（OS）によって利用可否・実装が異なるため、
  プラットフォームごとの動作検証が必要になる。

## Alternatives Considered

- **メールアドレス/パスワードを設定ファイルに保持し毎回自動ログイン**：完全無人化できる利点はあるが、
  認証情報の保存自体がリスクであり、2FA/CAPTCHA発生時に機械的な突破を試みる実装につながりかねないため不採用。
- **非公式トークンAPIを直接叩いて認証をバイパス**：Renderer抽象化の方針（ADR-001）と同様の理由に加え、
  認証情報の非公式な扱い自体のリスクが大きいため不採用。

## Future Review

- Udioが公式OAuthを提供した時点で、`UdioAuthenticationManager`をOAuthベースの実装に置き換える。
- 2つ目以降のRenderer（Suno等）を追加する際、各Rendererが個別の`AuthenticationManager`実装を
  持つ構造が引き続き妥当かを再検証する。
