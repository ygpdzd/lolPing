import { ALL_PINGS, DEFAULT_CLICK_PING, DEFAULT_WHEEL, createMarker, isPingId, normalizeCustomPings, type PingId } from './pings';
import { isValidWheel } from './wheelLayout';

export interface PingProfile { id: string; name: string; nameEn: string; wheel: readonly PingId[]; center: PingId }
const marker = (name: string, symbol: string, color: string): PingId => createMarker({ name, symbol, color, sound: '' });
const bg = [
  marker('确认 / Yes', '✓', '#5bdb95'), marker('不要 / No', '✕', '#ff647c'),
  marker('疑问 / Question', '?', '#ffd166'), marker('传递 / Pass', '↗', '#b999ff'),
  marker('保留 / Keep', '◆', '#60d7ee'), marker('刷新 / Refresh', '↻', '#72b5ff'),
  marker('升级 / Tier up', '↑', '#ffb968'), marker('三连 / Triple', '3', '#f18acc'),
];
const coop = [
  marker('危险 / Danger', '!', '#ff647c'), marker('集合 / Group', '◎', '#5bdb95'),
  marker('前进 / Move', '↑', '#72b5ff'), marker('进攻 / Attack', '⚔', '#ffb968'),
  marker('救援 / Help', '+', '#60d7ee'), marker('等待 / Wait', 'Ⅱ', '#ffd166'),
  marker('搜索 / Search', '?', '#b999ff'), marker('完成 / Done', '✓', '#f18acc'),
];
export const PING_PROFILES: readonly PingProfile[] = [
  { id: 'lol', name: '英雄联盟 · 经典信号', nameEn: 'League of Legends', wheel: DEFAULT_WHEEL, center: DEFAULT_CLICK_PING },
  { id: 'battlegrounds', name: '炉石传说 · 酒馆战棋双人', nameEn: 'Hearthstone Battlegrounds Duos', wheel: bg, center: bg[0] },
  { id: 'coop', name: '通用 · 多人协作 / FPS', nameEn: 'Co-op / FPS', wheel: coop, center: coop[0] },
];
export const profileById = (id: string): PingProfile => PING_PROFILES.find((p) => p.id === id) ?? PING_PROFILES[0];
export function profilePool(profileId: string, wheel: readonly PingId[], center: PingId, custom: readonly PingId[]): PingId[] {
  const preset = profileId === 'lol' ? ALL_PINGS.map((p) => p.id) : profileById(profileId).wheel;
  return [...new Set([...preset, ...wheel, center, ...custom])];
}
export interface PingPack { format: 'multiping'; version: 1; wheel: PingId[]; center: PingId; customPings: PingId[] }
export function exportPingPack(wheel: PingId[], center: PingId, customPings: PingId[]): string {
  return JSON.stringify({ format: 'multiping', version: 1, wheel, center, customPings } satisfies PingPack, null, 2);
}
/** Atomic, strict import. Never accepts files, URLs, scripts or unlimited user data. */
export function importPingPack(text: string): PingPack {
  if (text.length > 100_000) throw new Error('Configuration is too large');
  const v = JSON.parse(text);
  if (!v || v.format !== 'multiping' || v.version !== 1 || !isValidWheel(v.wheel) || !isPingId(v.center)
    || !Array.isArray(v.customPings) || v.customPings.length > 64
    || v.customPings.some((p: unknown) => typeof p !== 'string' || !p.startsWith('mark:') || !isPingId(p))) {
    throw new Error('Invalid MultiPing configuration');
  }
  return { format: 'multiping', version: 1, wheel: [...v.wheel], center: v.center, customPings: normalizeCustomPings(v.customPings) };
}
