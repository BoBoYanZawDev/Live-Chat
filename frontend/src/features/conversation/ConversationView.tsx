import { useEffect } from 'react';
import { Avatar } from '../../components/Avatar';
import { usePortalStore } from '../../stores/portal.store';
import { MessageInput } from '../messages/MessageInput';
import { MessageList } from '../messages/MessageList';
import { markConversationRead, useConversation, useOperators, useUpdateConversation } from './api';

export function ConversationView({ conversationId }: { conversationId: string }) {
  const { data: conversation, error } = useConversation(conversationId);
  const { data: operators = [] } = useOperators();
  const update = useUpdateConversation(conversationId);
  const openConversation = usePortalStore((s) => s.openConversation);
  const connected = usePortalStore((s) => s.connection === 'connected');
  const online = usePortalStore((s) => !!conversation && s.onlineCustomerIds.has(conversation.customer.id));
  // Keep the store snapshot stable when no typing update exists yet.
  const typingNames = usePortalStore((s) => s.typingByConversation[conversationId]) ?? [];
  const unread = conversation?.unreadCount ?? 0;

  // Opening a conversation (or receiving new messages while it's open and visible) marks it read.
  useEffect(() => {
    if (!connected || unread === 0) return;
    const markIfVisible = () => {
      if (document.visibilityState === 'visible') markConversationRead(conversationId);
    };
    markIfVisible();
    document.addEventListener('visibilitychange', markIfVisible);
    return () => document.removeEventListener('visibilitychange', markIfVisible);
  }, [conversationId, unread, connected]);

  if (error) return <section className="conversation error pad">{error.message}</section>;
  if (!conversation) return <section className="conversation muted pad">Loading…</section>;

  const customerTyping = typingNames.some((t) => t.actorType === 'CUSTOMER');
  const otherOperatorsTyping = typingNames.filter((t) => t.actorType === 'OPERATOR').map((t) => t.name);
  const done = conversation.status === 'DONE';

  return (
    <section className="conversation">
      <header className="conversation-header">
        <button className="ghost back" onClick={() => openConversation(null)} aria-label="Back to inbox">
          ←
        </button>
        <Avatar name={conversation.customer.name} seed={conversation.customer.id} online={online} />
        <div className="conversation-title">
          <strong>{conversation.customer.name}</strong>
          <span className="muted small">
            {customerTyping ? <em className="typing-text">typing…</em> : online ? 'Active now' : conversation.customer.phone}
          </span>
        </div>
        <div className="conversation-actions">
          <select
            value={conversation.assignee?.id ?? ''}
            onChange={(e) => update.mutate({ assigneeId: e.target.value || null })}
            disabled={update.isPending}
            aria-label="Assignee"
          >
            <option value="">Unassigned</option>
            {operators
              .filter((o) => o.isActive)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
          <button
            className={done ? 'secondary' : ''}
            onClick={() => update.mutate({ status: done ? 'OPEN' : 'DONE' })}
            disabled={update.isPending}
          >
            {done ? 'Reopen' : '✓ Mark done'}
          </button>
        </div>
      </header>
      {update.error && <p className="error pad">{update.error.message}</p>}
      <MessageList conversationId={conversationId} customerLastReadAt={conversation.customerLastReadAt} />
      <div className="typing">
        {otherOperatorsTyping.length > 0 && `${otherOperatorsTyping.join(', ')} is replying…`}
        {customerTyping && `${conversation.customer.name} is typing…`}
      </div>
      <MessageInput conversationId={conversationId} />
    </section>
  );
}
