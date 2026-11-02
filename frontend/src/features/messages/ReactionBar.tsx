import { useState } from 'react';
import type { ReactionSummary } from '../../types';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

interface Props {
  reactions: ReactionSummary[];
  myKey: string;
  disabled?: boolean;
  onToggle: (emoji: string) => void;
}

export function ReactionBar({ reactions, myKey, disabled, onToggle }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const pick = (emoji: string) => {
    setPickerOpen(false);
    onToggle(emoji);
  };

  return (
    <div className="reactions">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          className={`reaction ${r.actorKeys.includes(myKey) ? 'mine' : ''}`}
          onClick={() => onToggle(r.emoji)}
          disabled={disabled}
          title={`${r.count} reaction${r.count > 1 ? 's' : ''}`}
        >
          {r.emoji} <span>{r.count}</span>
        </button>
      ))}
      <div className="reaction-add">
        <button
          className="reaction add"
          onClick={() => setPickerOpen((o) => !o)}
          disabled={disabled}
          aria-label="Add reaction"
        >
          ☺+
        </button>
        {pickerOpen && (
          <div className="reaction-picker" onMouseLeave={() => setPickerOpen(false)}>
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} onClick={() => pick(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
