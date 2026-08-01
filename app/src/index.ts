// --> ipcRender 渲染线程的入口
import { logger } from "./core/logger";
import { I18n } from "./core/i18n";
import { naotuMenu } from "./lib/menu";
import { naotuConf } from "./core/conf";
import { openKm } from "./lib/file";
import { saveDialog } from "./lib/dialog";
import { monitorExitRequest } from "./lib/exit";
import { naotuBase } from "./lib/base";
import { onSelectedNodeItem, hasData } from "./lib/minder";
import * as remote from "@electron/remote";
import { shortcutDialog } from "./ui/shortcut";
import { ipcRenderer } from "electron";
import { showHome } from "./ui/home";

// 进入即记录日志
logger.info("ipcRender init");

// 初始化渲染菜单
naotuMenu.render();

// 监听主进程通过文件关联（双击文件 / 拖到 Dock）发来的打开请求
ipcRenderer.on("open-file", (event, filePath) => {
  if (typeof filePath === "string" && /\.(km|xmind|mm)$/i.test(filePath)) {
    logger.info(`receive open-file from main: ${filePath}`);
    openKm(filePath);
  }
});

// 监听退出请求
monitorExitRequest();

angular
  .module("kityminderDemo", ["kityminderEditor"])
  .config(function(configProvider: any) {
    configProvider.set("lang", I18n.getLang());

    // configProvider.set('imageUpload', '../server/imageUpload.php');
  })
  .controller("MainController", function($scope: any, $modal: any) {
    $scope.initEditor = function(editor: any, minder: any) {
      editor = editor;
      minder = minder;
    };
  });

$(function() {
  if (minder != null) {
    // auto saving
    minder.on("contentchange", function(argv: any) {
      // 操作完成之后才触发事件
      if (naotuBase.getState() == "none") {
        logger.info(`invoked contentchange()`);

        naotuBase.OnEdited();

        // 即使开启自动保存，必须有数据才保存
        if (naotuConf.getModel().isAutoSave) {
          saveDialog();
        }
      }
    });

    minder.on("selectionchange", function() {
      let node = minder.getSelectedNode();

      // 修改菜单的状态
      onSelectedNodeItem(!!node);
    });

    // 通过参数打开文件
    // 此方法需要放在注册 contentchange 事件之后。
    let argv = remote.process.argv;
    logger.info(`remote.process.argv: ${argv}`);

    let fileOpened = false;
    if (argv.length >= 2) {
      for (let i = 1; i < argv.length; i++) {
        let filePath = argv[i] as string;

        if (/\.(km|xmind|mm)$/i.test(filePath)) {
          openKm(filePath);
          fileOpened = true;
          break;
        }
      }
    }

    // 未通过参数/文件关联打开任何文件时，显示启动首页（备份目录文件列表）
    if (!fileOpened) {
      showHome();
    }
  }
});

function openUrl(url: string) {
  require("electron").shell.openExternal(url);
}
