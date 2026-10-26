// ============================================================
// state.js — 全局状态 / DOM 引用 / 分类 / 顶部菜单 / 过滤栏
// 规则是唯一密钥存储，本文件不再持有任何密钥或解密状态
// ============================================================

const PAGE_SIZE = 300;
const MAX_AUTO_DECRYPT = 5 * 1024 * 1024;
function makeFilter() { return { include: new Set(), exclude: new Set() }; }

const state = {
  har: null, entries: [], currentIndex: -1, detailTab: "request",
  marks: new Map(),
  filters: { method: makeFilter(), type: makeFilter(), mime: makeFilter(), domain: makeFilter() },
  entryMeta: new Map(), renderedCount: 0,
};

// 兼容 list.js 里 pinnedHeaders.clear() 的调用
const pinnedHeaders = new Set();

const $ = (id) => document.getElementById(id);
const menuBtn = $("menuBtn"), menuPanel = $("menuPanel");
const harInput = $("harInput"), stats = $("stats");
const exportListBtn = $("exportListBtn");
const entryList = $("entryList"), detailPanel = $("detailPanel"), filterBar = $("filterBar");
const entryListAside = document.querySelector("aside");


const TYPE_LABELS = {
  js: "JS", xhr: "XHR", css: "CSS", html: "HTML",
  image: "图片", audio: "音频", video: "视频",
  font: "字体", text: "文本", other: "其它",
};
const TYPE_ICONS = { image: "🖼", audio: "🔊", video: "🎬" };

function classifyEntry(entry) {
  const url = (entry.request?.url || "").toLowerCase().split("?")[0];
  const mime = (entry.response?.content?.mimeType || "").toLowerCase();
  const ext = (url.match(/\.([a-z0-9]+)$/) || [])[1] || "";
  if (mime.includes("javascript") || mime.includes("ecmascript") || ext === "js" || ext === "mjs" || ext === "map") return "js";
  if (mime.includes("css") || ext === "css") return "css";
  if (mime.includes("html") || ext === "html" || ext === "htm") return "html";
  if (mime.startsWith("image/") || /^(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/.test(ext)) return "image";
  if (mime.startsWith("audio/") || /^(mp3|wav|ogg|m4a|flac|aac)$/.test(ext)) return "audio";
  if (mime.startsWith("video/") || /^(mp4|webm|mkv|avi|mov)$/.test(ext)) return "video";
  if (mime.includes("font") || /^(woff|woff2|ttf|otf|eot)$/.test(ext)) return "font";
  if (mime.includes("json") || mime.includes("xml")) return "xhr";
  const m = (entry.request?.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(m)) return "xhr";
  if (mime.startsWith("text/") || ext === "txt" || ext === "csv" || mime === "") return "text";
  return "other";
}
function getMimeKey(entry) {
  const r = (entry.response?.content?.mimeType || "").split(";")[0].trim().toLowerCase();
  return r || "(无 MIME)";
}
function getDomain(entry) {
  try { return new URL(entry.request.url).hostname || "(无域名)"; } catch { return "(无效 URL)"; }
}
function getEntryTime(entry) {
  const t = entry.startedDateTime;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return isNaN(ms) ? 0 : ms;
}

// ========== 顶部菜单 ==========
function openMenu() { menuPanel.classList.add("show"); menuBtn.classList.add("open"); }
function closeMenu() { menuPanel.classList.remove("show"); menuBtn.classList.remove("open"); }
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (menuPanel.classList.contains("show")) closeMenu(); else openMenu();
});
document.addEventListener("click", (e) => {
  if (!menuPanel.contains(e.target) && e.target !== menuBtn) closeMenu();
});
menuPanel.addEventListener("click", (e) => {
  if (e.target.closest(".menu-item")) {
    if (e.target.closest("input[type=file]") || e.target.tagName === "INPUT") return;
    setTimeout(closeMenu, 50);
  }
});

// ========== 过滤栏展开/收起 ==========
let filterCollapseTimer = null;
function expandFilter() { filterBar.classList.remove("collapsed"); clearTimeout(filterCollapseTimer); }
function collapseFilter() { filterBar.classList.add("collapsed"); }

