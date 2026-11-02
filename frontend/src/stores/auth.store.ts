import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Operator } from '../types';

interface AuthState {
  operator: Operator | null;
  token: string | null;
  setSession: (operator: Operator, token: string) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      operator: null,
      token: null,
      setSession: (operator, token) => set({ operator, token }),
      clear: () => set({ operator: null, token: null }),
    }),
    { name: 'live-chat-operator-auth' },
  ),
);

export const myActorKey = () => {
  const id = useAuthStore.getState().operator?.id;
  return id ? `OPERATOR:${id}` : '';
};
