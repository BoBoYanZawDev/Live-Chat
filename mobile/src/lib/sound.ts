import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AppState } from 'react-native';
import { useSettingsStore } from '../stores/settings.store';

export type SoundName = 'incoming' | 'sent';

const SOURCES: Record<SoundName, number> = {
  incoming: require('../../assets/sounds/incoming.wav'),
  sent: require('../../assets/sounds/sent.wav'),
};

const MIN_GAP_MS = 800; // a burst of messages chimes once, not ten times

const players = new Map<SoundName, AudioPlayer>();
const lastPlayed = new Map<SoundName, number>();
let modeSet: Promise<void> | null = null;

function player(name: SoundName) {
  let p = players.get(name);
  if (!p) {
    p = createAudioPlayer(SOURCES[name]);
    players.set(name, p);
  }
  return p;
}

/** Short UI sounds: respect the iOS silent switch and don't stop the user's music. */
function ensureAudioMode() {
  modeSet ??= setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
  return modeSet;
}

/** Plays a chat sound if enabled and the app is in the foreground. Never throws. */
export async function playSound(name: SoundName) {
  if (!useSettingsStore.getState().soundEnabled || AppState.currentState !== 'active') return;
  const now = Date.now();
  if (now - (lastPlayed.get(name) ?? 0) < MIN_GAP_MS) return;
  lastPlayed.set(name, now);

  try {
    await ensureAudioMode();
    const p = player(name);
    await p.seekTo(0);
    p.play();
  } catch {
    // Sounds are a nicety; never let audio errors affect chatting.
  }
}

/** Creates the players up front so the first sound isn't delayed by loading. */
export function preloadSounds() {
  void ensureAudioMode();
  (Object.keys(SOURCES) as SoundName[]).forEach(player);
}
