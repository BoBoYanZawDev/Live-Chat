import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryKeys } from '../../lib/queryClient';
import { getSocket } from '../../lib/socket';
import type { ConversationSummary, Operator } from '../../types';
import { applyConversationUpdate } from '../inbox/api';

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => api<ConversationSummary>(`/conversations/${id}`),
  });
}

export function useOperators() {
  return useQuery({ queryKey: queryKeys.operators, queryFn: () => api<Operator[]>('/operators') });
}

export function useUpdateConversation(id: string) {
  return useMutation({
    mutationFn: (changes: { status?: 'OPEN' | 'DONE'; assigneeId?: string | null }) =>
      api<ConversationSummary>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onSuccess: applyConversationUpdate,
  });
}

/** Marks customer messages as read by the team (shared inbox). */
export function markConversationRead(conversationId: string) {
  getSocket()?.emit('conversation:read', { conversationId });
}
