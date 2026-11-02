import { Avatar } from '../../components/Avatar';
import { formatDate, formatListTime } from '../../lib/format';
import { usePortalStore } from '../../stores/portal.store';
import { useConversation } from './api';

export function CustomerPanel({ conversationId }: { conversationId: string }) {
  const { data: c } = useConversation(conversationId);
  const online = usePortalStore((s) => !!c && s.onlineCustomerIds.has(c.customer.id));
  if (!c) return <aside className="customer-panel" />;

  return (
    <aside className="customer-panel">
      <div className="customer-card">
        <Avatar name={c.customer.name} seed={c.customer.id} size={72} online={online} />
        <h2>{c.customer.name}</h2>
        <span className={`status-pill ${online ? 'on' : ''}`}>{online ? 'Online in app' : 'Offline'}</span>
      </div>
      <dl className="details">
        <dt>Phone</dt>
        <dd>
          <a href={`tel:${c.customer.phone}`}>{c.customer.phone}</a>
        </dd>
        <dt>Customer since</dt>
        <dd>{formatDate(c.customer.createdAt)}</dd>
        <dt>Status</dt>
        <dd>
          <span className={`status-pill ${c.status === 'OPEN' ? 'open' : ''}`}>{c.status === 'OPEN' ? 'Open' : 'Done'}</span>
        </dd>
        <dt>Assigned to</dt>
        <dd>{c.assignee?.name ?? 'Unassigned'}</dd>
        {c.lastMessageAt && (
          <>
            <dt>Last message</dt>
            <dd>{formatListTime(c.lastMessageAt)}</dd>
          </>
        )}
        <dt>Seen by customer</dt>
        <dd>{c.customerLastReadAt ? formatListTime(c.customerLastReadAt) : 'Not yet'}</dd>
      </dl>
    </aside>
  );
}
