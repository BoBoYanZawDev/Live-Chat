import { create } from 'zustand';
import type { PresenceSnapshot, TypingUpdate } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

type OnlineOperator = PresenceSnapshot['operators'][number];
type TypingEntry = TypingUpdate['typing'][number];

interface ChatState {
  connection: ConnectionStatus;
  operatorsOnline: OnlineOperator[];
  /** Operators currently typing in our conversation. */
  typing: TypingEntry[];
  /** When an operator last read the conversation (drives "Seen"). */
  operatorLastReadAt: string | null;
  setConnection: (status: ConnectionStatus) => void;
  setOperatorsOnline: (operators: OnlineOperator[]) => void;
  setTyping: (typing: TypingEntry[]) => void;
  setOperatorLastReadAt: (at: string | null) => void;
  reset: () => void;
}

const initial = {
  connection: 'disconnected' as ConnectionStatus,
  operatorsOnline: [] as OnlineOperator[],
  typing: [] as TypingEntry[],
  operatorLastReadAt: null as string | null,
};

export const useChatStore = create<ChatState>()((set) => ({
  ...initial,
  setConnection: (connection) => set({ connection }),
  setOperatorsOnline: (operatorsOnline) => set({ operatorsOnline }),
  setTyping: (typing) => set({ typing: typing.filter((t) => t.actorType === 'OPERATOR') }),
  // Only move forward: a stale snapshot must not hide a newer "Seen".
  setOperatorLastReadAt: (at) =>
    set((s) => ({
      operatorLastReadAt:
        at && s.operatorLastReadAt && Date.parse(s.operatorLastReadAt) > Date.parse(at) ? s.operatorLastReadAt : at,
    })),
  reset: () => set(initial),
}));
