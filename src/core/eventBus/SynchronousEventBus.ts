import { failure, success } from "../result/Result.js";
import type { Result } from "../result/Result.js";
import type { CorrelationId, EventEnvelope, EventId } from "./envelope.js";
import type { DomainEvent } from "./events.js";
import type { EventBus, EventHandler, SubscriberError, Unsubscribe } from "./EventBus.js";

type AnyHandler = EventHandler<DomainEvent>;

export type SynchronousEventBusOptions = {
  readonly idGenerator?: () => EventId;
  readonly clock?: () => string;
};

function defaultIdGenerator(): EventId {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class SynchronousEventBus implements EventBus {
  private readonly handlersByType = new Map<DomainEvent["type"], Set<AnyHandler>>();
  private readonly generateId: () => EventId;
  private readonly now: () => string;

  constructor(options: SynchronousEventBusOptions = {}) {
    this.generateId = options.idGenerator ?? defaultIdGenerator;
    this.now = options.clock ?? (() => new Date().toISOString());
  }

  publish<E extends DomainEvent>(
    payload: E,
    correlationId: CorrelationId,
  ): Result<EventEnvelope<E>, readonly SubscriberError[]> {
    const envelope: EventEnvelope<E> = {
      eventId: this.generateId(),
      timestamp: this.now(),
      correlationId,
      payload,
    };

    const errors: SubscriberError[] = [];
    const subscribers = this.handlersByType.get(payload.type);

    if (subscribers) {
      for (const handler of [...subscribers]) {
        try {
          handler(envelope as EventEnvelope<DomainEvent>);
        } catch (error) {
          errors.push({ eventType: payload.type, error });
        }
      }
    }

    return errors.length > 0
      ? failure<EventEnvelope<E>, readonly SubscriberError[]>(errors)
      : success<EventEnvelope<E>, readonly SubscriberError[]>(envelope);
  }

  subscribe<T extends DomainEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<DomainEvent, { type: T }>>,
  ): Unsubscribe {
    const existing = this.handlersByType.get(eventType) ?? new Set<AnyHandler>();
    existing.add(handler as AnyHandler);
    this.handlersByType.set(eventType, existing);

    return () => {
      existing.delete(handler as AnyHandler);
    };
  }
}
