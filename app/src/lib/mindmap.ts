import { readFileSync } from "fs";
import { extname } from "path";
import { KmNode } from "./xmind";

/**
 * 判断文件是否为 .mm（FreeMind / MindManager）文件
 * @param filePath 文件路径
 */
export function isMindmapFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".mm";
}

/**
 * 将 .mm 文件解析为 DesktopNaotu 可识别的 km 结构
 *
 * 支持的格式：
 *  - FreeMind：根元素 <map>，主题用 <node TEXT="...">
 *  - MindManager：根元素 <OneTopic>，主题用 <Topic><Title>...</Title></Topic>
 *
 * @param filePath .mm 文件路径
 */
export function loadMindmap(filePath: string): any {
  const raw = readFileSync(filePath, "utf8");

  // FreeMind richcontent 的 HTML 里常有未闭合的 <br>/<hr> 等标签，先修正为合法 XML
  // 例：<br> -> <br/>；已自闭合的 <br/> 不受影响
  const xml = raw.replace(/<(br|hr|img|meta|link)([^>]*)>(?![\s]*\/>)/gi, "<$1$2/>");

  if (typeof DOMParser === "undefined") {
    throw new Error("当前环境不支持解析 .mm 文件（缺少 DOMParser）");
  }

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error(".mm 文件解析失败");
  }

  const rootEl = doc.documentElement;
  if (!rootEl) throw new Error(".mm 文件中没有找到根元素");

  // MindManager：根元素 OneTopic
  if (rootEl.localName === "OneTopic") {
    const topic = doc.getElementsByTagName("Topic")[0];
    if (!topic) throw new Error(".mm 文件中没有找到中心主题");
    return { root: mmTopicToKm(topic) };
  }

  // FreeMind：根元素 map，第一个 node 为中心主题
  const node = firstChildByLocalName(rootEl, "node");
  if (!node) throw new Error(".mm 文件中没有找到中心主题");
  return { root: fmNodeToKm(node) };
}

/**
 * FreeMind 节点 -> km 节点
 */
function fmNodeToKm(node: Element): KmNode {
  const data: any = {};

  const text = node.getAttribute("TEXT");
  data.text = text != null ? text : "";

  const id = node.getAttribute("ID");
  if (id) data.id = id;

  if (node.getAttribute("FOLDED") === "true") {
    data.expandState = "collapse";
  }

  const link = node.getAttribute("LINK");
  if (link) data.hyperlink = link;

  const note = findRichcontent(node, "NOTE");
  if (note) data.note = note;

  const priority = findPriority(node);
  if (priority != null) data.priority = priority;

  const kmNode: KmNode = { data };

  const kids: KmNode[] = [];
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.localName === "node") kids.push(fmNodeToKm(child));
  }
  if (kids.length) kmNode.children = kids;

  return kmNode;
}

/**
 * 取出 FreeMind <richcontent TYPE="xxx"> 中的纯文本（去掉 html 标签，保留 <br> 换行）
 */
function findRichcontent(node: Element, type: string): string {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.localName !== "richcontent") continue;
    if (child.getAttribute("TYPE") !== type) continue;

    // FreeMind 标准结构为 richcontent > html > body，需做后代搜索
    const body = child.getElementsByTagName("body")[0];
    if (body) {
      // 用 <br> 替换为换行符，保留多行备注
      const clone = body.cloneNode(true) as Element;
      clone.querySelectorAll("br").forEach((br: Element) => {
        br.replaceWith(document.createTextNode("\n"));
      });
      if (clone.textContent != null) return clone.textContent;
    }
    if (child.textContent != null) return child.textContent;
  }
  return "";
}

/**
 * 取出 FreeMind 节点优先级
 * 兼容两种写法：
 *  - 属性形式：ICON="priority_1"
 *  - 子元素形式：<icon BUILTIN="priority_1"/>
 */
