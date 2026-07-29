import { describe, expect, it } from "vitest";
import { isFailure, isSuccess } from "../../core/result/Result.js";
import { MCPSamplingProvider } from "./MCPSamplingProvider.js";
import type {
  CreateMessageParams,
  CreateMessageResult,
  McpSamplingClient,
} from "./McpSamplingClient.js";

class FakeMcpSamplingClient implements McpSamplingClient {
  constructor(
    private readonly respond: (
      params: CreateMessageParams,
    ) => CreateMessageResult | Promise<CreateMessageResult>,
  ) {}

  async createMessage(params: CreateMessageParams): Promise<CreateMessageResult> {
    return this.respond(params);
  }

  async throws(): Promise<never> {
    throw new Error("sampling unavailable");
  }
}

describe("MCPSamplingProvider", () => {
  it("generate returns the sampled text on success", async () => {
    const client = new FakeMcpSamplingClient(() => ({
      content: { type: "text", text: "dark IDM concept" },
    }));
    const provider = new MCPSamplingProvider(client);

    const result = await provider.generate({ instruction: "propose a track concept" });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe("dark IDM concept");
    }
  });

  it("generate returns a ProviderUnavailable error instead of throwing when the client throws", async () => {
    const client: McpSamplingClient = {
      createMessage: async () => {
        throw new Error("host does not support sampling");
      },
    };
    const provider = new MCPSamplingProvider(client);

    const result = await provider.generate({ instruction: "propose a track concept" });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("ProviderUnavailable");
    }
  });

  it("generate returns InvalidResponse when the sampled content is not text", async () => {
    const client: McpSamplingClient = {
      createMessage: async () => ({ content: { type: "image" } }),
    };
    const provider = new MCPSamplingProvider(client);

    const result = await provider.generate({ instruction: "propose a track concept" });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("InvalidResponse");
    }
  });

  it("review parses a well-formed JSON response into a ReviewResult", async () => {
    const client = new FakeMcpSamplingClient(() => ({
      content: {
        type: "text",
        text: '{"score": 0.75, "summary": "solid rhythm", "notes": ["good energy"]}',
      },
    }));
    const provider = new MCPSamplingProvider(client);

    const result = await provider.review({ subject: "track-1", criteria: ["rhythm"] });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toEqual({
        score: 0.75,
        summary: "solid rhythm",
        notes: ["good energy"],
      });
    }
  });

  it("review returns InvalidResponse when the sampled text is not valid JSON", async () => {
    const client = new FakeMcpSamplingClient(() => ({
      content: { type: "text", text: "not json" },
    }));
    const provider = new MCPSamplingProvider(client);

    const result = await provider.review({ subject: "track-1", criteria: ["rhythm"] });

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error.type).toBe("InvalidResponse");
    }
  });

  it("improve returns the sampled revision", async () => {
    const client = new FakeMcpSamplingClient(() => ({
      content: { type: "text", text: "revised prompt" },
    }));
    const provider = new MCPSamplingProvider(client);

    const result = await provider.improve({
      original: "original prompt",
      feedback: "more aggressive",
    });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe("revised prompt");
    }
  });

  it("summarize returns the sampled summary", async () => {
    const client = new FakeMcpSamplingClient(() => ({
      content: { type: "text", text: "short summary" },
    }));
    const provider = new MCPSamplingProvider(client);

    const result = await provider.summarize({ content: "a very long piece of text" });

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value).toBe("short summary");
    }
  });

  it("exposes its provider name as mcpSampling", () => {
    const client = new FakeMcpSamplingClient(() => ({ content: { type: "text", text: "" } }));
    const provider = new MCPSamplingProvider(client);

    expect(provider.name).toBe("mcpSampling");
  });
});
