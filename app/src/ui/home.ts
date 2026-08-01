import { readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { getBackupDirectoryPath } from "../core/path";
import { naotuConf } from "../core/conf";
import { I18n } from "../core/i18n";
import { openKm } from "../lib/file";
import { openDialog } from "../lib/dialog";
import { initRoot } from "../lib/minder";
import * as remote from "@electron/remote";

/**
 * 启动首页：展示默认目录（配置的默认保存路径，未设置时回退备份目录）
 * 中的脑图文件列表，提供「新建 / 打开文件」入口
 *
 * 通过自定义事件 "naotu-home-hide" 与外部解耦：
 * 打开文件（openKm）或新建空白文档（initRoot）时会广播该事件，首页自动隐藏。
 */

const HOME_ID = "naotu-home";
const SUPPORTED_EXT = /\.(km|xmind|mm)$/i;

let homeEl: HTMLElement | null = null;

interface FileItem {
  name: string;
  mtime: number;
}

/**
 * 读取备份目录中的脑图文件列表（按修改时间倒序）
 */
function listBackupFiles(dir: string): FileItem[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch (e) {
    return [];
  }

  return names
    .filter(n => SUPPORTED_EXT.test(n))
    .map(n => {
      let mtime = 0;
      try {
        mtime = statSync(join(dir, n)).mtimeMs;
      } catch (e) {}
      return { name: n, mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function pad(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function formatTime(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extBadge(name: string): { ext: string; cls: string } {
  const ext = extname(name).replace(".", "").toLowerCase();
  const cls = ext === "km" ? "nh-badge-km" : ext === "xmind" ? "nh-badge-xmind" : "nh-badge-mm";
  return { ext: ext || "?", cls };
}

function cardHTML(item: FileItem): string {
  const { ext, cls } = extBadge(item.name);
  return `
    <div class="nh-card" data-file="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}">
      <div class="nh-card-icon"><span class="nh-badge ${cls}">${escapeHtml(ext)}</span></div>
      <div class="nh-card-name">${escapeHtml(item.name)}</div>
      <div class="nh-card-time">${formatTime(item.mtime)}</div>
    </div>`;
}

const HOME_CSS = `
#naotu-home {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;
  background: #f7f8fa; overflow-y: auto;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
}
#naotu-home .nh-container { max-width: 920px; margin: 0 auto; padding: 56px 32px 40px; }
#naotu-home .nh-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
#naotu-home .nh-title { font-size: 26px; font-weight: 600; color: #2b3a4a; margin: 0; }
#naotu-home .nh-actions { display: flex; gap: 12px; }
#naotu-home .nh-btn {
  border: 1px solid #d5dbe1; background: #fff; color: #34495e; border-radius: 6px;
  padding: 9px 18px; font-size: 14px; cursor: pointer; transition: all .15s; outline: none;
}
#naotu-home .nh-btn:hover { border-color: #9aa8b4; }
#naotu-home .nh-btn-primary { background: #4285f4; border-color: #4285f4; color: #fff; font-weight: 600; }
#naotu-home .nh-btn-primary:hover { background: #2f6fe0; border-color: #2f6fe0; }
#naotu-home .nh-dir { margin: 24px 0 4px; color: #8a97a5; font-size: 13px; }
#naotu-home .nh-dir-path { color: #5a6775; word-break: break-all; }
#naotu-home .nh-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-top: 14px;
}
#naotu-home .nh-card {
  background: #fff; border: 1px solid #e4e8ec; border-radius: 10px; padding: 18px 16px;
  cursor: pointer; transition: box-shadow .15s, transform .05s;
  display: flex; flex-direction: column; gap: 8px; user-select: none;
}
#naotu-home .nh-card:hover { box-shadow: 0 4px 16px rgba(31, 45, 61, .12); transform: translateY(-1px); }
#naotu-home .nh-badge {
  display: inline-block; padding: 3px 8px; border-radius: 4px; color: #fff; font-size: 12px; letter-spacing: .5px;
}
#naotu-home .nh-badge-km { background: #4285f4; }
#naotu-home .nh-badge-xmind { background: #f2994a; }
#naotu-home .nh-badge-mm { background: #7f8c8d; }
#naotu-home .nh-card-name { font-size: 14px; color: #2b3a4a; word-break: break-all; line-height: 1.4; }
#naotu-home .nh-card-time { font-size: 12px; color: #a0aab5; }
#naotu-home .nh-empty { color: #8a97a5; text-align: center; margin-top: 64px; font-size: 14px; line-height: 1.9; }
#naotu-home .nh-footer { margin-top: 30px; text-align: center; }
#naotu-home .nh-link {
  border: none; background: none; color: #4285f4; cursor: pointer; font-size: 13px; padding: 4px 8px; outline: none;
}
#naotu-home .nh-link:hover { text-decoration: underline; }
`;

/**
 * 隐藏首页
 */
export function hideHome() {
  if (homeEl) {
    window.removeEventListener("naotu-home-hide", hideHome);
    homeEl.remove();
    homeEl = null;
  }
}

/**
 * 显示首页
 */
export function showHome() {
  if (homeEl) return;

  // 默认目录：优先使用配置的默认保存路径（重选自动保存目录所设置），未设置时回退备份目录
  const dir = naotuConf.getModel().defSavePath || getBackupDirectoryPath();
  const files = listBackupFiles(dir);

  const container = document.createElement("div");
  container.id = HOME_ID;

  const gridHTML = files.length
    ? files.map(cardHTML).join("")
    : `<div class="nh-empty">${escapeHtml(I18n.__("homeEmpty"))}<br>${escapeHtml(I18n.__("homeEmptyHint"))}</div>`;

  container.innerHTML = `
    <style>${HOME_CSS}</style>
    <div class="nh-container">
      <div class="nh-header">
        <h1 class="nh-title">${escapeHtml(I18n.__("homeTitle"))}</h1>
        <div class="nh-actions">
          <button type="button" class="nh-btn nh-btn-primary" id="nh-new">${escapeHtml(I18n.__("homeNewFile"))}</button>
          <button type="button" class="nh-btn" id="nh-open">${escapeHtml(I18n.__("homeOpenFile"))}</button>
        </div>
      </div>
      <div class="nh-dir">${escapeHtml(I18n.__("homeDir"))}：<span class="nh-dir-path">${escapeHtml(dir)}</span></div>
      <div class="nh-grid">${gridHTML}</div>
      <div class="nh-footer">
        <button type="button" class="nh-link" id="nh-open-dir">${escapeHtml(I18n.__("homeOpenDir"))}</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const onNew = () => {
    hideHome();
    initRoot();
  };
  const onOpen = () => {
    hideHome();
    openDialog();
  };
  container.querySelector("#nh-new")!.addEventListener("click", onNew);
  container.querySelector("#nh-open")!.addEventListener("click", onOpen);
  container.querySelector("#nh-open-dir")!.addEventListener("click", () => {
    try {
      remote.shell.showItemInFolder(dir);
    } catch (e) {}
  });
  container.querySelectorAll(".nh-card").forEach(el => {
    el.addEventListener("click", () => {
      const name = el.getAttribute("data-file");
      hideHome();
      if (name) openKm(join(dir, name));
    });
  });

  homeEl = container;
  window.addEventListener("naotu-home-hide", hideHome);
}
