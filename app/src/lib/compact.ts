import { logger } from "../core/logger";
import { naotuConf } from "../core/conf";
import { I18n } from "../core/i18n";

/**
 * "其他样式"标签页 + 紧凑模式
 *
 * 在编辑器顶部标签栏（想法 / 外观 / 视图）右侧注入一个"其他样式"标签页，
 * 提供"紧凑模式"开关：
 *  - 开启时切换到 "<当前主题>-compact" 主题（kityminder 内置 classic/snow/tianpan
 *    等紧凑版）；没有内置紧凑版的主题，则动态生成一个缩小边距/间距的紧凑主题。
 *  - 关闭时还原为基础主题。
 *
 * 标签栏由 AngularJS (ui-bootstrap uib-tabset) 渲染，无法从外部 push 一个 uib-tab，
 * 因此这里用 jQuery 直接追加 <li> 与 <div class="tab-pane">，并在冒泡阶段统一维护
 * .active 状态（晚于 Angular 的 ng-click，可覆盖其更新），保证任意时刻仅一个标签高亮。
 */

let applyingCompact = false;

export function initOtherStylesTab() {
  const editor: any = (window as any).editor;
  const minder = editor && editor.minder;

  if (minder) {
    // 用户在紧凑模式下手动更换主题时，自动对新主题重新套用紧凑版
    minder.on("themechange", () => {
      if (applyingCompact) return;
      const conf = naotuConf.getModel();
      if (conf.compactMode) {
        setCompactMode(true);
      }
    });
  }

  injectWhenReady(0);
}

function injectWhenReady(attempt: number) {
  const $tabset = $(".top-tab .nav-tabs");
  const $content = $(".top-tab .tab-content");

  if (!$tabset.length || !$content.length) {
    // 等待 Angular 渲染出 top-tab 结构
    if (attempt < 60) {
      setTimeout(() => injectWhenReady(attempt + 1), 50);
    }
    return;
  }

  if ($(".naotu-other-styles-tab").length) return;

  $tabset.append(
    $(
      '<li role="presentation" class="naotu-other-styles-tab">' +
        '<a href role="tab">' +
        escapeHtml(I18n.__("miOtherStylesTab")) +
        "</a></li>"
    )
  );

  $content.append(
    $(
      '<div class="tab-pane naotu-other-styles-pane">' +
        '<label class="naotu-compact-item" for="naotu-compact-toggle">' +
        '<input type="checkbox" class="naotu-compact-toggle" id="naotu-compact-toggle">' +
        "<span>" +
        escapeHtml(I18n.__("miCompactMode")) +
        "</span>" +
        "</label>" +
        "</div>"
    )
  );

  bindTabSwitching();
  bindCompactToggle();

  // 启动时若配置了紧凑模式，则应用
  const conf = naotuConf.getModel();
  if (conf.compactMode) {
    setCompactMode(true);
  }
}

function bindTabSwitching() {
  $(".top-tab .nav-tabs").on("click", "a", (e: any) => {
    // 阻止 <a href> 的空链接导航（页面 base target=_blank，会弹出新窗口）
    e.preventDefault();
    const $li = $(e.currentTarget).closest("li");
    const $ul = $li.closest(".nav-tabs");
    const $panes = $(".top-tab .tab-content").find(".tab-pane");
    const index = $ul.find("li").index($li);

    if ($li.hasClass("naotu-other-styles-tab")) {
      // 我们的标签：点击展开 / 再点折叠
      if ($li.hasClass("active")) {
        $li.removeClass("active");
        $panes.eq(index).removeClass("active");
        closeTopTab();
      } else {
        openTopTab();
        $ul.find("li").removeClass("active");
        $panes.removeClass("active");
        $li.addClass("active");
        $panes.eq(index).addClass("active");
      }
      return;
    }

    // Angular 标签：Angular 已更新自身 active，这里只清理/校准我们注入的部分
    $ul.find(".naotu-other-styles-tab").removeClass("active");
    $panes.removeClass("active");
    $panes.eq(index).addClass("active");
  });
}

function bindCompactToggle() {
  const $toggle = $("#naotu-compact-toggle");
  if (!$toggle.length) return;

  const conf = naotuConf.getModel();
  $toggle.prop("checked", !!conf.compactMode);
  $toggle.on("change", function(this: any) {
    setCompactMode($(this).is(":checked"));
  });
}

function setCompactMode(enabled: boolean) {
  const editor: any = (window as any).editor;
  const minder = editor && editor.minder;
  if (!minder) return;

  const themeList = kityminder.Minder.getThemeList();
  let base = (minder.getTheme() || "fresh-blue").replace(/-compact$/, "");
  if (!base) base = "classic";

  let target = base;
  if (enabled) {
    target = base + "-compact";
    if (!themeList[target]) {
      ensureCompactTheme(base);
      if (!themeList[target]) {
        // 兜底：内置的经典紧凑主题
        target = "classic-compact";
      }
    }
  }

  applyingCompact = true;
  try {
    minder.execCommand("theme", target);
  } catch (err) {
    logger.error("compact mode apply error, ", err);
  } finally {
    applyingCompact = false;
  }

  const conf = naotuConf.getModel();
  conf.compactMode = enabled;
  conf.compactBase = base;
  naotuConf.save(conf);
}

/**
 * 为没有内置紧凑版的主题动态生成一个紧凑主题。
 * getThemeList() 返回的是主题注册表对象本身，直接写入即可完成注册。
 */
function ensureCompactTheme(base: string) {
  const themes = kityminder.Minder.getThemeList();
  const name = base + "-compact";
  if (themes[name]) return;

  const src = themes[base];
  if (!src) return;

  const clone: any = {};
  for (const key of Object.keys(src)) clone[key] = src[key];

  const keys = [
    "root-margin",
    "main-margin",
    "sub-margin",
    "sub-tree-margin",
    "root-space",
    "main-space",
    "sub-space",
    "root-padding",
    "main-padding",
    "sub-padding"
  ];
  for (const key of keys) {
    if (key in clone) {
      clone[key] = shrink(
        clone[key],
        // 边距（决定同级行间距）缩得更小：0.35；间距 0.5；内边距 0.8
        /padding/.test(key) ? 0.8 : /space/.test(key) ? 0.5 : 0.35
      );
    }
  }

  themes[name] = clone;
}

function shrink(v: any, factor: number): any {
  const min = 4;
  if (Array.isArray(v)) return v.map((x: number) => Math.max(min, Math.round(x * factor)));
  if (typeof v === "number") return Math.max(min, Math.round(v * factor));
  return v;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function closeTopTab() {
  $(".top-tab .tab-content").animate(
    { height: 0 },
    { duration: 200, complete: () => $(".top-tab .tab-content").css("display", "none") }
  );
  $(".minder-editor").animate({ top: "32px" }, 200);
}

function openTopTab() {
  $(".top-tab .tab-content")
    .css("display", "block")
    .animate({ height: "60px" }, 200);
  $(".minder-editor").animate({ top: "92px" }, 200);
}
