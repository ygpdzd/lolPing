import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import { PING_PROFILES, exportPingPack, importPingPack } from '../../../shared/pingProfiles';
import { ALL_PINGS, MAX_CUSTOM_PINGS, createMarker, pingById, pingIconUrl, type PingId } from '../../../shared/pings';
import type { Settings } from '../../../shared/settings';
import type { Update } from '../useAppState';
import { useText } from '../text';

export function PingProfileSection({ settings: s, update }: { settings: Settings; update: Update }) {
  const zh = useText().lang === 'zh-CN';
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('★');
  const [color, setColor] = useState('#b999ff');
  const [sound, setSound] = useState('');
  const [editing, setEditing] = useState<PingId | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(patch: Partial<Settings>): Promise<boolean> {
    setBusy(true); setError('');
    try { const result = await update(patch); if (!result.ok) throw new Error(result.error); return true; }
    catch (e) { setError(String(e instanceof Error ? e.message : e)); return false; }
    finally { setBusy(false); }
  }
  async function add() {
    try {
      const id = createMarker({ name: name.trim(), symbol: symbol.trim(), color, sound });
      if (s.customPings.includes(id) && id !== editing) throw new Error(zh ? '这个标识已存在' : 'Marker already exists');
      if (!editing && s.customPings.length >= MAX_CUSTOM_PINGS) throw new Error(zh ? '最多 64 个自定义标识' : 'Maximum 64 custom markers');
      const wheel = s.wheel.map((p) => p === editing ? id : p);
      if (new Set(wheel).size !== wheel.length) throw new Error(zh ? '轮盘中已有相同标识' : 'Marker is already on the wheel');
      if (await save({ customPings: editing ? s.customPings.map((p) => p === editing ? id : p) : [...s.customPings, id], wheel, clickPingId: s.clickPingId === editing ? id : s.clickPingId })) {
        setEditing(null); setName('');
      }
    } catch (e) { setError(String(e instanceof Error ? e.message : e)); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportPingPack(s.wheel, s.clickPingId, s.customPings)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'multiping-config.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="profile-panel">
    <div className="profile-heading"><div><h2>{zh ? '游戏与标识' : 'Games & markers'}</h2>
      <p>{zh ? '一键切换预设，或打造自己的沟通轮盘。所有标识都可拖入下方八方向轮盘。' : 'Choose a preset or build your own communication wheel. Drag any marker onto the eight-slot wheel below.'}</p></div>
      <span className="profile-badge">MULTIPING</span></div>
    <div className="profile-grid">{PING_PROFILES.map((p) => <button key={p.id} type="button" disabled={busy}
      className={`profile-card ${s.pingProfile === p.id ? 'selected' : ''}`} aria-pressed={s.pingProfile === p.id}
      onClick={() => void save({ pingProfile: p.id, wheel: [...p.wheel], clickPingId: p.center })}>
      <strong>{zh ? p.name : p.nameEn}</strong><div className="profile-symbols">{p.wheel.slice(0, 4).map((id) => <img key={id} src={pingIconUrl(pingById(id)!)} alt={pingById(id)!.name} />)}</div>
    </button>)}</div>
    <p className="profile-note">{zh ? '预设会替换当前轮盘，不删除自定义库。酒馆战棋：前四项为确认、不要、警告、传递，后四项是协作扩展。本机导入炉石图标后，前四项显示原生图标；未导入则显示符号，图片不随房间或配置分享。此工具是桌面叠加层，不会操控游戏；队友需运行此改造版并加入同一房间。' : 'Presets replace the current wheel, not your custom library. Duos starts with Yes, No, Attention and Pass, followed by four extra callouts. Locally extracted Hearthstone icons replace the first four symbols; images are not shared through rooms or JSON. This desktop overlay does not control the game. Teammates need this fork and the same room.'}</p>
    <fieldset disabled={busy} className="marker-form"><legend>{editing ? (zh ? '编辑标识' : 'Edit marker') : (zh ? '创建自定义标识' : 'Create a custom marker')}</legend>
      <label>{zh ? '名称' : 'Name'}<input value={name} maxLength={48} placeholder={zh ? '例如：这张传给我' : 'e.g. Pass this to me'} onChange={(e) => setName(e.target.value)} /></label>
      <label>{zh ? '符号 / Emoji' : 'Symbol / Emoji'}<input value={symbol} maxLength={16} onChange={(e) => setSymbol(e.target.value)} /></label>
      <label>{zh ? '颜色' : 'Color'}<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
      <label>{zh ? '音效' : 'Sound'}<select value={sound} onChange={(e) => setSound(e.target.value)}><option value="">{zh ? '静音（默认）' : 'Silent (default)'}</option>{[...new Set(ALL_PINGS.map((p) => p.sound))].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
      <Button appearance="primary" onClick={() => void add()}>{editing ? (zh ? '保存修改' : 'Save changes') : (zh ? '添加到标识库' : 'Add to library')}</Button>
      {editing && <Button onClick={() => { setEditing(null); setName(''); }}>{zh ? '取消' : 'Cancel'}</Button>}
    </fieldset>
    {s.customPings.length > 0 && <div className="custom-marker-list">{s.customPings.map((id) => {
      const p = pingById(id)!;
      const used = s.wheel.includes(id) || s.clickPingId === id;
      return <div className="custom-marker" key={id}><img src={pingIconUrl(p)} alt="" /><span>{p.name}</span>
        <Button size="small" disabled={busy} onClick={() => { setEditing(id); setName(p.name); setSymbol(p.symbol!); setColor(p.color); setSound(p.sound); }}>{zh ? '编辑' : 'Edit'}</Button>
        <Button size="small" disabled={busy || used} title={used ? (zh ? '请先从轮盘及中心替换此标识' : 'Replace this marker on the wheel and center first') : undefined}
          onClick={() => { if (editing === id) { setEditing(null); setName(''); } void save({ customPings: s.customPings.filter((p) => p !== id) }); }}>{zh ? '删除' : 'Delete'}</Button></div>;
    })}</div>}
    <div className="profile-actions"><Button onClick={download}>{zh ? '导出配置 JSON' : 'Export JSON'}</Button>
      <label className="profile-import">{zh ? '导入配置 JSON' : 'Import JSON'}<input type="file" accept=".json,application/json" disabled={busy} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        try { if (file.size > 100_000) throw new Error(zh ? '文件最大 100 KB' : 'Maximum file size is 100 KB');
          const pack = importPingPack(await file.text());
          if (await save({ pingProfile: 'custom', wheel: pack.wheel, clickPingId: pack.center, customPings: pack.customPings })) { setEditing(null); setName(''); }
        } catch (err) { setError(String(err instanceof Error ? err.message : err)); }
      }} /></label><small>{zh ? '导入会替换当前轮盘和自定义库，建议先导出备份。' : 'Import replaces the current wheel and custom library. Export a backup first.'}</small></div>
    {error && <p role="alert" className="profile-error">{error}</p>}
  </div>;
}
