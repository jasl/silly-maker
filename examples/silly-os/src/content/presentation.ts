// SPDX-License-Identifier: MIT
import type { TextCatalogSetV1 } from "@sillymaker/base";
import { definePresentationPatchSurface, parseTextCatalogSetV1 } from "@sillymaker/base";
import { resolvePreferredLocaleV1 } from "@sillymaker/base";

/**
 * Every player-visible text is cataloged by textId, bilingual. The default language
 * follows the browser-reported preference (Chinese→Chinese, everything else→English;
 * resolvePreferredLocaleV1); the settings page can override, persisted to the Host profile.
 */

const zhEntries = [
  { textId: "text.os.app.name", text: "SillyOS 98" },
  { textId: "text.os.boot.title", text: "SillyOS 98" },
  { textId: "text.os.boot.subtitle", text: "正在启动……" },
  { textId: "text.os.desktop.aria", text: "桌面" },
  { textId: "text.os.taskbar.start", text: "开始" },
  { textId: "text.os.taskbar.aria", text: "任务栏" },
  { textId: "text.os.start.save", text: "保存……" },
  { textId: "text.os.start.settings", text: "设置……" },
  { textId: "text.os.start.shutdown", text: "关机……" },
  { textId: "text.os.window.minimize", text: "最小化" },
  { textId: "text.os.window.maximize", text: "最大化" },
  { textId: "text.os.window.restore", text: "还原" },
  { textId: "text.os.window.close", text: "关闭" },
  { textId: "text.os.shutdown.message", text: "现在您可以安全地关闭计算机了。" },
  { textId: "text.os.shutdown.restart", text: "重新启动" },
  { textId: "text.os.shutdown.back", text: "返回桌面" },

  { textId: "text.os.app.control-panel", text: "控制面板" },
  { textId: "text.os.boot.engine-line", text: "SillyOS 98 · SillyMaker 引擎" },
  { textId: "text.os.volume", text: "音量" },
  { textId: "text.os.volume.mute", text: "静音" },
  { textId: "text.os.settings.about", text: "运行在 SillyMaker 引擎里的复古桌面" },
  {
    textId: "text.os.settings.notice",
    text: "系统状态（文件、壁纸、扫雷进度）自动保存，下次开机自动恢复。",
  },
  { textId: "text.os.app.minesweeper", text: "扫雷" },
  { textId: "text.os.mine.beginner", text: "初级" },
  { textId: "text.os.mine.intermediate", text: "中级" },
  { textId: "text.os.mine.expert", text: "高级" },
  { textId: "text.os.mine.new", text: "新游戏" },
  { textId: "text.os.mine.won", text: "你赢了！" },
  { textId: "text.os.mine.lost", text: "游戏结束" },
  { textId: "text.os.mine.flags", text: "剩余雷数" },

  { textId: "text.os.app.notepad", text: "记事本" },
  { textId: "text.os.notepad.untitled", text: "无标题" },
  { textId: "text.os.notepad.file", text: "文件名" },
  { textId: "text.os.notepad.save", text: "保存" },
  { textId: "text.os.notepad.open", text: "打开" },
  { textId: "text.os.notepad.delete", text: "删除" },
  { textId: "text.os.notepad.new", text: "新建" },
  { textId: "text.os.notepad.empty", text: "（硬盘上还没有文件。）" },
  { textId: "text.os.notepad.placeholder", text: "在这里输入文本……" },
  { textId: "text.os.notepad.saved", text: "已保存" },

  { textId: "text.os.app.browser", text: "Silly Explorer" },
  { textId: "text.os.browser.go", text: "转到" },
  { textId: "text.os.browser.address", text: "地址" },
  { textId: "text.os.browser.home.title", text: "欢迎使用 Silly Explorer" },
  {
    textId: "text.os.browser.home.body",
    text:
      "这是一台运行在 SillyMaker 引擎里的复古电脑——一次不务正业的尝试。桌面、窗口与任务栏都是游戏 UI；扫雷是真正的确定性模拟（雷区来自事务 RNG，同种子可重放）；记事本的文件写在硬盘上，关机后再开机还在。",
  },
  { textId: "text.os.browser.home.docs", text: "打开引擎文档（站点允许内嵌）" },
  {
    textId: "text.os.browser.blocked",
    text:
      "多数现代网站通过 X-Frame-Options / CSP frame-ancestors 拒绝被内嵌——这不是故障，是对方的安全策略。试试引擎文档站，或输入允许内嵌的地址。",
  },

  { textId: "text.os.app.wallpaper", text: "显示属性" },
  { textId: "text.os.wallpaper.teal", text: "经典青" },
  { textId: "text.os.wallpaper.clouds", text: "云端" },
  { textId: "text.os.wallpaper.dusk", text: "暮色" },
  { textId: "text.os.wallpaper.apply", text: "应用" },

  { textId: "text.os.settings.language", text: "语言（Language）" },
  { textId: "text.os.settings.language.auto", text: "跟随浏览器" },
] as const;