function findPriority(node: Element): number | null {
  const attr = /^priority_([1-9])$/.exec(node.getAttribute("ICON") || "");
  if (attr) return parseInt(attr[1], 10);

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.localName !== "icon") continue;
    const m = /^priority_([1-9])$/.exec(child.getAttribute("BUILTIN") || "");
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/**
 * MindManager 节点 -> km 节点
 */
function mmTopicToKm(topic: Element): KmNode {
  const data: any = {};

  const title = firstChildByLocalName(topic, "Title");
  data.text = title && title.textContent != null ? title.textContent : "";

  const id = topic.getAttribute("Id");
  if (id) data.id = id;

  const note = mmFindNote(topic);
  if (note) data.note = note;

  const kmNode: KmNode = { data };

  const kids: KmNode[] = [];
  for (let i = 0; i < topic.children.length; i++) {
    const child = topic.children[i];
    if (child.localName !== "SubTopic") continue;
    for (let j = 0; j < child.children.length; j++) {
      const grand = child.children[j];
      if (grand.localName === "Topic") kids.push(mmTopicToKm(grand));
    }
  }
  if (kids.length) kmNode.children = kids;

  return kmNode;
}

/**
 * 取出 MindManager 备注：<Notes><PlainText><Text>...</Text></PlainText></Notes>
 */
function mmFindNote(topic: Element): string {
  const notes = firstChildByLocalName(topic, "Notes");
  if (!notes) return "";
  const plain = firstChildByLocalName(notes, "PlainText");
  if (!plain) return "";
  const text = firstChildByLocalName(plain, "Text");
  return text && text.textContent != null ? text.textContent : "";
}

/**
 * 取直属子元素中 localName 匹配的第一个元素
 */
function firstChildByLocalName(parent: Element, name: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    if (child.localName === name) return child;
  }
  return null;
}

/**
 * 将 km 结构导出为 FreeMind (.mm) XML 文本
 *
 * 映射规则：
 *  - text   -> TEXT 属性
 *  - id     -> ID 属性
 *  - hyperlink -> LINK 属性
 *  - expandState=collapse -> FOLDED="true"
 *  - priority -> <icon BUILTIN="priority_N"/>
 *  - note   -> <richcontent TYPE="NOTE">（纯文本，转义后放入 html body）
 *
 * @param km km 结构（minder.exportJson() 的输出）
 */
export function exportMindmap(km: any): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<map version="1.0.1">');
  if (km && km.root) lines.push(mmNodeToXml(km.root, 1));
  lines.push("</map>");
  return lines.join("\n");
}

/**
 * km 节点 -> FreeMind <node> 元素（含缩进）
 */
function mmNodeToXml(node: any, level: number): string {
  const data = (node && node.data) || {};
  const indent = "  ".repeat(level);

  let attrs = "";
  if (data.text != null) attrs += ` TEXT="${xmlEscape(String(data.text))}"`;
  if (data.id) attrs += ` ID="${xmlEscape(String(data.id))}"`;
  if (data.hyperlink) attrs += ` LINK="${xmlEscape(String(data.hyperlink))}"`;
  if (data.expandState === "collapse") attrs += ` FOLDED="true"`;

  const children = (node && node.children) || [];
  const hasContent = data.note != null || data.priority != null || children.length > 0;

  if (!hasContent) {
    return `${indent}<node${attrs}/>`;
  }

  const inner: string[] = [];
  inner.push(`${indent}<node${attrs}>`);

  if (data.note != null) {
    const noteHtml = String(data.note)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r\n|\r|\n/g, "<br/>");
    inner.push(`${indent}  <richcontent TYPE="NOTE"><html><head></head><body><p>${noteHtml}</p></body></html></richcontent>`);
  }

  if (data.priority != null) {
    let p = parseInt(String(data.priority), 10);
    if (isNaN(p)) p = 1;
    p = Math.min(Math.max(p, 1), 9);
    inner.push(`${indent}  <icon BUILTIN="priority_${p}"/>`);
  }

  children.forEach((child: any) => inner.push(mmNodeToXml(child, level + 1)));

  inner.push(`${indent}</node>`);
  return inner.join("\n");
}

/**
 * XML 属性值转义
 */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
