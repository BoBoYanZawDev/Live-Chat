import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { useAuthStore } from '../../stores/auth.store';
import type { ConversationPage, ConversationSummary, InboxFilter, ReadUpdate } from '../../types';

type InboxData = InfiniteData<ConversationPage, string | undefined>;

export function useInbox(filter: InboxFilter, search: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.inbox(filter, search),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ filter });
      if (search) params.set('search', search);
      if (pageParam) params.set('cursor', pageParam);
      return api<ConversationPage>(`/conversations?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
  });
}

/** Mirrors the server-side inbox filters so live updates land in the right lists. */
function matches(c: ConversationSummary, filter: InboxFilter, search: string) {
  if (!c.lastMessageAt) return false;
  if (filter === 'done') {
    if (c.status !== 'DONE') return false;
  } else if (c.status !== 'OPEN') return false;
  if (filter === 'unread' && c.unreadCount === 0) return false;
  if (filter === 'mine' && c.assignee?.id !== useAuthStore.getState().operator?.id) return false;
  if (search) {
    const q = search.toLowerCase();
    if (!c.customer.name.toLowerCase().includes(q) && !c.customer.phone.includes(q)) return false;
  }
  return true;
}

const byRecent = (a: ConversationSummary, b: ConversationSummary) =>
  (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '');

/** Applies a live conversation change to every cached inbox list and the detail cache. */
export function applyConversationUpdate(conversation: ConversationSummary) {
  queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);

  for (const query of queryClient.getQueryCache().findAll({ queryKey: queryKeys.inboxAll })) {
    const [, filter, search] = query.queryKey as ReturnType<typeof queryKeys.inbox>;
    queryClient.setQueryData<InboxData>(query.queryKey, (data) => {
      if (!data) return data;
      const pages = data.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== conversation.id) }));
      if (matches(conversation, filter, search)) {
        pages[0] = { ...pages[0], items: [...pages[0].items, conversation].sort(byRecent) };
      }
      return { ...data, pages };
    });
  }
}

/** Keeps "Seen" state in sync when the customer reads. */
export function applyReadUpdate(update: ReadUpdate) {
  const patch = (c: ConversationSummary): ConversationSummary =>
    update.reader === 'CUSTOMER' ? { ...c, customerLastReadAt: update.lastReadAt } : c;
  const current = queryClient.getQueryData<ConversationSummary>(queryKeys.conversation(update.conversationId));
  if (current) applyConversationUpdate(patch(current));
}

/** Unread conversations across the loaded "all" inbox, for the tab title badge. */
export function countUnread() {
  const data = queryClient.getQueryData<InboxData>(queryKeys.inbox('all', ''));
  return data?.pages.reduce((n, p) => n + p.items.filter((c) => c.unreadCount > 0).length, 0) ?? 0;
}
