import { readFileSync } from "fs";
import { extname } from "path";
import * as JSZip from "jszip";

/**
 * 判断文件是否为 .xmind 文件
 * @param filePath 文件路径
 */
export function isXmindFile(filePath: string): boolean {
  return extname(filePath).toLowerCase() === ".xmind";
}

/**
 * km 结构中的节点
 */
export interface KmNode {
  data: { [key: string]: any };
  children?: KmNode[];
}

/**
 * 将 .xmind 文件解析为 DesktopNaotu 可识别的 km 结构
 *
 * 支持的格式：
 *  - 新版（XMind 8+ / XMind ZEN）：zip 内含 content.json
 *  - 老版（XMind 6/7）：zip 内含 content.xml
 *
 * @param filePath .xmind 文件路径
 */
export async function loadXmind(filePath: string): Promise<any> {
  const buffer = readFileSync(filePath);
  const zip = await JSZip.loadAsync(buffer);

  const contentJson = zip.file(/^content\.json$/i)[0];
  if (contentJson) {
    const text = await contentJson.async("string");
    return convertNewFormat(JSON.parse(text));
  }

  const contentXml = zip.file(/^content\.xml$/i)[0];
  if (contentXml) {
    const text = await contentXml.async("string");
    return convertOldFormat(text);
  }

  throw new Error("无法识别的 .xmind 文件（缺少 content.json 或 content.xml）");
}

/**
 * 解析新版格式（content.json）
 */
function convertNewFormat(sheets: any[]): any {
  const sheet = Array.isArray(sheets) ? sheets[0] : null;
  const rootTopic = sheet && sheet.rootTopic;
  if (!rootTopic) throw new Error("xmind 文件中没有找到中心主题");
  return { root: newTopicToKm(rootTopic) };
}

/**
 * 新版格式主题 -> km 节点
 */
function newTopicToKm(topic: any): KmNode {
  const data: any = {};

  if (topic.title != null) data.text = String(topic.title);
  if (topic.id != null) data.id = String(topic.id);

  const note = topic.notes && topic.notes.plain && topic.notes.plain.content;
  if (note) data.note = note;

  if (topic.href) data.hyperlink = topic.href;

  if (Array.isArray(topic.markers)) {
    for (const marker of topic.markers) {
      const markerId = marker && marker.markerId;
      if (typeof markerId !== "string") continue;

      const priority = /^priority-([1-9])$/.exec(markerId);
      if (priority) {
        data.priority = parseInt(priority[1], 10);
        continue;
      }

      switch (markerId) {
        case "task-start": data.progress = 1; break;
        case "task-half": data.progress = 3; break;
        case "task-oct": data.progress = 5; break;
        case "task-done": data.progress = 8; break;
      }
    }
  }

  const node: KmNode = { data };

  const attached = topic.children && topic.children.attached;
  if (Array.isArray(attached) && attached.length) {
    node.children = attached.map(newTopicToKm);
  }

  return node;
}

/**
 * 解析老版格式（content.xml）
 */
function convertOldFormat(xml: string): any {
  if (typeof DOMParser === "undefined") {
    throw new Error("当前环境不支持解析 content.xml（缺少 DOMParser）");
  }

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("content.xml 解析失败");
  }

  const root = doc.documentElement;
  const sheet = firstChildByLocalName(root, "sheet");
  const rootTopic = sheet ? firstChildByLocalName(sheet, "topic") : firstChildByLocalName(root, "topic");
  if (!rootTopic) throw new Error("xmind 文件中没有找到中心主题");

  return { root: oldTopicToKm(rootTopic) };
}

/**
 * 老版格式主题 -> km 节点
 */
function oldTopicToKm(topic: Element): KmNode {
  const data: any = {};

  const title = firstChildByLocalName(topic, "title");
  if (title && title.textContent != null) data.text = title.textContent;

  const id = topic.getAttribute("id");
  if (id) data.id = id;

  if (topic.getAttribute("branch") === "folded") {
    data.expandState = "collapse";
  }

  const notes = firstChildByLocalName(topic, "notes");
  if (notes) {
    const plain = firstChildByLocalName(notes, "plain");
    if (plain && plain.textContent != null) data.note = plain.textContent;
  }

  const node: KmNode = { data };

  const childrenEl = firstChildByLocalName(topic, "children");
  if (childrenEl) {
    const topicsEl = pickTopics(childrenEl);
    if (topicsEl) {
      const kids: KmNode[] = [];
      for (let i = 0; i < topicsEl.children.length; i++) {
        const child = topicsEl.children[i];
        if (child.localName === "topic") kids.push(oldTopicToKm(child));
      }
      if (kids.length) node.children = kids;
    }
  }

  return node;
}

/**
 * 从 <children> 中优先取 type="attached" 的 <topics>，否则取第一个 <topics>
 */
function pickTopics(childrenEl: Element): Element | null {
  let fallback: Element | null = null;
  for (let i = 0; i < childrenEl.children.length; i++) {
    const child = childrenEl.children[i];
    if (child.localName !== "topics") continue;
    if (child.getAttribute("type") === "attached") return child;
    if (!fallback) fallback = child;
  }
  return fallback;
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
