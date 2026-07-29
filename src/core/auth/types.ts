export type SessionState = {
  readonly serialized: string;
  readonly savedAt: string;
  readonly expiresAt?: string;
};

export type AuthStatus = "valid" | "expired" | "unauthenticated" | "action_required";

export type ReauthenticationInstruction = {
  readonly message: string;
  readonly requiresManualBrowserAction: boolean;
};

export type AuthError =
  | { readonly type: "SessionNotFound" }
  | { readonly type: "SessionExpired" }
  | { readonly type: "TwoFactorRequired"; readonly message: string }
  | { readonly type: "CaptchaRequired"; readonly message: string }
  | { readonly type: "StorageUnavailable"; readonly message: string };
