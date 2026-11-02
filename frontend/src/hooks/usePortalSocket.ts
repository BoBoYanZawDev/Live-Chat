import { useEffect } from 'react';
import { applyConversationUpdate, applyReadUpdate, countUnread } from '../features/inbox/api';
import { addMessageToCache, applyReactionUpdate } from '../features/messages/api';
import { queryClient } from '../lib/queryClient';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { playSound } from '../lib/sound';
import { useAuthStore } from '../stores/auth.store';
import { usePortalStore } from '../stores/portal.store';

const BASE_TITLE = 'Support Inbox';

/** Opens the operator socket and pipes server events into the query cache / store. */
export function usePortalSocket() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const portal = usePortalStore.getState();
    const socket = connectSocket(token);
    let hasConnected = false;
    portal.setConnection('connecting');

    const refreshTitle = () => {
      const unread = countUnread();
      document.title = unread ? `(${unread}) ${BASE_TITLE}` : BASE_TITLE;
    };

    socket.on('connect', () => {
      portal.setConnection('connected');
      // After a reconnect, refetch everything to pick up what was missed while offline.
      if (hasConnected) void queryClient.invalidateQueries();
      hasConnected = true;
    });
    socket.on('disconnect', () => portal.setConnection('disconnected'));
    socket.on('connect_error', (err) => {
      portal.setConnection('disconnected');
      if (/token|deactivated/i.test(err.message)) useAuthStore.getState().clear();
    });

    socket.on('message:new', (message) => {
      addMessageToCache(message);
      if (message.senderType === 'CUSTOMER') void playSound('incoming');
    });
    socket.on('reaction:update', applyReactionUpdate);
    socket.on('read:update', applyReadUpdate);
    socket.on('conversation:updated', (c) => {
      applyConversationUpdate(c);
      refreshTitle();
    });
    socket.on('presence:update', portal.setPresence);
    socket.on('typing:update', portal.setTyping);

    const unsubscribe = queryClient.getQueryCache().subscribe(refreshTitle);
    return () => {
      unsubscribe();
      disconnectSocket();
      portal.setConnection('disconnected');
      document.title = BASE_TITLE;
    };
  }, [token]);
}
