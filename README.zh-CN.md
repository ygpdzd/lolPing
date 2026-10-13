# MultiPing — 多游戏桌面信号轮盘

基于 [darrenprx/lolPing](https://github.com/darrenprx/lolPing) 的个人扩展版，保留上游 LoL 动画、快捷键、表情和多人房间能力，新增多游戏预设与便携自定义标识。

## 0.6.0 新增功能

- **英雄联盟**：保留经典八方向轮盘和原有额外信号。
- **炉石传说 · 酒馆战棋双人**：确认 ✓、不要 ✕、疑问 ?、传递 ↗；额外提供保留 ◆、刷新 ↻、升级 ↑、三连 3。
- **通用多人协作 / FPS**：危险、集合、前进、进攻、救援、等待、搜索、完成，可用于不同游戏或桌面演示。
- **自定义标识**：名称（最多 24 个 Unicode 码点）、符号/Emoji（最多 4 个码点）、颜色、静音或已有音效；最多 64 个。支持新增、编辑、删除。
- **自由排布**：拖动标识到轮盘八个方向或中心，也可先点标识再点槽位。编辑已使用的自定义标识会同步更新槽位；删除前需先将它从轮盘和中心替换。
- **导入 / 导出 JSON**：保存、备份和分享整个轮盘与自定义库；导入文件最大 100 KB，先校验后应用。
- **多人同步**：文字、符号、颜色和音效选择包含在经过校验的标识 ID 内，沿用加密房间消息。队友使用本 fork 即可显示，无需预先导入同一配置。

## 使用

1. 启动后打开设置 → **轮盘** → **游戏与标识**，选择游戏预设。
2. 按住 **Alt + 鼠标左键拖动** 打开信号轮盘，选择方向后松开；可以在设置中修改触发键。
3. 在“创建自定义标识”填写内容，添加后从下方标识库拖入轮盘。
4. 与队友在“房间”页面创建/加入同一房间；两边都必须运行此改造版。
5. 切换预设会替换当前轮盘，但保留自定义库。要保留不同游戏的自定义布局，请先导出 JSON；导入会替换当前轮盘和自定义库。

**边界说明**：这是桌面覆盖层，不是游戏插件，不读取游戏状态、不自动识别游戏、不向游戏注入操作，也不会调用炉石内置标记。酒馆战棋图标是原创的语义符号，不是暴雪官方素材。部分独占全屏或管理员窗口可能无法覆盖/捕获快捷键，可尝试无边框窗口。上游旧版仍能处理原 LoL 信号，但会忽略此 fork 的新标识。多人真实游戏环境仍需双方实测。

自定义图片/动图仍可通过原有**表情**页导入；本次新增的**信号**编辑器支持文字/Emoji 和已有音效，不支持导入任意音频或 SVG 文件。

## 本地开发 / Windows 打包

需要 Node.js 22+；Windows 原生辅助程序还需要 Visual Studio 的“使用 C++ 的桌面开发”工具链。

```powershell
npm ci
npm run build:helper
npm run dev
```

```powershell
npm run typecheck
npm run test:helper
npm test
npm run build
npm run build:site
npm run dist
```

Windows 安装包输出到 `release/`。版本为 **0.6.0**，安装程序目前保留 `lolPing` 产品名称；本 fork 使用独立应用 ID 和 `%APPDATA%/MultiPing` 设置目录，不覆盖上游配置。更新来源已切换为 `ygpdzd/lolPing`，尚未发布 Release 时手动更新检查可能提示没有可用版本。

## 架构

- `src/shared/pings.ts`：LoL 资源、自包含标识编码/严格校验、安全 SVG 图标生成。
- `src/shared/pingProfiles.ts`：内置游戏预设、标识池和 JSON 配置交换。
- `src/shared/settings.ts`：向后兼容配置、当前预设与自定义标识库。
- `src/renderer/settings/components/PingProfileSection.tsx`：预设选择、自定义编辑和导入导出。
- `src/renderer/overlay/pingFx.ts`：多游戏标识和文字标签渲染。

标识仅使用受限文本、六位十六进制颜色和音效白名单，SVG 中的文本进行 XML 转义；不加载外部 URL、不接受用户 HTML。传输大小受现有房间数据包限制保护。

## 来源与许可

感谢 [Danrui Meng / darrenprx](https://github.com/darrenprx/lolPing)。代码沿用 MIT 许可证并保留原版权声明。LoL 图标、表情和音效归 Riot Games 所有，不包含在 MIT 素材授权中；游戏名称及商标归各自权利人。本项目不获 Riot Games 或 Blizzard 官方背书。

原版详细说明见 [上游中文文档](https://github.com/darrenprx/lolPing/blob/main/README.zh-CN.md)。
