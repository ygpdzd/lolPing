export type LeaguePingId =
  | 'danger' | 'push' | 'omw' | 'allin' | 'assist' | 'needvision' | 'missing' | 'enemyvision' | 'generic'
  | 'bait' | 'visioncleared';

export type PingId = LeaguePingId | `mark:${string}`;

export interface PingDef {
  id: PingId;
  name: string;
  /** Portable, original text/emoji marker instead of a licensed texture. */
  symbol?: string;
  /** Texture on the wheel slice: file in assets/textures without ".png". */
  icon: string;
  /** Textures drawn at the ping location. Two entries = All In's clashing halves. */
  art: string[];
  /** File in assets/sounds without ".wav". */
  sound: string;
  /** Ring and glow colour. */
  color: string;
}

/** Every ping, in the order the settings window lists them: the default wheel, then the extras. */
export const ALL_PINGS: readonly (PingDef & { id: LeaguePingId })[] = [
  { id: 'danger', name: 'Danger', icon: 'pingwheel_retreatrender', art: ['pingwheel_retreatrender'], sound: 'SRP_12', color: '#ff3b55' },
  { id: 'push', name: 'Push', icon: 'push', art: ['pingwheel_pushrender'], sound: 'SRP_9', color: '#35d27a' },
  { id: 'omw', name: 'On My Way', icon: 'omw', art: ['omw'], sound: 'OnMyWay', color: '#2e8bff' },
  { id: 'allin', name: 'All In', icon: 'all_in', art: ['pingwheel_allin_render_01', 'pingwheel_allin_render_02'], sound: 'SRP_4', color: '#f2b320' },
  { id: 'assist', name: 'Assist Me', icon: 'assist_me', art: ['assist_me'], sound: 'ComeHere', color: '#56d43c' },
  { id: 'needvision', name: 'Need Vision', icon: 'need_vision', art: ['need_vision'], sound: 'SRP_7', color: '#56d43c' },
  { id: 'missing', name: 'Enemy Missing', icon: 'enemy_missing', art: ['enemy_missing'], sound: 'MIA', color: '#f2c518' },
  { id: 'enemyvision', name: 'Enemy Vision', icon: 'enemy_vision', art: ['pingwheel_enemyvisionrender'], sound: 'AreaIsWarded', color: '#ff3b55' },
  { id: 'generic', name: 'Generic', icon: 'generic_ping', art: ['pingwheel_basicpingrender'], sound: 'Base', color: '#2e8bff' },
  { id: 'bait', name: 'Bait', icon: 'pingwheel_baitrender', art: ['pingwheel_baitrender'], sound: 'SRP_11', color: '#efbc12' },
  { id: 'visioncleared', name: 'Vision Cleared', icon: 'vision_cleared', art: ['pingwheel_visionclearedrender'], sound: 'SRP_6', color: '#2b80ff' },
];

/** The wheel as League ships it, top (N) then clockwise. Array index = slice index from pickSlice(). */
export const DEFAULT_WHEEL: readonly PingId[] = ['danger', 'push', 'omw', 'allin', 'assist', 'needvision', 'missing', 'enemyvision'];
export const DEFAULT_CLICK_PING: PingId = 'generic';
export const WHEEL_SLOTS = 8;

export const TICK_SOUND = 'button';
export const FALLBACK_TEXTURE = 'generic_ping';

export function pingById(id: string): PingDef | undefined {
  return ALL_PINGS.find((p) => p.id === id) ?? decodeMarker(id);
}

export const isPingId = (v: unknown): v is PingId => typeof v === 'string' && pingById(v) !== undefined;

/** Looks up ids already known to be valid (from normalized settings). */
export const pingsFor = (ids: readonly PingId[]): PingDef[] => ids.map((id) => pingById(id) as PingDef);

export const DEFAULT_WHEEL_PINGS: readonly PingDef[] = pingsFor(DEFAULT_WHEEL);

