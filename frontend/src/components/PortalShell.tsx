import { useLogout } from '../features/auth/api';
import { ConversationView } from '../features/conversation/ConversationView';
import { CustomerPanel } from '../features/conversation/CustomerPanel';
import { ConversationList } from '../features/inbox/ConversationList';
import { OperatorsPage } from '../features/operators/OperatorsPage';
import { usePortalSocket } from '../hooks/usePortalSocket';
import { useAuthStore } from '../stores/auth.store';
import { usePortalStore } from '../stores/portal.store';
import { useSettingsStore } from '../stores/settings.store';
import { Avatar } from './Avatar';

export function PortalShell() {
  usePortalSocket();
  const me = useAuthStore((s) => s.operator)!;
  const { view, setView, activeConversationId, connection, onlineOperators } = usePortalStore();
  const logout = useLogout();
  const { soundEnabled, toggleSound } = useSettingsStore();

  return (
    <div className={`shell ${activeConversationId ? 'has-active' : ''}`}>
      <nav className="rail">
        <div className="rail-brand" title="Support Inbox">
          💬
        </div>
        <button className={`rail-item ${view === 'inbox' ? 'active' : ''}`} onClick={() => setView('inbox')} title="Inbox">
          <span>📥</span>
          <small>Inbox</small>
        </button>
        {me.role === 'ADMIN' && (
          <button
            className={`rail-item ${view === 'operators' ? 'active' : ''}`}
            onClick={() => setView('operators')}
            title="Operators"
          >
            <span>👥</span>
            <small>Team</small>
          </button>
        )}
        <div className="rail-spacer" />
        <button
          className="rail-item"
          onClick={toggleSound}
          title={soundEnabled ? 'Mute message sounds' : 'Turn message sounds on'}
          aria-pressed={soundEnabled}
        >
          <span>{soundEnabled ? '🔔' : '🔕'}</span>
          <small>{soundEnabled ? 'Sound on' : 'Muted'}</small>
        </button>
        <div className="rail-online" title={onlineOperators.map((o) => o.name).join(', ')}>
          <small>{onlineOperators.length} online</small>
        </div>
        <div className="rail-me" title={`${me.name} · ${connection}`}>
          <Avatar name={me.name} seed={me.id} size={36} online={connection === 'connected'} />
        </div>
        <button className="rail-item" onClick={() => logout.mutate()} title="Sign out">
          <span>⎋</span>
          <small>Sign out</small>
        </button>
      </nav>

      {connection === 'disconnected' && <div className="offline-banner">Reconnecting… live updates paused</div>}

      {view === 'operators' && me.role === 'ADMIN' ? (
        <OperatorsPage />
      ) : (
        <>
          <ConversationList />
          {activeConversationId ? (
            <>
              <ConversationView key={activeConversationId} conversationId={activeConversationId} />
              <CustomerPanel conversationId={activeConversationId} />
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h2>Select a conversation</h2>
              <p className="muted">Customer messages from the mobile app show up in the inbox in real time.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
