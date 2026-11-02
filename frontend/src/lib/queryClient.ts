import { QueryClient } from '@tanstack/react-query';
import type { InboxFilter } from '../types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export const queryKeys = {
  inboxAll: ['inbox'] as const,
  inbox: (filter: InboxFilter, search: string) => ['inbox', filter, search] as const,
  conversation: (id: string) => ['conversation', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  operators: ['operators'] as const,
};
