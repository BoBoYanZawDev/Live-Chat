import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import type { Attachment } from '../../types';
import { useMessages, useToggleReaction } from './api';
import { Lightbox } from './Lightbox';
import { MessageItem } from './MessageItem';

interface Props {
  conversationId: string;
  customerLastReadAt: string | null;
}

export function MessageList({ conversationId, customerLastReadAt }: Props) {
  const me = useAuthStore((s) => s.operator);
  const myKey = me ? `OPERATOR:${me.id}` : '';
  const { data: messages = [], isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useMessages(conversationId);
  const { mutate: toggle, error: reactionError } = useToggleReaction(conversationId);
  const [openImage, setOpenImage] = useState<Attachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prevHeight = useRef<number | null>(null);
  const lastMessageId = useRef<string | undefined>(undefined);

  // "Seen" goes under the newest operator message the customer has read, Messenger style.
  const seenMessageId = useMemo(() => {
    if (!customerLastReadAt) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.senderType === 'OPERATOR' && !m.pending && m.createdAt <= customerLastReadAt) return m.id;
    }
    return null;
  }, [messages, customerLastReadAt]);

  const onScroll = () => {
    const el = scrollRef.current!;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = () => {
    prevHeight.current = scrollRef.current!.scrollHeight;
    void fetchNextPage();
  };

  const onToggleReaction = useCallback((messageId: string, emoji: string) => toggle({ messageId, emoji }), [toggle]);
  const closeImage = useCallback(() => setOpenImage(null), []);

  useEffect(() => {
    stickToBottom.current = true;
  }, [conversationId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = messages.at(-1);
    const isNewMessage = last?.id !== lastMessageId.current;
    lastMessageId.current = last?.id;

    if (prevHeight.current !== null) {
      // Keep the viewport anchored after prepending older messages.
      el.scrollTop += el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
    } else if (isNewMessage && (stickToBottom.current || last?.sender?.id === me?.id)) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, me?.id]);

  if (isLoading) return <div className="messages muted">Loading messages…</div>;
  if (error) return <div className="messages error">{error.message}</div>;

  return (
    <div className="messages" ref={scrollRef} onScroll={onScroll}>
      {hasNextPage && (
        <button className="load-older" onClick={loadOlder} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
        </button>
      )}
      {messages.length === 0 && <p className="muted center">No messages yet.</p>}
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showName =
          m.senderType === 'OPERATOR' &&
          m.sender?.id !== me?.id &&
          (prev?.senderType !== 'OPERATOR' || prev.sender?.id !== m.sender?.id);
        return (
          <MessageItem
            key={m.id}
            message={m}
            myKey={myKey}
            meId={me?.id}
            showName={showName}
            seen={m.id === seenMessageId}
            onToggleReaction={onToggleReaction}
            onOpenImage={setOpenImage}
          />
        );
      })}
      {reactionError && <p className="error center">{reactionError.message}</p>}
      {openImage && <Lightbox attachment={openImage} onClose={closeImage} />}
    </div>
  );
}
