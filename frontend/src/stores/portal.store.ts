import { create } from 'zustand';
import type { InboxFilter, PresenceSnapshot, TypingUpdate } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';
export type View = 'inbox' | 'operators';

interface PortalState {
  view: View;
  filter: InboxFilter;
  search: string;
  activeConversationId: string | null;
  connection: ConnectionStatus;
  onlineOperators: PresenceSnapshot['operators'];
  onlineCustomerIds: Set<string>;
  typingByConversation: Record<string, TypingUpdate['typing']>;
  setView: (view: View) => void;
  setFilter: (filter: InboxFilter) => void;
  setSearch: (search: string) => void;
  openConversation: (id: string | null) => void;
  setConnection: (status: ConnectionStatus) => void;
  setPresence: (snapshot: PresenceSnapshot) => void;
  setTyping: (update: TypingUpdate) => void;
  reset: () => void;
}

const initial = {
  view: 'inbox' as View,
  filter: 'all' as InboxFilter,
  search: '',
  activeConversationId: null,
  connection: 'disconnected' as ConnectionStatus,
  onlineOperators: [],
  onlineCustomerIds: new Set<string>(),
  typingByConversation: {},
};

export const usePortalStore = create<PortalState>()((set) => ({
  ...initial,
  setView: (view) => set({ view }),
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  openConversation: (activeConversationId) => set({ activeConversationId, view: 'inbox' }),
  setConnection: (connection) => set({ connection }),
  setPresence: ({ operators, customerIds }) =>
    set({ onlineOperators: operators, onlineCustomerIds: new Set(customerIds) }),
  setTyping: ({ conversationId, typing }) =>
    set((s) => ({ typingByConversation: { ...s.typingByConversation, [conversationId]: typing } })),
  reset: () => set({ ...initial, onlineCustomerIds: new Set() }),
}));
