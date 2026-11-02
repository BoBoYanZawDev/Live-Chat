import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent, type FormEvent, type KeyboardEvent } from 'react';
import { getSocket } from '../../lib/socket';
import { usePortalStore } from '../../stores/portal.store';
import { useSendMediaMessage, useSendMessage } from './api';
import { ACCEPT, MAX_FILES, formatBytes, validateFile } from './media';

const TYPING_IDLE_MS = 2000;

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
}

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const sendText = useSendMessage(conversationId);
  const sendMedia = useSendMediaMessage(conversationId);
  const connected = usePortalStore((s) => s.connection === 'connected');
  const fileInput = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isTyping = useRef(false);

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      getSocket()?.emit('typing:stop', { conversationId });
    }
  };

  // Stop the typing indicator when switching conversations or unmounting.
  useEffect(() => stopTyping, [conversationId]);

  // Revoke preview URLs when files are removed or the component unmounts.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []);

  const onChange = (value: string) => {
    setContent(value);
    if (!isTyping.current && value.trim()) {
      isTyping.current = true;
      getSocket()?.emit('typing:start', { conversationId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const addFiles = (list: FileList | File[]) => {
    const incoming = [...list];
    const errors = incoming.map(validateFile).filter(Boolean);
    const valid = incoming.filter((f) => !validateFile(f));
    const room = MAX_FILES - files.length;
    if (valid.length > room) errors.push(`You can attach up to ${MAX_FILES} files`);
    setFileError(errors[0] ?? null);
    setFiles((prev) => [
      ...prev,
      ...valid.slice(0, room).map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) })),
    ]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = content.trim();
    if ((!text && files.length === 0) || !connected || sendMedia.isPending) return;
    isTyping.current = false; // server clears typing state when a message is sent
    clearTimeout(typingTimer.current);

    if (files.length === 0) {
      setContent('');
      sendText.mutate(text);
      return;
    }

    getSocket()?.emit('typing:stop', { conversationId });
    sendMedia.mutate(
      { content: text, files: files.map((f) => f.file) },
      {
        onSuccess: () => {
          setContent('');
          files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
          setFiles([]);
        },
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e);
  };

  const onPaste = (e: ClipboardEvent) => {
    if (e.clipboardData.files.length) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const uploading = sendMedia.isPending;
  const error = fileError ?? sendText.error?.message ?? sendMedia.error?.message;

  return (
    <form
      className={`composer ${dragging ? 'dragging' : ''}`}
      onSubmit={submit}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {error && <p className="error">{error}</p>}
      {files.length > 0 && (
        <div className="file-previews">
          {files.map(({ id, file, previewUrl }) => (
            <div key={id} className="file-preview">
              {file.type.startsWith('image/') ? <img src={previewUrl} alt={file.name} /> : <video src={previewUrl} muted />}
              <span className="file-size">{formatBytes(file.size)}</span>
              {!uploading && (
                <button type="button" className="file-remove" onClick={() => removeFile(id)} aria-label="Remove file">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {uploading && (
        <div className="progress" aria-label="Upload progress">
          <div style={{ width: `${sendMedia.progress}%` }} />
          <span>{sendMedia.progress < 100 ? `Uploading ${sendMedia.progress}%` : 'Optimizing…'}</span>
        </div>
      )}
      <div className="composer-row">
        <button
          type="button"
          className="ghost attach"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label="Attach photos or videos"
        >
          📎
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <textarea
          rows={1}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={connected ? 'Reply… (Enter to send, Shift+Enter for new line)' : 'Reconnecting…'}
          maxLength={2000}
          disabled={uploading}
        />
        <button type="submit" disabled={!connected || uploading || (!content.trim() && files.length === 0)}>
          Send
        </button>
      </div>
    </form>
  );
}
