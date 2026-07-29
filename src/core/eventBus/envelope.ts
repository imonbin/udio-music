import type { DomainEvent } from "./events.js";

export type EventId = string;
export type CorrelationId = string;

export type EventEnvelope<E extends DomainEvent = DomainEvent> = {
  readonly eventId: EventId;
  readonly timestamp: string;
  readonly correlationId: CorrelationId;
  readonly payload: E;
};
