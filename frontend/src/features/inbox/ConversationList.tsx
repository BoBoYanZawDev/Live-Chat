import { useEffect, useState, type UIEvent } from 'react';
import { Avatar } from '../../components/Avatar';
import { formatListTime } from '../../lib/format';
import { useAuthStore } from '../../stores/auth.store';
import { usePortalStore } from '../../stores/portal.store';
import type { ConversationSummary, InboxFilter } from '../../types';
import { useInbox } from './api';

const FILTERS: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'mine', label: 'Assigned to me' },
  { value: 'done', label: 'Done' },
];

export function ConversationList() {
  const { filter, setFilter, search, setSearch } = usePortalStore();
  const [searchInput, setSearchInput] = useState(search);
  const { data: conversations = [], isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useInbox(
    filter,
    search,
  );

  // Debounce search so we don't query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (hasNextPage && !isFetchingNextPage && el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      void fetchNextPage();
    }
  };

  return (
    <aside className="inbox">
      <header className="inbox-header">
        <h1>Inbox</h1>
        <input
          className="search"
          type="search"
          placeholder="Search name or phone"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              className={`chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>
      <div className="inbox-list" onScroll={onScroll}>
        {isLoading && <p className="muted pad">Loading…</p>}
        {error && <p className="error pad">{error.message}</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="muted pad center">{search ? 'No matches' : 'No conversations here yet'}</p>
        )}
        {conversations.map((c) => (
          <ConversationRow key={c.id} conversation={c} />
        ))}
        {isFetchingNextPage && <p className="muted pad center">Loading more…</p>}
      </div>
    </aside>
  );
}

function ConversationRow({ conversation: c }: { conversation: ConversationSummary }) {
  const meId = useAuthStore((s) => s.operator?.id);
  const active = usePortalStore((s) => s.activeConversationId === c.id);
  const online = usePortalStore((s) => s.onlineCustomerIds.has(c.customer.id));
  const typing = usePortalStore((s) => s.typingByConversation[c.id]?.some((t) => t.actorType === 'CUSTOMER'));
  const open = usePortalStore((s) => s.openConversation);
  const unread = c.unreadCount > 0;

  const prefix = c.lastMessageSenderType === 'OPERATOR' ? 'You: ' : '';

  return (
    <button className={`convo-row ${active ? 'active' : ''} ${unread ? 'unread' : ''}`} onClick={() => open(c.id)}>
      <Avatar name={c.customer.name} seed={c.customer.id} online={online} />
      <div className="convo-main">
        <div className="convo-top">
          <span className="convo-name">{c.customer.name}</span>
          {c.lastMessageAt && <span className="convo-time">{formatListTime(c.lastMessageAt)}</span>}
        </div>
        <div className="convo-bottom">
          <span className={`convo-preview ${typing ? 'typing-text' : ''}`}>
            {typing ? 'typing…' : `${prefix}${c.lastMessagePreview ?? ''}`}
          </span>
          {unread && <span className="badge">{c.unreadCount}</span>}
        </div>
        {c.assignee && (
          <span className={`assignee-chip ${c.assignee.id === meId ? 'me' : ''}`}>
            {c.assignee.id === meId ? 'You' : c.assignee.name}
          </span>
        )}
      </div>
    </button>
  );
}