/** Relative to a renderer page at <root>/<page>/index.html; assets/ is served at <root>/. */
export const textureUrl = (name: string): string => `../textures/${name}.png`;
export const soundUrl = (name: string): string => `../sounds/${name}.wav`;

export function allSoundNames(): string[] {
  return [...new Set([...ALL_PINGS.map((p) => p.sound), TICK_SOUND])];
}

export function allTextureNames(): string[] {
  return [...new Set([...ALL_PINGS.flatMap((p) => [p.icon, ...p.art]), FALLBACK_TEXTURE])];
}

/** Self-contained IDs travel through the existing validated room protocol. No external URLs or HTML. */
export interface MarkerInput { name: string; symbol: string; color: string; sound: string }
export const MAX_CUSTOM_PINGS = 64;
const safeText = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0
  && [...v].length <= max && !/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/.test(v);
export function validMarker(v: MarkerInput): boolean {
  return safeText(v.name, 24) && safeText(v.symbol, 4) && /^#[0-9a-fA-F]{6}$/.test(v.color)
    && (v.sound === '' || ALL_PINGS.some((p) => p.sound === v.sound));
}
export function createMarker(v: MarkerInput): PingId {
  if (!validMarker(v)) throw new Error('Invalid marker: name (1–24), symbol (1–4), hex color and bundled sound required');
  return `mark:${encodeURIComponent(JSON.stringify([v.name, v.symbol, v.color, v.sound]))}`;
}
function decodeMarker(id: string): PingDef | undefined {
  if (!id.startsWith('mark:') || id.length > 600) return undefined;
  try {
    const a: unknown = JSON.parse(decodeURIComponent(id.slice(5)));
    if (!Array.isArray(a) || a.length !== 4) return undefined;
    const v = { name: a[0], symbol: a[1], color: a[2], sound: a[3] };
    if (!validMarker(v) || createMarker(v) !== id) return undefined;
    return { ...v, id: id as PingId, icon: '', art: [] };
  } catch { return undefined; }
}
const escapeXml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
/** Only our own SVG template is allowed; user text is escaped, never interpreted as markup. */
export function pingFallbackIconUrl(p: PingDef): string {
  if (!p.symbol) return textureUrl(p.icon);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect x="8" y="8" width="80" height="80" rx="24" fill="#17212f" stroke="${p.color}" stroke-width="5"/><text x="48" y="51" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI,Apple Color Emoji,Segoe UI Emoji,sans-serif" font-size="${[...p.symbol].length > 2 ? 25 : 42}" font-weight="700" fill="${p.color}">${escapeXml(p.symbol)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export function normalizeCustomPings(raw: unknown): PingId[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v): v is PingId => typeof v === 'string' && v.startsWith('mark:') && isPingId(v)))].slice(0, MAX_CUSTOM_PINGS);
}

/** Exact preset identities only: user-created lookalikes must not unexpectedly change art. */
export const BATTLEGROUNDS_NATIVE_MARKERS = [
  { key: 'check', asset: 'TeammatePing_Check', id: createMarker({ name: '确认 / Yes', symbol: '✓', color: '#5bdb95', sound: '' }) },
  { key: 'x', asset: 'TeammatePing_X', id: createMarker({ name: '不要 / No', symbol: '✕', color: '#ff647c', sound: '' }) },
  { key: 'question', asset: 'TeammatePing_Question', id: createMarker({ name: '疑问 / Question', symbol: '?', color: '#ffd166', sound: '' }) },
  { key: 'warp', asset: 'TeammatePing_Warp', id: createMarker({ name: '传递 / Pass', symbol: '↗', color: '#b999ff', sound: '' }) },
] as const;

export function pingIconUrl(p: PingDef): string {
  const native = BATTLEGROUNDS_NATIVE_MARKERS.find((m) => m.id === p.id);
  return native ? `lolping://ping-icons/battlegrounds/${native.key}.png` : pingFallbackIconUrl(p);
}
