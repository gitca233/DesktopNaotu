import { logger } from "../core/logger";
import { existsSync } from "fs";
import { readJson, writeJson } from "../core/io";
import { naotuBase } from "./base";
import { showFileName } from "./electron";
import { setMinder, getMinder } from "./minder";
import { loadXmind, isXmindFile } from "./xmind";
import { loadMindmap, isMindmapFile } from "./mindmap";

/**
 * 打开一个脑图文件
 * @param filePath 文件路径
 */
export async function openKm(filePath: string) {
  try {
    logger.info(`open file: ${filePath}`);
    if (!existsSync(filePath)) throw new Error(`file not found, ${filePath}`);

    // 通知启动首页隐藏（进入编辑状态）
    window.dispatchEvent(new CustomEvent("naotu-home-hide"));

    // 开启状态保护
    naotuBase.setState("opening");

    if (isXmindFile(filePath) || isMindmapFile(filePath)) {
      // 将 .xmind/.mm 视为新文件：不绑定原路径，保存时必须另存为 .km，避免覆盖原文件
      setMinder(isXmindFile(filePath) ? await loadXmind(filePath) : loadMindmap(filePath));
      naotuBase.setCurrentKm(null);
      showFileName(filePath);
    } else {
      naotuBase.setCurrentKm(filePath);
      setMinder(readJson(filePath));
      showFileName(filePath);
    }
    
    naotuBase.setState("none");
  } catch (error) {
    logger.error("openKm error, ", error);
  }
}

/**
 * 保存一个脑图文件
 * @param filePath 文件路径
 */
export function saveKm(filePath: string) {
  try {
    var minder = getMinder();

    // 修改内容时，记录日志
    logger.info(`${filePath} => ${JSON.stringify(minder)}`);
    
    naotuBase.setState("saving");

    naotuBase.setCurrentKm(filePath);

    writeJson(filePath, minder);

    showFileName(filePath);

    naotuBase.OnSaved();

    naotuBase.setState("none");
  } catch (error) {
    logger.error("saveKm error, ", error);
  }
}
