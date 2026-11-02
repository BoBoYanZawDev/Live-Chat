import type { AuthActor, PresenceSnapshot, TypingUpdate } from '../types/index.js';
import { actorKey, actorName } from '../types/index.js';

type TypingEntry = TypingUpdate['typing'][number];

/**
 * In-memory online/typing state. An actor may have several sockets (tabs/devices);
 * they count as online until the last one disconnects.
 */
export class PresenceService {
  private operators = new Map<string, { name: string; sockets: Set<string> }>();
  private customers = new Map<string, Set<string>>();
  private typing = new Map<string, Map<string, TypingEntry>>(); // conversationId -> actorKey -> entry

  /** Returns true when this is the actor's first socket (they just came online). */
  connect(actor: AuthActor, socketId: string) {
    if (actor.type === 'OPERATOR') {
      const entry = this.operators.get(actor.operator.id) ?? { name: actor.operator.name, sockets: new Set() };
      entry.sockets.add(socketId);
      this.operators.set(actor.operator.id, entry);
      return entry.sockets.size === 1;
    }
    const sockets = this.customers.get(actor.customer.id) ?? new Set();
    sockets.add(socketId);
    this.customers.set(actor.customer.id, sockets);
    return sockets.size === 1;
  }

  /** Returns true when the actor has no sockets left (fully offline). */
  disconnect(actor: AuthActor, socketId: string) {
    if (actor.type === 'OPERATOR') {
      const entry = this.operators.get(actor.operator.id);
      entry?.sockets.delete(socketId);
      if (entry && entry.sockets.size > 0) return false;
      this.operators.delete(actor.operator.id);
      return true;
    }
    const sockets = this.customers.get(actor.customer.id);
    sockets?.delete(socketId);
    if (sockets && sockets.size > 0) return false;
    this.customers.delete(actor.customer.id);
    return true;
  }

  snapshot(): PresenceSnapshot {
    return {
      operators: [...this.operators].map(([id, { name }]) => ({ id, name })),
      customerIds: [...this.customers.keys()],
    };
  }

  setTyping(conversationId: string, actor: AuthActor, isTyping: boolean): TypingUpdate {
    const entries = this.typing.get(conversationId) ?? new Map<string, TypingEntry>();
    const key = actorKey(actor);
    if (isTyping) {
      const id = actor.type === 'OPERATOR' ? actor.operator.id : actor.customer.id;
      entries.set(key, { actorType: actor.type, id, name: actorName(actor) });
    } else {
      entries.delete(key);
    }
    if (entries.size) this.typing.set(conversationId, entries);
    else this.typing.delete(conversationId);
    return { conversationId, typing: [...entries.values()] };
  }

  /** Clears the actor from every conversation's typing list; returns the updates to broadcast. */
  clearTyping(actor: AuthActor): TypingUpdate[] {
    const key = actorKey(actor);
    const changed: TypingUpdate[] = [];
    for (const [conversationId, entries] of this.typing) {
      if (entries.delete(key)) {
        changed.push({ conversationId, typing: [...entries.values()] });
        if (!entries.size) this.typing.delete(conversationId);
      }
    }
    return changed;
  }
}
