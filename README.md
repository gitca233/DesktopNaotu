# 桌面版脑图(DesktopNaotu) [![Join the chat at https://gitter.im/DesktopNaotu/DesktopNaotu](https://badges.gitter.im/DesktopNaotu/DesktopNaotu.svg)](https://gitter.im/DesktopNaotu/DesktopNaotu) [![加入桌面版脑图QQ群：330722928](https://pub.idqqimg.com/wpa/images/group.png)](https://shang.qq.com/wpa/qunwpa?idkey=cbd6fbc32adbe20c99c005bc559ec45bf3c9bfe581f9226ed14bd0951ae95739)

## 1、中文介绍

### 软件介绍 [--> **English introduction**](README.md)

桌面版脑图是基于百度脑图的本地化版本，帮助你在没有互联网环境的情况下，依然可以使用脑图工具。

> **Apple Silicon 适配版**：本 fork 在原项目基础上完成适配，支持 Apple Silicon（M1/M2/M3…）芯片原生 arm64 运行，并将 Electron 从 11 升级到 33，已实测可在新版 macOS（Ventura / Sonoma 及以上）上正常使用。

### 更新说明（本 fork）

- 支持 Apple Silicon（arm64）原生运行，修复旧版在 M 系列 Mac 上无法启动的问题
- Electron 11 → 33，兼容新版 macOS
- 将已废弃的 `remote` 模块替换为官方推荐的 `@electron/remote`
- 重构构建脚本（`build.js`），不再依赖已无法在新版 Node 上运行的 gulp 3
- 修复 jQuery 在 nodeIntegration 环境下不挂全局导致界面空白的问题
- 打包默认输出 darwin-arm64，并自动完成带 JIT 权限的签名

### 如何下载

