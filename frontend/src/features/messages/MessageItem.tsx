import { memo } from 'react';
import { formatTime } from '../../lib/format';
import type { Attachment, ChatMessage } from '../../types';
import { ReactionBar } from './ReactionBar';

interface Props {
  message: ChatMessage;
  myKey: string;
  meId?: string;
  /** Show the sender's name (first message in a run from another operator). */
  showName: boolean;
  seen: boolean;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onOpenImage: (attachment: Attachment) => void;
}

/** Operator replies sit on the right (the team's side), customer messages on the left. */
export const MessageItem = memo(function MessageItem({
  message: m,
  myKey,
  meId,
  showName,
  seen,
  onToggleReaction,
  onOpenImage,
}: Props) {
  if (m.senderType === 'SYSTEM') return <div className="system-message">{m.content}</div>;

  const outgoing = m.senderType === 'OPERATOR';
  const byOtherOperator = outgoing && m.sender?.id !== meId;

  return (
    <div className={`message ${outgoing ? 'outgoing' : ''} ${byOtherOperator ? 'teammate' : ''} ${m.pending ? 'pending' : ''}`}>
      {showName && m.sender && <span className="sender">{m.sender.name}</span>}
      {m.attachments.length > 0 && (
        <div className={`attachments count-${Math.min(m.attachments.length, 3)}`}>
          {m.attachments.map((a) =>
            a.type === 'IMAGE' ? (
              <button key={a.id} className="attachment image" onClick={() => onOpenImage(a)}>
                <img
                  src={a.thumbnailUrl ?? a.url}
                  alt={a.originalName}
                  width={a.width ?? undefined}
                  height={a.height ?? undefined}
                  loading="lazy"
                />
              </button>
            ) : (
              <video key={a.id} className="attachment video" src={a.url} controls preload="metadata" />
            ),
          )}
        </div>
      )}
      {m.content && <div className="bubble">{m.content}</div>}
      <span className="time">
        {m.pending ? 'Sending…' : formatTime(m.createdAt)}
        {seen && <span className="seen"> · Seen</span>}
      </span>
      {!m.pending && (
        <ReactionBar reactions={m.reactions} myKey={myKey} onToggle={(emoji) => onToggleReaction(m.id, emoji)} />
      )}
    </div>
  );
});