const enEntries = [
  { textId: "text.os.app.name", text: "SillyOS 98" },
  { textId: "text.os.boot.title", text: "SillyOS 98" },
  { textId: "text.os.boot.subtitle", text: "Starting up…" },
  { textId: "text.os.desktop.aria", text: "Desktop" },
  { textId: "text.os.taskbar.start", text: "Start" },
  { textId: "text.os.taskbar.aria", text: "Taskbar" },
  { textId: "text.os.start.save", text: "Save…" },
  { textId: "text.os.start.settings", text: "Settings…" },
  { textId: "text.os.start.shutdown", text: "Shut Down…" },
  { textId: "text.os.window.minimize", text: "Minimize" },
  { textId: "text.os.window.maximize", text: "Maximize" },
  { textId: "text.os.window.restore", text: "Restore" },
  { textId: "text.os.window.close", text: "Close" },
  { textId: "text.os.shutdown.message", text: "It's now safe to turn off your computer." },
  { textId: "text.os.shutdown.restart", text: "Restart" },
  { textId: "text.os.shutdown.back", text: "Back to desktop" },

  { textId: "text.os.app.control-panel", text: "Control Panel" },
  {
    textId: "text.os.boot.engine-line",
    text: "SillyOS 98 · SillyMaker Engine",
  },
  { textId: "text.os.volume", text: "Volume" },
  { textId: "text.os.volume.mute", text: "Mute" },
  { textId: "text.os.settings.about", text: "A retro desktop running on the SillyMaker engine" },
  {
    textId: "text.os.settings.notice",
    text:
      "System state (files, wallpaper, Minesweeper progress) saves automatically and restores on next boot.",
  },
  { textId: "text.os.app.minesweeper", text: "Minesweeper" },
  { textId: "text.os.mine.beginner", text: "Beginner" },
  { textId: "text.os.mine.intermediate", text: "Intermediate" },
  { textId: "text.os.mine.expert", text: "Expert" },
  { textId: "text.os.mine.new", text: "New game" },
  { textId: "text.os.mine.won", text: "You win!" },
  { textId: "text.os.mine.lost", text: "Game over" },
  { textId: "text.os.mine.flags", text: "Mines left" },

  { textId: "text.os.app.notepad", text: "Notepad" },
  { textId: "text.os.notepad.untitled", text: "Untitled" },
  { textId: "text.os.notepad.file", text: "File name" },
  { textId: "text.os.notepad.save", text: "Save" },
  { textId: "text.os.notepad.open", text: "Open" },
  { textId: "text.os.notepad.delete", text: "Delete" },
  { textId: "text.os.notepad.new", text: "New" },
  {
    textId: "text.os.notepad.empty",
    text: "(No files on disk yet.)",
  },
  { textId: "text.os.notepad.placeholder", text: "Type here…" },
  { textId: "text.os.notepad.saved", text: "Saved" },

  { textId: "text.os.app.browser", text: "Silly Explorer" },
  { textId: "text.os.browser.go", text: "Go" },
  { textId: "text.os.browser.address", text: "Address" },
  { textId: "text.os.browser.home.title", text: "Welcome to Silly Explorer" },
  {
    textId: "text.os.browser.home.body",
    text:
      "This is a retro computer running inside the SillyMaker engine — an off-label experiment. The desktop, windows and taskbar are game UI; Minesweeper is a real deterministic simulation (mines from the transactional RNG, replayable with the same seed); Notepad files live on the hard disk and survive reboot.",
  },
  { textId: "text.os.browser.home.docs", text: "Open the engine docs (embeds allowed)" },
  {
    textId: "text.os.browser.blocked",
    text:
      "Most modern sites refuse to be embedded via X-Frame-Options / CSP frame-ancestors — that is their security policy, not a bug. Try the engine docs site, or an address that allows embedding.",
  },

  { textId: "text.os.app.wallpaper", text: "Display Properties" },
  { textId: "text.os.wallpaper.teal", text: "Classic Teal" },
  { textId: "text.os.wallpaper.clouds", text: "Clouds" },
  { textId: "text.os.wallpaper.dusk", text: "Dusk" },
  { textId: "text.os.wallpaper.apply", text: "Apply" },

  { textId: "text.os.settings.language", text: "Language" },
  { textId: "text.os.settings.language.auto", text: "Match browser" },
] as const;

export const osLocalesV1 = ["zh-CN", "en"] as const;

export const osTextCatalogsV1: TextCatalogSetV1 = parseTextCatalogSetV1({
  defaultLocale: "en",
  catalogs: [
    { locale: "zh-CN", fallbackLocale: "en", entries: [...zhEntries] },
    { locale: "en", fallbackLocale: null, entries: [...enEntries] },
  ],
});

/**
 * Locale resolution: an explicit preference (settings page) wins; with null (follow
 * the browser) match the navigator-reported language list — Chinese hits zh-CN, everything else lands on en.
 */
export function osResolveLocaleV1(preference: string | null, requested: readonly string[]): string {
  if (preference !== null && (osLocalesV1 as readonly string[]).includes(preference)) {
    return preference;
  }
  return resolvePreferredLocaleV1({
    available: osLocalesV1 as readonly string[],
    requested,
    fallback: "en",
  });
}

export function osTextForLocaleV1(locale: string, textId: string): string {
  const catalog = osTextCatalogsV1.catalogs.find((candidate) => candidate.locale === locale) ??
    osTextCatalogsV1.catalogs.find(
      (candidate) => candidate.locale === osTextCatalogsV1.defaultLocale,
    );
  const entry = catalog?.entries.find((candidate) => candidate.textId === textId);
  if (entry !== undefined) return entry.text;
  const fallback = osTextCatalogsV1.catalogs.find(
    (candidate) => candidate.locale === catalog?.fallbackLocale,
  );
  const fallbackEntry = fallback?.entries.find((candidate) => candidate.textId === textId);
  if (fallbackEntry === undefined) throw new TypeError(`os.ui_text_missing:${textId}`);
  return fallbackEntry.text;
}

export const osPresentationPatchSurfaceV1 = definePresentationPatchSurface({});

export interface OsPresentationProgramV1 {
  readonly kind: "silly-os-presentation";
  readonly textCatalogs: TextCatalogSetV1;
}

export function materializeOsPresentationV1(): OsPresentationProgramV1 {
  return Object.freeze({ kind: "silly-os-presentation", textCatalogs: osTextCatalogsV1 });
}
