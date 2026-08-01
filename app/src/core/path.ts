/**
 * 路径辅助类
 */
import { app } from "electron";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import { sConfigFile, sLogsDir, sBackupDir } from "../define";

/**
 * 获取用户目录
 */
export function getUserDataDir() {
  // 默认为当前目录
  let userData: string = __dirname;

  try {
    // 获取用户目录
    // 主进程使用 electron.app；渲染进程（app 未定义）时，延迟加载 @electron/remote
    userData = (app || require("@electron/remote").app).getPath("userData");

    // 若没有用户目录，则创建
    if (!existsSync(userData)) mkdirSync(userData);
  } catch (error) {}

  return userData;
}

function getPath(dir: string, isCreate: boolean = true) {
  const userData = getUserDataDir();
  let path = join(userData, dir);

  if (!existsSync(path) && isCreate) mkdirSync(path);
  return path;
}

/**
 * 获取配置文件的路径
 */
export function getConfigFilePath(): string {
  return getPath(sConfigFile, false);
}

/**
 * 获取日志目录的路径
 */
export function getLogDirectoryPath(): string {
  return getPath(sLogsDir);
}

/**
 * 获取默认的备份目录（用户数据目录下的 backup）
 */
export function getDefaultBackupDirectoryPath(): string {
  return join(getUserDataDir(), sBackupDir);
}

/**
 * 获取备份目录
 *
 * 优先使用配置文件中 backupPath 指定的目录（可自由设置），
 * 否则使用默认的备份目录。
 * 若指定目录创建失败（如无权限），回退到默认备份目录。
 */
export function getBackupDirectoryPath(): string {
  const defaultPath = getDefaultBackupDirectoryPath();

  let backupPath = "";
  try {
    const configPath = getConfigFilePath();
    if (existsSync(configPath)) {
      const model = JSON.parse(readFileSync(configPath, "utf8"));
      backupPath = model.backupPath || "";
    }
  } catch (error) {}

  const target = backupPath || defaultPath;

  try {
    if (!existsSync(target)) mkdirSync(target, { recursive: true });
    return target;
  } catch (error) {
    console.warn(
      `create backup directory failed: ${target}, fallback to ${defaultPath}`
    );
    if (!existsSync(defaultPath)) mkdirSync(defaultPath, { recursive: true });
    return defaultPath;
  }
}
