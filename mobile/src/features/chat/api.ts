import { useInfiniteQuery, useMutation, useQuery, type InfiniteData } from '@tanstack/react-query';
import { useState } from 'react';
import { api, appendFile, uploadForm, type UploadFile } from '../../lib/api';
import { playSound } from '../../lib/sound';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { getSocket } from '../../lib/socket';
import { customerActorKey, useAuthStore } from '../../stores/auth.store';
import { useChatStore } from '../../stores/chat.store';
import type { ChatMessage, CustomerConversation, Message, MessagePage, ReactionSummary, ReactionUpdate } from '../../types';

type MessagesData = InfiniteData<MessagePage, string | undefined>;

const PAGE_SIZE = 30;

export function useConversation() {
  return useQuery({
    queryKey: queryKeys.conversation,
    queryFn: () => api<CustomerConversation>('/customer/conversation'),
  });
}

/**
 * pages[0] holds the newest messages; later pages go further back in time. Items inside a page are
 * oldest→newest. `select` flattens to newest-first, which is what an inverted FlatList wants.
 */
export function useMessages() {
  return useInfiniteQuery({
    queryKey: queryKeys.messages,
    queryFn: ({ pageParam }) => {
      const params = [`limit=${PAGE_SIZE}`];
      if (pageParam) params.push(`before=${encodeURIComponent(pageParam)}`);
      return api<MessagePage>(`/customer/conversation/messages?${params.join('&')}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (data): ChatMessage[] => data.pages.flatMap((p) => [...p.items].reverse()),
  });
}

function updateNewestPage(fn: (items: ChatMessage[]) => ChatMessage[]) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages, (data) => {
    if (!data || data.pages.length === 0) return data;
    const [newest, ...rest] = data.pages;
    return { ...data, pages: [{ ...newest, items: fn(newest.items) }, ...rest] };
  });
}

function updateMessage(messageId: string, fn: (m: ChatMessage) => ChatMessage) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages, (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === messageId ? fn(m) : m)) })),
    };
  });
}

const isCached = (data: MessagesData | undefined, id: string) =>
  !!data?.pages.some((p) => p.items.some((m) => m.id === id));

/** Inserts a message unless it's already cached (socket broadcast and ack can both deliver it). */
export function addMessageToCache(message: Message) {
  if (isCached(queryClient.getQueryData<MessagesData>(queryKeys.messages), message.id)) return;
  updateNewestPage((items) => [...items, message]);
}

export function applyReactionUpdate({ messageId, reactions }: ReactionUpdate) {
  updateMessage(messageId, (m) => ({ ...m, reactions }));
}

const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function requireSocket() {
  const socket = getSocket();
  if (!socket?.connected) throw new Error("You're offline. Check your connection and try again.");
  return socket;
}

/** Text-only messages go over the socket with an optimistic bubble. */
export function useSendMessage() {
  return useMutation({
    mutationFn: async (content: string) => {
      const socket = getSocket();
      if (!socket?.connected) {
        // Offline socket but maybe reachable over HTTP: fall back to the REST endpoint.
        const form = new FormData();
        form.append('content', content);
        return uploadForm<Message>('/customer/conversation/messages', form);
      }
      const res = await socket.timeout(10_000).emitWithAck('message:send', { content });
      if (!res.ok) throw new Error(res.error);
      return res.message;
    },
    onMutate: (content) => {
      const customer = useAuthStore.getState().customer;
      const temp: ChatMessage = {
        id: tempId(),
        conversationId: '',
        senderType: 'CUSTOMER',
        sender: customer ? { id: customer.id, name: customer.name } : null,
        content,
        attachments: [],
        reactions: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      updateNewestPage((items) => [...items, temp]);
      return { tempId: temp.id };
    },
    onSuccess: (message, _content, ctx) => {
      void playSound('sent');
      updateNewestPage((items) => {
        const withoutTemp = items.filter((m) => m.id !== ctx.tempId);
        return withoutTemp.some((m) => m.id === message.id) ? withoutTemp : [...withoutTemp, message];
      });
    },
    onError: (_err, _content, ctx) => {
      if (ctx) updateNewestPage((items) => items.filter((m) => m.id !== ctx.tempId));
    },
  });
}

/** Messages with photos/videos go over multipart HTTP so we can show upload progress. */
export function useSendMediaMessage() {
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files: UploadFile[] }) => {
      const form = new FormData();
      form.append('content', content);
      for (const file of files) appendFile(form, 'files', file);
      setProgress(0);
      return uploadForm<Message>('/customer/conversation/messages', form, setProgress);
    },
    onSuccess: (message) => {
      void playSound('sent');
      addMessageToCache(message);
    },
    onSettled: () => setProgress(0),
  });
  return { ...mutation, progress };
}

const toggleLocal = (reactions: ReactionSummary[], emoji: string, key: string): ReactionSummary[] => {
  const removing = reactions.some((r) => r.emoji === emoji && r.actorKeys.includes(key));
  const updated = reactions
    .map((r) => {
      const actorKeys = r.actorKeys.filter((k) => k !== key);
      return { ...r, actorKeys, count: actorKeys.length };
    })
    .filter((r) => r.count > 0);
  if (removing) return updated;
  const existing = updated.find((r) => r.emoji === emoji);
  return existing
    ? updated.map((r) => r.emoji === emoji ? { ...r, actorKeys: [...r.actorKeys, key], count: r.count + 1 } : r)
    : [...updated, { emoji, count: 1, actorKeys: [key] }];
};

export function useToggleReaction() {
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await requireSocket().timeout(10_000).emitWithAck('reaction:toggle', { messageId, emoji });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onMutate: ({ messageId, emoji }) => {
      const customerId = useAuthStore.getState().customer?.id;
      if (!customerId) return { previous: null };
      let previous: ReactionSummary[] | null = null;
      updateMessage(messageId, (m) => {
        previous = m.reactions;
        return { ...m, reactions: toggleLocal(m.reactions, emoji, customerActorKey(customerId)) };
      });
      return { previous };
    },
    onSuccess: applyReactionUpdate,
    onError: (_err, { messageId }, ctx) => {
      const previous = ctx?.previous;
      if (previous) updateMessage(messageId, (m) => ({ ...m, reactions: previous }));
    },
  });
}

let lastReadEmit = 0;
let trailingRead: ReturnType<typeof setTimeout> | null = null;

/** Marks operator messages as read: socket when connected, REST otherwise. Throttled to 1/s (with a trailing call). */
export function markConversationRead() {
  if (!useAuthStore.getState().token) return;
  const wait = 1000 - (Date.now() - lastReadEmit);
  if (wait > 0) {
    trailingRead ??= setTimeout(() => {
      trailingRead = null;
      markConversationRead();
    }, wait);
    return;
  }
  lastReadEmit = Date.now();

  queryClient.setQueryData<CustomerConversation>(queryKeys.conversation, (c) => (c ? { ...c, unreadCount: 0 } : c));
  const socket = getSocket();
  if (socket?.connected) socket.emit('conversation:read', {});
  else void api<void>('/customer/conversation/read', { method: 'POST' }).catch(() => {});
}

/** Typing indicator emitter: start once on input, stop after 2s idle or on send. */
let typingActive = false;
let typingTimer: ReturnType<typeof setTimeout> | null = null;

export function notifyTyping() {
  const socket = getSocket();
  if (!socket?.connected) return;
  if (!typingActive) {
    typingActive = true;
    socket.emit('typing:start', {});
  }
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(stopTyping, 2000);
}

export function stopTyping() {
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = null;
  if (!typingActive) return;
  typingActive = false;
  getSocket()?.emit('typing:stop', {});
}

/** Seeds the "Seen" marker from the REST conversation snapshot. */
export function syncConversationIntoStore(conversation: CustomerConversation | undefined) {
  if (conversation) useChatStore.getState().setOperatorLastReadAt(conversation.operatorLastReadAt);
}
