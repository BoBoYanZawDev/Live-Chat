import { useSettingsStore } from '../stores/settings.store';

export type SoundName = 'incoming' | 'sent';

const MIN_GAP_MS = 800; // a burst of messages chimes once, not ten times

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();
const lastPlayed = new Map<SoundName, number>();

function context() {
  ctx ??= new AudioContext();
  return ctx;
}

function load(name: SoundName) {
  let buffer = buffers.get(name);
  if (!buffer) {
    buffer = fetch(`/sounds/${name}.wav`)
      .then((res) => res.arrayBuffer())
      .then((data) => context().decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, buffer);
  }
  return buffer;
}

/**
 * Browsers only allow audio after a user gesture. The operator always clicks or types
 * (at least to sign in), so resume the context on the first interaction and preload sounds.
 */
export function unlockSoundsOnInteraction() {
  const unlock = () => {
    void context().resume();
    void load('incoming');
    void load('sent');
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export async function playSound(name: SoundName) {
  if (!useSettingsStore.getState().soundEnabled) return;
  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);

  const audio = context();
  if (audio.state === 'suspended') await audio.resume().catch(() => undefined);
  const buffer = await load(name);
  if (!buffer || audio.state !== 'running') return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.connect(audio.destination);
  source.start();
}
