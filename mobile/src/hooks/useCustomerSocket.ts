import { useEffect } from 'react';
import { AppState } from 'react-native';
import { addMessageToCache, applyReactionUpdate, markConversationRead, stopTyping } from '../features/chat/api';
import { queryClient, queryKeys } from '../lib/queryClient';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { playSound, preloadSounds } from '../lib/sound';
import { useAuthStore } from '../stores/auth.store';
import { useChatStore } from '../stores/chat.store';

/** Opens the socket for the logged-in customer and pipes server events into the query cache / store. */
export function useCustomerSocket() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    const chat = useChatStore.getState();
    const socket = connectSocket(token);
    preloadSounds();
    let hasConnected = false;
    chat.setConnection('connecting');

    socket.on('connect', () => {
      chat.setConnection('connected');
      // After a reconnect, refetch to pick up anything missed while offline.
      if (hasConnected) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.messages });
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversation, exact: true });
      }
      hasConnected = true;
      if (AppState.currentState === 'active') markConversationRead();
    });
    socket.on('disconnect', () => {
      chat.setConnection('disconnected');
      chat.setTyping([]);
    });
    socket.on('connect_error', (err) => {
      chat.setConnection('disconnected');
      if (/token|unauthori[sz]ed|auth/i.test(err.message)) useAuthStore.getState().clear();
    });

    socket.on('message:new', (message) => {
      addMessageToCache(message);
      if (message.senderType === 'OPERATOR') {
        void playSound('incoming');
        if (AppState.currentState === 'active') markConversationRead();
      }
    });
    socket.on('reaction:update', applyReactionUpdate);
    socket.on('read:update', ({ reader, lastReadAt }) => {
      if (reader === 'OPERATOR') chat.setOperatorLastReadAt(lastReadAt);
    });
    socket.on('typing:update', ({ typing }) => chat.setTyping(typing));
    socket.on('presence:update', ({ operators }) => chat.setOperatorsOnline(operators));

    return () => {
      stopTyping();
      disconnectSocket();
      chat.setConnection('disconnected');
    };
  }, [token]);
}
