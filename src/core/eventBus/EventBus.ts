import type { Result } from "../result/Result.js";
import type { CorrelationId, EventEnvelope } from "./envelope.js";
import type { DomainEvent } from "./events.js";

export type Unsubscribe = () => void;

export type SubscriberError = {
  readonly eventType: DomainEvent["type"];
  readonly error: unknown;
};

export type EventHandler<E extends DomainEvent> = (envelope: EventEnvelope<E>) => void;

export interface EventPublisher {
  publish<E extends DomainEvent>(
    payload: E,
    correlationId: CorrelationId,
  ): Result<EventEnvelope<E>, readonly SubscriberError[]>;
}

/**
 * handlerは同期関数として宣言する。将来「配送」自体を非同期化した
 * EventBus実装（キュー経由でのdispatch等）へ差し替える場合も、
 * このinterface自体は変更しなくてよい設計にしている。
 */
export interface EventSubscriber {
  subscribe<T extends DomainEvent["type"]>(
    eventType: T,
    handler: EventHandler<Extract<DomainEvent, { type: T }>>,
  ): Unsubscribe;
}

export interface EventBus extends EventPublisher, EventSubscriber {}
