// 配置文件辅助类
import { getConfigFilePath, getDefaultBackupDirectoryPath } from "./path";
import { existsSync } from "fs";
import { app } from "electron";
import { writeText, readText } from "./io";
import { Languages, sConfigVersion } from "../define";
import { logger } from "./logger";

/**
 * 文件打开记录的格式
 */
export declare interface IRecentlyItem {
  time: string;
  path: string;
}

/**
 * 配置文件的模板
 */
class NaotuConfig {
  //#region properties

  /**
   * 默认保存的目录
   */
  defSavePath?: string;

  /**
   * 备份目录（可自由设置）
   */
  backupPath?: string;

  /**
   * 最近使用文件列表
   */
  recently?: IRecentlyItem[];

  /**
   * 语言
   */
  locale?: Languages;

  /**
   * 是否自动保存
   */
  isAutoSave?: boolean;

  /**
   * 最近文件的数量
   */
  recentMaxNum?: number;

  /**
   * 是否保存日志到磁盘上
   */
  ifSaveLogToDisk?: boolean;

  /**
   * 是否开启紧凑模式（缩小节点间距的紧凑布局）
   */
  compactMode?: boolean;

  /**
   * 紧凑模式对应的基础主题（不带 -compact 后缀，用于还原）
   */
  compactBase?: string;

  /**
   * 编辑器窗口的大小
   * 每次退出自动记录，下次启动后按此大小打开窗口
   */
  editorWindowWidth?: number;   // 窗口宽度
  editorWindowHeight?: number;  // 窗口高度

  /**
   * 配置文件的版本
   */
  version?: string;
  //#endregion

  //#region methods
  constructor(
    locale: Languages,
    defSavePath: string | null,
    backupPath: string | null,
    isAutoSave: boolean,
    recentMaxNum: number,
    recently: IRecentlyItem[],
    ifSaveLogToDisk: boolean,
    editorWindowWidth: number,
    editorWindowHeight: number,
    compactMode: boolean,
    compactBase: string,
    version: string
  ) {
    this.locale = locale;
    this.defSavePath = defSavePath || undefined;
    this.backupPath = backupPath || undefined;
    this.isAutoSave = isAutoSave;
    this.recentMaxNum = recentMaxNum;
    this.recently = recently;
    this.ifSaveLogToDisk = ifSaveLogToDisk;
    this.editorWindowWidth = editorWindowWidth;
    this.editorWindowHeight = editorWindowHeight;
    this.compactMode = compactMode;
    this.compactBase = compactBase || undefined;
    this.version = version;
  }

  /**
   * 序列化成字符串
   * @param confModel 配置文件对象
   */
  public static Serialization(confModel: NaotuConfig): string {
    let confJson = JSON.stringify(confModel);

    return confJson;
  }

  /**
   * 反序列化成对象
   * @param confText 配置文件字符串
   */
  public static Deserialization(confText: string): NaotuConfig {
    const confJson = JSON.parse(confText);

    let lang = confJson.locale as Languages;
    let defSavePath = confJson.defSavePath as string;
    let backupPath = confJson.backupPath as string;
    let isAutoSave = confJson.isAutoSave as boolean;
    let recentMaxNum = confJson.recentMaxNum as number;
    let recently = confJson.recently as IRecentlyItem[];
    let ifSaveLogToDisk = confJson.ifSaveLogToDisk as boolean;
    let editorWindowWidth = confJson.editorWindowWidth as number;
    let editorWindowHeight = confJson.editorWindowHeight as number;
    let compactMode = confJson.compactMode as boolean;
    let compactBase = confJson.compactBase as string;
    let version = confJson.version as string;

    return new NaotuConfig(
      lang,
      defSavePath,
      backupPath,
      isAutoSave,
      recentMaxNum,
      recently,
      ifSaveLogToDisk,
      editorWindowWidth,
      editorWindowHeight,
      compactMode,
      compactBase,
      version
    );
  }
  //#endregion
}

/**
 * 配置文件接口清单
 */
interface IDesktopConfig {
  /**
   * 升级配置文件
   */
  upgrade(): void;

  /**
   * 获取配置文件模板
   */
  getTemplate(): NaotuConfig;

  /**
   * 获取配置文件
   */
  getModel(): NaotuConfig;

  /**
   * 保存配置文件
   * @param config 配置文件
   */
  save(config: NaotuConfig): void;

  /**
   * 创建配置文件
   */
  create(): void;
}

/**
 * 配置文件实现类
 */
class DesktopConfig implements IDesktopConfig {
  /**
   * 配置文件的路径
   */
  configPath: string;

  constructor() {
    console.log(">>> Config initialize!");

    this.configPath = getConfigFilePath();

    console.log(`init DesktopConfig. path is "${this.configPath}"`);
  }

  create(): void {
    console.log(`create DesktopConfig. path is "${this.configPath}"`);

    let config = this.getTemplate();
    this.save(config);
  }

  upgrade(): void {
    console.log(`upgrade DesktopConfig. path is "${this.configPath}"`);

    this.checkFile();

    let oldModel = this.getModel();
    let newModel = this.getTemplate();

    // 升级配置
    if (oldModel.version !== newModel.version) {
      if (oldModel.isAutoSave) newModel.isAutoSave = oldModel.isAutoSave;
      if (oldModel.locale) newModel.locale = oldModel.locale;
      if (oldModel.backupPath) newModel.backupPath = oldModel.backupPath;
      // 若旧配置的自动保存目录就是旧的默认备份目录，则清空，改为跟随新的备份目录
      if (oldModel.defSavePath && oldModel.defSavePath !== getDefaultBackupDirectoryPath()) {
        newModel.defSavePath = oldModel.defSavePath;
      }
      if (oldModel.recentMaxNum) newModel.recentMaxNum = oldModel.recentMaxNum;
      if (oldModel.ifSaveLogToDisk) newModel.ifSaveLogToDisk = oldModel.ifSaveLogToDisk;
      if (oldModel.editorWindowWidth) newModel.editorWindowWidth = oldModel.editorWindowWidth;
      if (oldModel.editorWindowHeight) newModel.editorWindowHeight = oldModel.editorWindowHeight;
      if (oldModel.recently) newModel.recently = oldModel.recently;
      if (oldModel.compactMode) newModel.compactMode = oldModel.compactMode;
      if (oldModel.compactBase) newModel.compactBase = oldModel.compactBase;

      this.save(newModel);
    }
  }

  getTemplate(): NaotuConfig {
    // 主进程使用 electron.app；渲染进程（app 未定义）时，延迟加载 @electron/remote
    let locale = (app || require("@electron/remote").app).getLocale();
    const lang = (locale as Languages) || "en";

    return new NaotuConfig(
      lang,
      null,                          // defSavePath：默认不指定，自动保存使用 getBackupDirectoryPath()
      "/desktopnaotu/backup",        // backupPath：默认备份目录，可自由设置
      true,
      5,
      [],
      false,
      1000,     // 默认窗口宽度
      800,      // 默认窗口高度
      false,    // 紧凑模式默认关闭
      undefined,
      sConfigVersion
    );
  }

  getModel(): NaotuConfig {
    this.checkFile();

    let data = readText(this.configPath);
    let model = NaotuConfig.Deserialization(data);

    return model;
  }

  checkFile(): void {
    if (!existsSync(this.configPath)) {
      this.create();
    }
  }

  save(config: NaotuConfig): void {
    let data = NaotuConfig.Serialization(config);

    writeText(this.configPath, data);

    console.log(
      `save DesktopConfig. path is "${this.configPath}`
    );
  }
}

export let naotuConf = new DesktopConfig();
