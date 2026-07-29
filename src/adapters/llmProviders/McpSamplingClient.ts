export type SamplingContent = { readonly type: "text"; readonly text: string };

export type SamplingMessage = {
  readonly role: "user" | "assistant";
  readonly content: SamplingContent;
};

export type CreateMessageParams = {
  readonly messages: readonly SamplingMessage[];
  readonly systemPrompt?: string;
  readonly maxTokens: number;
};

export type CreateMessageResult = {
  readonly content: SamplingContent | { readonly type: string };
};

/**
 * MCP SDKのServer/McpServerが提供する createMessage() と構造的に一致する
 * 最小限のinterface。MCPSamplingProviderはMCP SDK本体を直接importせず、
 * このinterfaceにのみ依存する。
 */
export interface McpSamplingClient {
  createMessage(params: CreateMessageParams): Promise<CreateMessageResult>;
}
