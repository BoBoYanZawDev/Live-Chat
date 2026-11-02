import { useInfiniteQuery, useMutation, type InfiniteData } from '@tanstack/react-query';
import { useState } from 'react';
import { api, uploadForm } from '../../lib/api';
import { queryClient, queryKeys } from '../../lib/queryClient';
import { getSocket } from '../../lib/socket';
import { playSound } from '../../lib/sound';
import { myActorKey, useAuthStore } from '../../stores/auth.store';
import type { ChatMessage, MessagePage, ReactionSummary, ReactionUpdate } from '../../types';

type MessagesData = InfiniteData<MessagePage, string | undefined>;

/** pages[0] holds the newest messages; later pages go further back in time. */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam) params.set('before', pageParam);
      return api<MessagePage>(`/conversations/${conversationId}/messages?${params}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (data): ChatMessage[] => data.pages.toReversed().flatMap((p) => p.items),
  });
}

function updateNewestPage(conversationId: string, fn: (items: ChatMessage[]) => ChatMessage[]) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(conversationId), (data) => {
    if (!data) return data;
    const [newest, ...rest] = data.pages;
    return { ...data, pages: [{ ...newest, items: fn(newest.items) }, ...rest] };
  });
}

function updateMessage(conversationId: string, messageId: string, fn: (m: ChatMessage) => ChatMessage) {
  queryClient.setQueryData<MessagesData>(queryKeys.messages(conversationId), (data) => {
    if (!data) return data;
    return {
      ...data,
      pages: data.pages.map((p) => ({ ...p, items: p.items.map((m) => (m.id === messageId ? fn(m) : m)) })),
    };
  });
}

/** Inserts a message unless it's already cached (socket broadcast and ack can both deliver it). */
export function addMessageToCache(message: ChatMessage) {
  updateNewestPage(message.conversationId, (items) =>
    items.some((m) => m.id === message.id) ? items : [...items, message],
  );
}

export function applyReactionUpdate({ conversationId, messageId, reactions }: ReactionUpdate) {
  updateMessage(conversationId, messageId, (m) => ({ ...m, reactions }));
}

function requireSocket() {
  const socket = getSocket();
  if (!socket?.connected) throw new Error('Not connected');
  return socket;
}

/** Text-only replies go over the socket with an optimistic bubble. */
export function useSendMessage(conversationId: string) {
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await requireSocket().timeout(10_000).emitWithAck('message:send', { conversationId, content });
      if (!res.ok) throw new Error(res.error);
      return res.message;
    },
    onMutate: (content) => {
      const operator = useAuthStore.getState().operator!;
      const temp: ChatMessage = {
        id: `temp-${crypto.randomUUID()}`,
        conversationId,
        senderType: 'OPERATOR',
        sender: { id: operator.id, name: operator.name },
        content,
        attachments: [],
        reactions: [],
        createdAt: new Date().toISOString(),
        pending: true,
      };
      updateNewestPage(conversationId, (items) => [...items, temp]);
      return { tempId: temp.id };
    },
    onSuccess: (message, _content, ctx) => {
      void playSound('sent');
      updateNewestPage(conversationId, (items) => {
        const withoutTemp = items.filter((m) => m.id !== ctx.tempId);
        return withoutTemp.some((m) => m.id === message.id) ? withoutTemp : [...withoutTemp, message];
      });
    },
    onError: (_err, _content, ctx) => {
      if (ctx) updateNewestPage(conversationId, (items) => items.filter((m) => m.id !== ctx.tempId));
    },
  });
}

/** Messages with photos/videos go over multipart HTTP so we can show upload progress. */
export function useSendMediaMessage(conversationId: string) {
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: ({ content, files }: { content: string; files: File[] }) => {
      const form = new FormData();
      form.append('content', content);
      for (const file of files) form.append('files', file);
      setProgress(0);
      return uploadForm<ChatMessage>(`/conversations/${conversationId}/messages`, form, setProgress);
    },
    onSuccess: (message) => {
      void playSound('sent');
      addMessageToCache(message);
    },
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

export function useToggleReaction(conversationId: string) {
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await requireSocket().timeout(10_000).emitWithAck('reaction:toggle', { messageId, emoji });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onMutate: ({ messageId, emoji }) => {
      let previous: ReactionSummary[] = [];
      updateMessage(conversationId, messageId, (m) => {
        previous = m.reactions;
        return { ...m, reactions: toggleLocal(m.reactions, emoji, myActorKey()) };
      });
      return { previous };
    },
    onSuccess: applyReactionUpdate,
    onError: (_err, { messageId }, ctx) => {
      if (ctx) updateMessage(conversationId, messageId, (m) => ({ ...m, reactions: ctx.previous }));
    },
  });
}
