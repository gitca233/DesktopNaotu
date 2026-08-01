import { logger } from "../core/logger";

/**
 * 平滑缩放
 *
 * 覆盖 kityminder 默认的滚轮缩放行为：
 *  - 默认实现按 10/20/50/100/200 离散跳档，且带 100ms 防抖 + 300ms 动画，
 *    触控板捏合 / Ctrl+滚轮时跟手差、有延迟与浮游感。
 *  - 这里改为：连续等比缩放 + 即时生效（绕过动画），大幅提升缩放流畅度。
 *
 * 通过捕获阶段 wheel 监听 + stopPropagation 接管事件，不影响普通滚动。
 */

const ZOOM_MIN = 5;
const ZOOM_MAX = 400;

function wheelDeltaPixels(e: WheelEvent): number {
  let delta = e.deltaY;
  if (e.deltaMode === 1) delta *= 20; // 行 -> 像素
  else if (e.deltaMode === 2) delta *= 120; // 页 -> 像素
  return delta;
}

export function enableSmoothZoom() {
  const editor: any = (window as any).editor;
  const container = document.querySelector(".km-view");

  if (!editor || !container) {
    logger.warn("enableSmoothZoom: editor or container not ready");
    return;
  }

  container.addEventListener(
    "wheel",
    (e: WheelEvent) => {
      // 只接管触控板捏合 / Ctrl(Cmd)+滚轮缩放
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();
      e.stopPropagation();

      const minder = editor.minder;
      if (!minder) return;

      const current = minder._zoomValue || 100;
      // 等比缩放：deltaY 为负（向上/捏合放大）时 newZoom 增大。
      // 敏感度 1.005/px：约 140px 行程放大一倍（原 1.0016 太慢，已逐步上调）
      const next = Math.min(
        ZOOM_MAX,
        Math.max(ZOOM_MIN, current * Math.pow(1.005, -wheelDeltaPixels(e)))
      );
      if (Math.abs(next - current) < 0.05) return;

      // 临时关闭缩放动画，让本次缩放即时生效
      const origin = minder.getOption("zoomAnimationDuration");
      minder.setOption("zoomAnimationDuration", 0);
      try {
        minder.execCommand("zoom", next);
      } catch (err) {
        logger.error("smooth zoom error, ", err);
      } finally {
        minder.setOption("zoomAnimationDuration", origin);
      }
    },
    { capture: true, passive: false }
  );
}