- 方法1：通过 [**百度云下载**](http://pan.baidu.com/s/1jHNBL7C)
- 方法2：通过 [**Github 的 Releases 下载**](https://github.com/NaoTu/DesktopNaotu/releases)

### 各版本对应的系统

| 操作系统  | 位数    |  对应文件 |  大小  | 支持情况 |
| --------  | -----: | -----: | :----  | -- |
| MacOS (Intel) | 64位 | DesktopNaotu-macOS-x64 | < 50M | 支持全部功能 |
| MacOS (Apple Silicon) | 64位 | DesktopNaotu-darwin-arm64 | 约 240M | 支持全部功能 |
| Linux | 64位 | DesktopNaotu-linux-x64 | < 50M | 支持全部功能 |
| Windows 7/10 | 64位 | DesktopNaotu-win32-x64 | < 50M | 支持全部功能 |
| Windows 7/10 | 32位 | DesktopNaotu-win32-ia32 | < 50M | 支持全部功能 |
| Windows XP  | 32位 | DesktopNaotu-Windows-mini | < 8M | 不支持调试 |

### 功能特征

- 包含百度脑图的基本功能
- 本地km文件的操作
- 支持拖拽打开km文件
- 支持关联打开km文件
- 支持自动保存功能
- [提供 **百度脑图** 文件的下载方式](https://github.com/NaoTu/DesktopNaotu/wiki/%E4%B8%8B%E8%BD%BD%E6%89%80%E6%9C%89%E7%99%BE%E5%BA%A6%E8%84%91%E5%9B%BE%E6%96%87%E4%BB%B6)


### 软件截图

- Windows 截图

![Windows](screenshot/Windows.png)

- Mac OS X 截图

![OS X](screenshot/OSX.png)

- Linux 截图

![Linux](screenshot/Linux.png)

### 如何编译

> 注：本项目已重构构建脚本，不再依赖 gulp 3 / 旧版工具链，以下为新版构建方式。

#### 1. 安装依赖

```bash
# 安装 npm 依赖（Electron 33、@electron/remote 等）
npm install

# 安装前端库（jQuery / Angular / kityminder 等）
npx bower install --allow-root
```

> 若下载 Electron 二进制超时（国内网络），先设置镜像：
>
> ```bash
> export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
> ```

#### 2. 编译

```bash
npm run build
```

#### 3. 打包 macOS（Apple Silicon arm64）

```bash
npm run pack
```

打包产物位于 `../OutApp/DesktopNaotu-darwin-arm64/DesktopNaotu.app`。

#### 4. 本地调试运行

```bash
npm start
```

#### 5. 其他系统打包

```bash
npm run packintel   # macOS Intel (x64)
```

### 联系我们

问题和建议反馈：

- [Github issues](https://github.com/NaoTu/DesktopNaotu/issues)
- [加入讨论组](https://gitter.im/DesktopNaotu/DesktopNaotu)
- QQ群：330722928

### 捐赠项目

感谢您的慷慨捐赠。

![微信捐赠](doc/image/wechat-qr.png)

Code released under the [GPL-2.0 License](LICENSE).

## 2、英文介绍

### Software introduction [--> **中文介绍**](doc/README-zh.md)

The desktop version of Mind Mapping is a localized version of Baidu Mind Mapping, which helps you to use Mind Mapping Tool without Internet.

> **Apple Silicon build**: This fork adapts the original project for Apple Silicon (M1/M2/M3…) Macs, running natively on arm64 with the Electron runtime upgraded from 11 to 33. Tested and working on recent macOS (Ventura / Sonoma and later).

### Update notes (this fork)

- Native arm64 support for Apple Silicon, fixing the launch failure of the old build on M-series Macs
- Electron 11 → 33 for compatibility with recent macOS
- Replaced the deprecated `remote` module with the officially recommended `@electron/remote`
- Refactored the build script (`build.js`); no longer depends on gulp 3, which cannot run on modern Node
- Fixed a blank-screen issue caused by jQuery not attaching to the global scope under nodeIntegration
- Packaging now targets darwin-arm64 and ad-hoc signs the app with JIT entitlements

### Special Sponsors

<p align="center"><a href="https://documentnode.io/?utm_source=github&utm_medium=sponsor&utm_campaign=desktopnaotu" target="_blank" rel="noopener noreferrer"><img src="https://user-images.githubusercontent.com/2252451/65103852-16463380-da02-11e9-8b58-bea4a84c2e31.png" alt="Document Node logo"></a><br>
Open Document Node, Inspiration Unfold</p>

### How to download

- Method 1：Download through [**Baidu Cloud**](http://pan.baidu.com/s/1jHNBL7C)
- Method 2：Download through [**Github's Releases**](https://github.com/NaoTu/DesktopNaotu/releases)

### System corresponding to each version

| Operating System | Bit | Corresponding File | Size | Support |
| --------  | -----: | -----: | :----  | -- |
| MacOS (Intel) | 64 bit | DesktopNaotu-macOS-x64 | < 50M | Supports all functions |
| MacOS (Apple Silicon) | 64 bit | DesktopNaotu-darwin-arm64 | ~240M | Supports all functions |
| Linux | 64 bit | DesktopNaotu-linux-x64 | < 50M | Supports all functions |
| Windows 7/10 | 64 bit | DesktopNaotu-win32-x64 | < 50M | Supports all functions |
| Windows 7/10 | 32 bits | DesktopNaotu-win32-ia32 | < 50M | Supports all functions |
| Windows XP | 32 bits | DesktopNaotu-Windows-mini | < 8M | Debugging is not supported |

### Functional characteristics

- Basic functions of Baidu Mind Mapping
- Operation of local km files
- Support dragging open km files
- Support association to open km files
- Support for automatic saving
- [Provide **Baidu Mind Mapping** File Download Method](doc/Help.md)
- [Provide **ProcessOn** Mind Map Download Method](doc/Help.md)
- [View Historical Version](doc/History.md)

### Software screenshots

- Windows screenshot

![Windows](screenshot/Windows-en.png)

- Mac OS X screenshot

![OS X](screenshot/OSX.png)

- Linux screenshot

![Linux](screenshot/Linux.png)

### How to compile

> Note: This project has been refactored and no longer depends on gulp 3 / the legacy toolchain. The following is the new build process.

#### 1. Install dependencies

```bash
# Install npm dependencies (Electron 33, @electron/remote, etc.)
npm install

# Install front-end libraries (jQuery / Angular / kityminder, etc.)
npx bower install --allow-root
```

> If downloading the Electron binary times out (e.g. in mainland China), set the mirror first:
>
> ```bash
> export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
> ```

#### 2. Build

```bash
npm run build
```

#### 3. Package for macOS (Apple Silicon arm64)

```bash
npm run pack
```

The packaged app is at `../OutApp/DesktopNaotu-darwin-arm64/DesktopNaotu.app`.

#### 4. Run in development

```bash
npm start
```

#### 5. Package for other platforms

```bash
npm run packintel   # macOS Intel (x64)
```

### Contact us

Questions and suggestion feedback:

- [Github issues](https://github.com/NaoTu/DesktopNaotu/issues)
- [Join the discussion group](https://gitter.im/DesktopNaotu/DesktopNaotu)
- QQ group：330722928

### License

Code released under the [GPL-2.0 License](LICENSE).
