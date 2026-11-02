import { useEffect } from 'react';
import type { Attachment } from '../../types';

export function Lightbox({ attachment, onClose }: { attachment: Attachment; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={attachment.originalName}>
      <img src={attachment.url} alt={attachment.originalName} onClick={(e) => e.stopPropagation()} />
      <a className="lightbox-open" href={attachment.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        Open original
      </a>
    </div>
  );
}
