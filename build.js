"use strict";

/**
 * 桌面版脑图构建脚本
 * 替代原 gulp 3 构建（gulp 3 无法在现代 Node 上运行）
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = __dirname;
const dist = path.join(root, "dist");

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function mkdirp(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copy(src, dst) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      copy(s, d);
    }
  }
}

function concat(files, dst) {
  const chunks = files.map(f => fs.readFileSync(path.join(root, f)));
  mkdirp(path.dirname(dst));
  fs.writeFileSync(dst, Buffer.concat(chunks));
}

console.log(">>> 1/4 清空 dist 结构...");
for (const f of fs.readdirSync(dist)) {
  rmrf(path.join(dist, f));
}

console.log(">>> 2/4 编译 TypeScript...");
try {
  execSync("npx tsc -p tsconfig.json", { cwd: root, stdio: "inherit" });
} catch (e) {
  console.error("TypeScript 编译失败");
  process.exit(1);
}

console.log(">>> 3/4 打包前端资源...");

// index.html + 设置对话框模板
copy("app/static/index.html", path.join(dist, "index.html"));
copy("app/src/ui/pref_dialog.seg.html", path.join(dist, "ui/pref_dialog.seg.html"));

// 样式
copy("app/style/main.css", path.join(dist, "style/main.css"));

const vendorJs = [
  "bower_components/jquery/dist/jquery.min.js",
  "bower_components/bootstrap/dist/js/bootstrap.min.js",
  "bower_components/bootbox.js/bootbox.js",
  "bower_components/angular/angular.min.js",
  "bower_components/angular-bootstrap/ui-bootstrap-tpls.js",
  "bower_components/codemirror/lib/codemirror.js",
  "bower_components/codemirror/mode/xml/xml.js",
  "bower_components/codemirror/mode/javascript/javascript.js",
  "bower_components/codemirror/mode/css/css.js",
  "bower_components/codemirror/mode/htmlmixed/htmlmixed.js",
  "bower_components/codemirror/mode/markdown/markdown.js",
  "bower_components/codemirror/addon/mode/overlay.js",
  "bower_components/codemirror/mode/gfm/gfm.js",
  "bower_components/angular-ui-codemirror/ui-codemirror.js",
  "bower_components/marked/lib/marked.js",
  "bower_components/kity/dist/kity.min.js",
  "bower_components/hotbox/hotbox.js",
  "bower_components/kityminder-core/dist/kityminder.core.min.js",
  "bower_components/color-picker/dist/color-picker.js",
  "bower_components/kityminder-editor/dist/kityminder.editor.js"
];
for (const f of vendorJs) {
  if (!fs.existsSync(path.join(root, f))) {
    console.error(`缺少前端依赖文件: ${f}`);
    process.exit(1);
  }
}

// 单独复制 jquery（index.html 中单独引用）
copy("bower_components/jquery/dist/jquery.min.js", path.join(dist, "js/jquery.min.js"));
// 其余打包为 vendor.js
concat(vendorJs.slice(1), path.join(dist, "js/vendor.js"));

const vendorCss = [
  "bower_components/bootstrap/dist/css/bootstrap.css",
  "bower_components/codemirror/lib/codemirror.css",
  "bower_components/hotbox/hotbox.css",
  "bower_components/kityminder-core/dist/kityminder.core.css",
  "bower_components/color-picker/dist/color-picker.css",
  "bower_components/kityminder-editor/dist/kityminder.editor.css"
];
concat(vendorCss, path.join(dist, "style/vendor.css"));

// 字体与图片
copyDir("bower_components/bootstrap/dist/fonts", path.join(dist, "fonts"));
copyDir("bower_components/kityminder-editor/dist/images", path.join(dist, "style/images"));

// 多语言
copyDir("locale", path.join(dist, "locale"));

console.log(">>> 4/4 构建完成");

// 打印最终文件列表
const out = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else out.push(path.relative(root, full));
  }
}
walk(dist);
console.log(out.join("\n"));
