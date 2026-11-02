import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Customer } from '../types';

interface AuthState {
  token: string | null;
  customer: Customer | null;
  /** False until the persisted session has been read from AsyncStorage. */
  hydrated: boolean;
  setSession: (token: string, customer: Customer) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      customer: null,
      hydrated: false,
      setSession: (token, customer) => set({ token, customer }),
      clear: () => set({ token: null, customer: null }),
    }),
    {
      name: 'live-chat-customer-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ token, customer }) => ({ token, customer }),
      onRehydrateStorage: () => () => useAuthStore.setState({ hydrated: true }),
    },
  ),
);

/** Reaction identity key used in ReactionSummary.actorKeys. */
export const customerActorKey = (customerId: string) => `CUSTOMER:${customerId}`;
