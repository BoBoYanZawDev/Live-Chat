// Synthesizes the chat notification sounds as small 16-bit mono WAVs (no third-party audio assets).
// Usage: node scripts/generate-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['frontend/public/sounds', 'mobile/assets/sounds'];

/** Sum of decaying sine notes: [{ freq, start, dur, gain, decay, glideTo? }] */
function render(notes, totalSec) {
  const samples = new Float32Array(Math.ceil(totalSec * RATE));
  for (const n of notes) {
    const start = Math.floor(n.start * RATE);
    const len = Math.floor(n.dur * RATE);
    let phase = 0;
    for (let i = 0; i < len && start + i < samples.length; i++) {
      const t = i / RATE;
      const freq = n.glideTo ? n.freq + (n.glideTo - n.freq) * Math.min(1, t / n.dur) : n.freq;
      phase += (2 * Math.PI * freq) / RATE;
      const attack = Math.min(1, t / 0.004); // 4ms fade-in avoids clicks
      const env = attack * Math.exp(-t * n.decay);
      // A touch of the octave makes it bell-like rather than a pure beep.
      samples[start + i] += n.gain * env * (Math.sin(phase) + 0.25 * Math.sin(2 * phase));
    }
  }
  const tail = Math.floor(0.01 * RATE); // fade out the last 10ms
  for (let i = 0; i < tail; i++) samples[samples.length - 1 - i] *= i / tail;
  return samples;
}

function toWav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const sounds = {
  // Two-note rising chime for an incoming message.
  'incoming.wav': render(
    [
      { freq: 880, start: 0, dur: 0.35, gain: 0.32, decay: 9 },
      { freq: 1318.5, start: 0.11, dur: 0.45, gain: 0.32, decay: 7 },
    ],
    0.56,
  ),
  // Short upward "pop" when your own message is sent.
  'sent.wav': render([{ freq: 520, glideTo: 980, start: 0, dur: 0.09, gain: 0.3, decay: 28 }], 0.11),
};

for (const dir of targets) {
  mkdirSync(join(root, dir), { recursive: true });
  for (const [name, samples] of Object.entries(sounds)) writeFileSync(join(root, dir, name), toWav(samples));
}
console.log(`Wrote ${Object.keys(sounds).join(', ')} to ${targets.join(', ')}`);
