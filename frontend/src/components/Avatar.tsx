const PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#db2777', '#7c3aed', '#2563eb', '#dc2626'];

function colorFor(seed: string) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export function Avatar({ name, seed, online, size = 40 }: { name: string; seed: string; online?: boolean; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, background: colorFor(seed), fontSize: size * 0.38 }}>
      {initials(name) || '?'}
      {online !== undefined && <span className={`presence-dot ${online ? 'on' : ''}`} />}
    </span>
  );
}
