# MultiPing — multi-game desktop ping wheel

[中文说明](README.zh-CN.md)

A fork of [darrenprx/lolPing](https://github.com/darrenprx/lolPing), extending the original desktop wheel with **Hearthstone Battlegrounds Duos**, **co-op/FPS** presets and **portable custom markers**. Upstream code and asset attribution are retained.

## What's new in 0.6.0

- League of Legends: original wheel, animations and sounds preserved.
- Battlegrounds Duos: Yes, No, Question, Pass, plus Keep, Refresh, Tier up and Triple callouts. The first four can use locally extracted Hearthstone teammate-ping artwork when installed; the native markers show only their image, without a text label. Otherwise portable symbols are used. Blizzard artwork is never committed or shared.
- Co-op/FPS: Danger, Group, Move, Attack, Help, Wait, Search and Done.
- Up to 64 custom markers with a name, symbol/emoji, color and optional bundled sound. Create, edit, delete and assign them to wheel slots or the center.
- Validated JSON import/export for sharing or backing up layouts and the custom library.
- Self-contained marker IDs travel over the existing encrypted room transport. Peers running this fork see the same marker without importing the sender's configuration.

## Use

Open **Settings → Wheel → Games & markers**, choose a preset, then hold **Alt + left mouse drag** to open the wheel. Add custom markers and drag them onto the wheel, or click a marker followed by a slot. Create or join a room to share pings with teammates running this fork.

Preset changes replace the active wheel but preserve your custom library. Export before changing a customized layout. Import replaces both the wheel and library. A marker in use cannot be deleted until it is replaced in every slot and the center. Custom images/animations remain available in the upstream **Emotes** editor; the new ping editor accepts text/emoji and bundled sounds, not arbitrary SVG/audio files.

**This is a desktop overlay, not a game integration.** The optional native-art override is local-only: it reads only the four allowlisted PNGs placed under `%APPDATA%/MultiPing/ping-icons/battlegrounds/`, never game state or network files. It does not detect game state, inject input, or trigger native Hearthstone pings. Exclusive fullscreen and elevated windows may limit overlays/input; try borderless window mode. Original upstream clients ignore new markers. Real in-game multiplayer use still needs testing on both peers.

## Develop / build

Node.js 22+; Windows also requires Visual Studio's Desktop Development with C++ toolchain.

```sh
npm ci
npm run build:helper
npm run dev
```

```sh
npm run typecheck
npm run test:helper
npm test
npm run build
npm run test:ui
npm run build:site
npm run dist
```

Windows installers are written to `release/`. The package retains the `lolPing` product name but uses a separate application ID and `%APPDATA%/MultiPing` settings directory. Updates now point to **ygpdzd/lolPing**, never the upstream release feed. Until this fork publishes a release, manual update checks may report no available release.

## Electron UI smoke test

Run `npm run test:ui` to build and exercise the real Electron app, preload and IPC: three presets, custom marker CRUD, click-to-place, in-use deletion protection, JSON export/import, invalid import rejection and persisted settings. Requires a desktop session and installed Electron binary. It briefly opens the app with isolated temporary settings, leaving your normal configuration untouched. Screenshots and exported test data are saved under `output/electron-smoke/`; isolated settings remain in the OS temp directory for diagnosis. This does not replace two-peer networking, real drag-and-drop or in-game fullscreen testing.

## Security and compatibility

Portable markers have bounded, validated text, a strict hex color and a bundled-sound allowlist. Text is XML-escaped in a fixed SVG template; no user HTML, remote images or executable configuration. Existing packet encryption, size limits and flood protection still apply. Old settings default to the LoL preset.

## Credits and license

Original project by [Danrui Meng](https://github.com/darrenprx/lolPing). Source code is MIT; see [LICENSE](LICENSE). Riot icons, emotes and audio remain Riot Games property and are not MIT-licensed assets. Game names and trademarks belong to their owners. Not endorsed by Riot Games or Blizzard.

See the [upstream README](https://github.com/darrenprx/lolPing/blob/main/README.md) for the original application's platform details.
