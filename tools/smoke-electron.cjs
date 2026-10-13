// Real Electron/preload/IPC smoke test. No installed user settings are touched.
const { app, BrowserWindow } = require('electron');
const { mkdirSync, mkdtempSync, writeFileSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '..');
const output = join(root, 'output', 'electron-smoke');
const isolated = mkdtempSync(join(tmpdir(), 'multiping-smoke-'));
mkdirSync(output, { recursive: true });
mkdirSync(join(isolated, 'MultiPing'), { recursive: true });
writeFileSync(join(isolated, 'MultiPing', 'settings.json'), JSON.stringify({ language: 'zh-CN', launchAtStartup: false, enabledOnStart: false }));
app.setAppPath(root);
app.setPath('appData', isolated);
app.setPath('userData', isolated);
delete process.env.ELECTRON_RENDERER_URL;
const errors = [];
app.on('web-contents-created', (_, wc) => {
  wc.on('preload-error', (_, path, error) => errors.push(`preload ${path}: ${error}`));
  wc.on('console-message', details => { if (details.level === 'error') { errors.push(details.message); console.error('RENDERER:', details.message); } });
  wc.on('render-process-gone', (_, details) => errors.push(`renderer gone: ${details.reason}`));
});
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, message) {
  for (let n = 0; n < 100; n++) { if (await fn()) return; await delay(100); }
  throw new Error(`Timed out: ${message}`);
}
const deadline = setTimeout(() => { console.error('Smoke test deadline exceeded'); app.exit(1); }, 60000);
require(join(root, 'out/main/index.js'));
(async () => {
  let win;
  await until(() => { win = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().includes('/settings/')); return win && !win.webContents.isLoading(); }, 'settings window');
  const run = async fn => { try { return await win.webContents.executeJavaScript(`(${fn.toString()})()`, true); } catch (error) { console.error("FAILED STEP:", fn.toString()); throw error; } };
  await until(() => run(() => !!document.querySelector('.profile-panel')), 'profile UI');
  await run(() => window.settingsApi.setEnabled(false));
  assert.equal(await run(() => document.querySelectorAll('.profile-card').length), 3);
  await run(() => document.querySelectorAll('.profile-card')[1].click());
  await until(() => run(async () => (await window.settingsApi.getSettings()).pingProfile === 'battlegrounds'), 'Duos preset');
  assert.equal(await run(async () => (await window.settingsApi.getSettings()).wheel.length), 8);
  await run(() => {
    const fields = document.querySelectorAll('.marker-form input');
    const set = (el, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(fields[0], '测试：传给我'); set(fields[1], '★');
  });
  await run(() => document.querySelector('.marker-form button').click());
  await until(() => run(async () => (await window.settingsApi.getSettings()).customPings.length === 1), 'create marker');
  // Click-to-place uses the same wheel dropPatch as dragging.
  await run(() => [...document.querySelectorAll('.wheelEditor .weTile')].find(el => el.textContent.includes('测试：传给我')).click());
  await run(() => document.querySelector('.wheelEditor .weSlot').click());
  await until(() => run(async () => { const s = await window.settingsApi.getSettings(); return s.wheel[0] === s.customPings[0]; }), 'place marker');
  assert.equal(await run(() => document.querySelectorAll('.custom-marker button')[1].disabled), true);
  await run(() => document.querySelector('.custom-marker button').click());
  await run(() => { const el = document.querySelector('.marker-form input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '测试：保留这张'); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await run(() => document.querySelector('.marker-form button').click());
  await until(() => run(() => document.querySelector('.custom-marker span').textContent === '测试：保留这张'), 'edit marker');
  assert.equal(await run(async () => { const s = await window.settingsApi.getSettings(); return s.wheel[0] === s.customPings[0]; }), true);
  const downloaded = new Promise((resolve, reject) => {
    win.webContents.session.once('will-download', (_, item) => {
      const file = join(output, 'export.json'); item.setSavePath(file);
      item.once('done', (_, state) => state === 'completed' ? resolve(file) : reject(new Error(`download: ${state}`)));
    });
  });
  await run(() => document.querySelector('.profile-actions button').click());
  const file = await downloaded;
  const pack = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(pack.format, 'multiping'); assert.equal(pack.customPings.length, 1);
  const injectFile = async text => win.webContents.executeJavaScript(`(() => { const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(text)}], 'config.json', { type: 'application/json' })); const input = document.querySelector('.profile-import input'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); })()`, true);
  await injectFile('{"invalid":true}');
  await until(() => run(() => !!document.querySelector('.profile-error')), 'reject bad import');
  assert.deepEqual(await run(async () => (await window.settingsApi.getSettings()).wheel), pack.wheel);
  await run(() => document.querySelectorAll('.profile-card')[2].click());
  await until(() => run(async () => (await window.settingsApi.getSettings()).pingProfile === 'coop'), 'co-op preset');
  await injectFile(JSON.stringify(pack));
  await until(() => run(async () => (await window.settingsApi.getSettings()).pingProfile === 'custom'), 'valid import');
  assert.deepEqual(await run(async () => (await window.settingsApi.getSettings()).wheel), pack.wheel);
  await delay(500);
  const saved = JSON.parse(readFileSync(join(isolated, 'MultiPing', 'settings.json'), 'utf8'));
  assert.deepEqual(saved.wheel, pack.wheel);
  await run(() => document.querySelector('.profile-panel').scrollIntoView());
  await delay(300);
  writeFileSync(join(output, 'settings.png'), (await win.webContents.capturePage()).toPNG());
  await run(() => document.querySelectorAll('.profile-card')[0].click());
  await until(() => run(() => !document.querySelectorAll('.custom-marker button')[1].disabled), 'unused delete enabled');
  await run(() => document.querySelectorAll('.custom-marker button')[1].click());
  await until(() => run(async () => (await window.settingsApi.getSettings()).customPings.length === 0), 'delete marker');
  assert.deepEqual(errors, []);
  console.log('PASS: real Electron startup, 3 presets, create/place/edit/delete, in-use protection, JSON export/import, invalid import rejection, persistence, no renderer errors.');
  console.log(`Screenshot: ${join(output, 'settings.png')}`);
  clearTimeout(deadline); app.quit();
})().catch(error => { console.error(error); clearTimeout(deadline); app.exit(1); });