function scheduleCollapseFilter() {
  clearTimeout(filterCollapseTimer);
  filterCollapseTimer = setTimeout(() => {
    if (!filterBar.classList.contains("collapsed")) collapseFilter();
  }, 400);
}
stats.addEventListener("click", () => { if (filterBar.classList.contains("collapsed")) expandFilter(); else collapseFilter(); });


filterBar.addEventListener("mouseenter", () => clearTimeout(filterCollapseTimer));
filterBar.addEventListener("mouseleave", () => { if (!filterBar.classList.contains("collapsed")) scheduleCollapseFilter(); });

// ========== 过滤数据 ==========
function buildFilterOptions() {
  const counts = { method: new Map(), type: new Map(), mime: new Map(), domain: new Map() };
  state.entryMeta.clear();
  state.har.log.entries.forEach((entry, idx) => {
    const method = (entry.request?.method || "GET").toUpperCase();
    const type = classifyEntry(entry);
    const mime = getMimeKey(entry);
    const domain = getDomain(entry);
    const time = getEntryTime(entry);
    state.entryMeta.set(idx, { method, type, mime, domain, time });
    counts.method.set(method, (counts.method.get(method) || 0) + 1);
    counts.type.set(type, (counts.type.get(type) || 0) + 1);
    counts.mime.set(mime, (counts.mime.get(mime) || 0) + 1);
    counts.domain.set(domain, (counts.domain.get(domain) || 0) + 1);
  });
  const render = (gid, items) => {
    const g = document.getElementById(gid);
    g.innerHTML = "";
    const all = document.createElement("button");
    all.className = "tag-btn all-btn active";
    all.dataset.value = "__ALL__";
    all.textContent = "全部";
    g.appendChild(all);
    items.forEach(([v, c]) => {
      const b = document.createElement("button");
      b.className = "tag-btn";
      b.dataset.value = v;
      b.textContent = `${gid === "typeGroup" ? TYPE_LABELS[v] || v : v} (${c})`;
      g.appendChild(b);
    });
  };
  render("methodGroup", [...counts.method.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  render("typeGroup", [...counts.type.entries()].sort((a, b) => b[1] - a[1]));
  render("mimeGroup", [...counts.mime.entries()].sort((a, b) => b[1] - a[1]));
  render("domainGroup", [...counts.domain.entries()].sort((a, b) => b[1] - a[1]));
}
function handleGroupClick(e, key) {
  const btn = e.target.closest(".tag-btn");
  if (!btn) return;
  const group = btn.parentElement;
  const v = btn.dataset.value;
  const f = state.filters[key];
  if (v === "__ALL__") { f.include.clear(); f.exclude.clear(); }
  else if (f.include.has(v)) { f.include.delete(v); f.exclude.add(v); }
  else if (f.exclude.has(v)) { f.exclude.delete(v); }
  else { f.include.add(v); }
  group.querySelectorAll(".tag-btn").forEach((b) => {
    const vv = b.dataset.value;
    b.classList.remove("include", "exclude", "active");
    if (vv === "__ALL__") { if (!f.include.size && !f.exclude.size) b.classList.add("active"); }
    else if (f.include.has(vv)) b.classList.add("include");
    else if (f.exclude.has(vv)) b.classList.add("exclude");
  });
  rebuildEntryList();
}
$("methodGroup").addEventListener("click", (e) => handleGroupClick(e, "method"));
$("typeGroup").addEventListener("click", (e) => handleGroupClick(e, "type"));
$("mimeGroup").addEventListener("click", (e) => handleGroupClick(e, "mime"));
$("domainGroup").addEventListener("click", (e) => handleGroupClick(e, "domain"));
function resetAllFilters() {
  Object.values(state.filters).forEach((f) => { f.include.clear(); f.exclude.clear(); });
  ["method", "type", "mime", "domain"].forEach((k) => {
    document.getElementById(k + "Group").querySelectorAll(".tag-btn").forEach((b) => {
      b.classList.remove("include", "exclude", "active");
      if (b.dataset.value === "__ALL__") b.classList.add("active");
    });
  });
}
$("resetFilterBtn").addEventListener("click", () => { resetAllFilters(); rebuildEntryList(); });

function matchDim(value, f) {
  if (f.include.size > 0 && !f.include.has(value)) return false;
  if (f.exclude.has(value)) return false;
  return true;
}