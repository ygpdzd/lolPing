import { describe, expect, it } from 'vitest';
import { createMarker, isPingId, normalizeCustomPings, pingById, pingIconUrl } from '../../src/shared/pings';
import { PING_PROFILES, exportPingPack, importPingPack, profileById, profilePool } from '../../src/shared/pingProfiles';
import { DEFAULT_SETTINGS, mergeSettings, normalizeSettings } from '../../src/shared/settings';
import { isValidWheel } from '../../src/shared/wheelLayout';
import { decodeMessage, encodeMessage, validateMessage } from '../../src/shared/roomProtocol';
import { seal, open } from '../../src/main/roomCrypto';

const input = { name: '这张传给我', symbol: '↗', color: '#b999ff', sound: '' };
const id = createMarker(input);
describe('portable multi-game markers', () => {
  it('round trips text, symbols, colors and sounds without a shared catalog', () => {
    expect(pingById(id)).toMatchObject(input);
    expect(isPingId(id)).toBe(true);
    expect(pingById(createMarker({ ...input, sound: 'Base' }))?.sound).toBe('Base');
  });
  it('rejects malformed, non-canonical, oversized and unsafe marker data', () => {
    for (const v of ['mark:%', 'mark:null', 'mark:'+ 'x'.repeat(601), 'mark:%5B%5D', 'mark:' + encodeURIComponent('["a","!","red",""]')]) expect(isPingId(v)).toBe(false);
    for (const patch of [{ name: '' }, { name: 'a'.repeat(25) }, { symbol: 'abcde' }, { color: '#fff' }, { color: '\" onload=alert(1)' }, { sound: '../evil' }, { sound: null }, { name: 'a\u202eb' }]) {
      expect(() => createMarker({ ...input, ...patch } as typeof input)).toThrow();
    }
    expect(isPingId(id.replace('%5B', '%5b'))).toBe(false);
  });
  it('escapes XML in the generated SVG and cannot load remote resources', () => {
    const svg = decodeURIComponent(pingIconUrl(pingById(createMarker({ ...input, symbol: '<&' }))!).split(',')[1]);
    expect(svg).toContain('&lt;&amp;');
    expect(svg).not.toContain('<&');
    expect(svg).not.toContain('href=');
  });
  it('caps and deduplicates the custom library', () => {
    expect(normalizeCustomPings([id, id, 'danger', 'bad'])).toEqual([id]);
    expect(normalizeCustomPings(Array.from({ length: 70 }, (_, i) => createMarker({ ...input, name: String(i) })))).toHaveLength(64);
  });
  it('has eight valid distinct slots in every preset', () => {
    for (const p of PING_PROFILES) { expect(isValidWheel(p.wheel)).toBe(true); expect(isPingId(p.center)).toBe(true); }
    expect(profileById('bad').id).toBe('lol');
    expect(PING_PROFILES[1].wheel.slice(0, 4).map((p) => pingById(p)?.symbol)).toEqual(['✓', '✕', '?', '↗']);
  });
  it('migrates old settings and persists custom settings and active wheel', () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
    const p = PING_PROFILES[1];
    const s = mergeSettings(DEFAULT_SETTINGS, { pingProfile: p.id, wheel: [...p.wheel], clickPingId: id, customPings: [id] });
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.pingProfile).toBe('battlegrounds');
    expect(profilePool(s.pingProfile, s.wheel, s.clickPingId, s.customPings)).toContain(id);
  });
  it('exports/imports validated packs, rejecting broken files atomically', () => {
    const p = PING_PROFILES[1];
    const text = exportPingPack([...p.wheel], id, [id]);
    expect(importPingPack(text)).toMatchObject({ wheel: p.wheel, center: id, customPings: [id] });
    for (const bad of ['{}', 'null', 'not json', 'x'.repeat(100001), text.replace('"version": 1', '"version": 2')]) expect(() => importPingPack(bad)).toThrow();
    expect(() => importPingPack(JSON.stringify({ ...JSON.parse(text), wheel: Array(8).fill(id) }))).toThrow();
  });
  it('preserves portable markers over the validated encrypted room wire format', () => {
    const message = { t: 'ping' as const, peer: 'a'.repeat(16), seq: 1, ts: 100, ping: id, d: 1, x: .25, y: .5 };
    const key = Buffer.alloc(32, 7);
    const bytes = encodeMessage(message);
    expect(validateMessage(message)).toEqual(message);
    expect(decodeMessage(bytes)).toEqual(message);
    expect(open(key, seal(key, bytes))).toEqual(Buffer.from(bytes));
    const longest = createMarker({ name: '😀'.repeat(24), symbol: '😀'.repeat(4), color: '#ffffff', sound: 'AreaIsWarded' });
    expect(isPingId(longest)).toBe(true);
    expect(() => seal(key, encodeMessage({ ...message, ping: longest }))).not.toThrow();
  });
});

describe('local Battlegrounds native art mapping', () => {
  it('uses only the four allowlisted local URLs for the built-in first four markers', async () => {
    const { BATTLEGROUNDS_NATIVE_MARKERS } = await import('../../src/shared/pings');
    const ids = PING_PROFILES[1].wheel.slice(0, 4);
    expect(ids).toEqual(BATTLEGROUNDS_NATIVE_MARKERS.map((m) => m.id));
    expect(BATTLEGROUNDS_NATIVE_MARKERS.map((m) => m.asset)).toEqual([
      'TeammatePing_Check', 'TeammatePing_X', 'TeammatePing_Question', 'TeammatePing_Warp',
    ]);
    for (const id of ids) expect(pingIconUrl(pingById(id)!)).toMatch(/^lolping:\/\/ping-icons\/battlegrounds\/(check|x|question|warp)\.png$/);
  });
});
