import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  conversation: ['conversation'] as const,
  messages: ['conversation', 'messages'] as const,
};
