import { describe, expect, it } from "vitest";
import { isFailure, isSuccess } from "../result/Result.js";
import { SynchronousEventBus } from "./SynchronousEventBus.js";
import type { GenerationCompleted, GenerationRequested } from "./events.js";

const track = {
  id: "job-1",
  audioFilePath: "/output/tracks/job-1.mp3",
  durationSec: 180,
  rendererMeta: {},
};

const requestedPayload: GenerationRequested = {
  type: "GenerationRequested",
  prompt: {
    genre: "IDM",
    mood: ["dark"],
    rhythm: "broken beat",
    texture: "granular",
    mix: "wide stereo",
    rendererParameters: {},
    version: 1,
  },
};

const completedPayload: GenerationCompleted = {
  type: "GenerationCompleted",
  jobId: "job-1",
  track,
};

describe("SynchronousEventBus", () => {
  it("delivers an event to a single subscriber", () => {
    const bus = new SynchronousEventBus();
    const received: GenerationRequested[] = [];

    bus.subscribe("GenerationRequested", (envelope) => received.push(envelope.payload));
    bus.publish(requestedPayload, "corr-1");

    expect(received).toEqual([requestedPayload]);
  });

  it("delivers an event to multiple subscribers", () => {
    const bus = new SynchronousEventBus();
    const first: GenerationRequested[] = [];
    const second: GenerationRequested[] = [];

    bus.subscribe("GenerationRequested", (envelope) => first.push(envelope.payload));
    bus.subscribe("GenerationRequested", (envelope) => second.push(envelope.payload));
    bus.publish(requestedPayload, "corr-1");

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it("stops delivering to a handler after unsubscribe", () => {
    const bus = new SynchronousEventBus();
    const received: GenerationRequested[] = [];

    const unsubscribe = bus.subscribe("GenerationRequested", (envelope) =>
      received.push(envelope.payload),
    );
    unsubscribe();
    bus.publish(requestedPayload, "corr-1");

    expect(received).toHaveLength(0);
  });

  it("delivers events to a subscriber in publish order", () => {
    const bus = new SynchronousEventBus();
    const order: string[] = [];

    bus.subscribe("GenerationRequested", () => order.push("requested"));
    bus.subscribe("GenerationCompleted", () => order.push("completed"));

    bus.publish(requestedPayload, "corr-1");
    bus.publish(completedPayload, "corr-1");

    expect(order).toEqual(["requested", "completed"]);
  });

  it("isolates a throwing subscriber so other subscribers still run", () => {
    const bus = new SynchronousEventBus();
    const received: string[] = [];

    bus.subscribe("GenerationRequested", () => {
      throw new Error("boom");
    });
    bus.subscribe("GenerationRequested", () => received.push("second handler ran"));

    const result = bus.publish(requestedPayload, "corr-1");

    expect(received).toEqual(["second handler ran"]);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0]?.eventType).toBe("GenerationRequested");
    }
  });

  it("returns Success with the envelope when no subscriber throws", () => {
    const bus = new SynchronousEventBus();
    bus.subscribe("GenerationRequested", () => {});

    const result = bus.publish(requestedPayload, "corr-1");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.payload).toEqual(requestedPayload);
    }
  });

  it("preserves correlationId on the delivered envelope", () => {
    const bus = new SynchronousEventBus();
    let capturedCorrelationId: string | undefined;

    bus.subscribe("GenerationRequested", (envelope) => {
      capturedCorrelationId = envelope.correlationId;
    });
    bus.publish(requestedPayload, "corr-42");

    expect(capturedCorrelationId).toBe("corr-42");
  });

  it("assigns a unique eventId and an ISO timestamp to each published envelope", () => {
    const bus = new SynchronousEventBus();
    const result = bus.publish(requestedPayload, "corr-1");

    expect(isSuccess(result)).toBe(true);
    if (isSuccess(result)) {
      expect(result.value.eventId).toEqual(expect.any(String));
      expect(result.value.eventId.length).toBeGreaterThan(0);
      expect(new Date(result.value.timestamp).toISOString()).toBe(result.value.timestamp);
    }
  });

  it("does not deliver events to subscribers of a different event type", () => {
    const bus = new SynchronousEventBus();
    const received: GenerationCompleted[] = [];

    bus.subscribe("GenerationCompleted", (envelope) => received.push(envelope.payload));
    bus.publish(requestedPayload, "corr-1");

    expect(received).toHaveLength(0);
  });
});
