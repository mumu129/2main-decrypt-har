// ============================================================
// list.js — 请求列表渲染 / 右键菜单 / fetch 代码生成 / 键盘上下切换
// ============================================================

function rebuildEntryList() {
  if (!state.har) return;
  const filtered = [];
  state.har.log.entries.forEach(function (entry, idx) {
    const meta = state.entryMeta.get(idx);
    if (!meta) return;
    if (!matchDim(meta.method, state.filters.method)) return;
    if (!matchDim(meta.type, state.filters.type)) return;
    if (!matchDim(meta.mime, state.filters.mime)) return;
    if (!matchDim(meta.domain, state.filters.domain)) return;
    filtered.push({
      entry: entry,
      originalIndex: idx,
      url: entry.request && entry.request.url ? entry.request.url : "",
      method: meta.method,
      type: meta.type,
      status: (entry.response && entry.response.status) || 0,
      time: meta.time,
      rule: matchRule((entry.request && entry.request.url) || ""),
    });
  });
  filtered.sort(function (a, b) { return b.time - a.time; });
  state.entries = filtered;
  renderList(true);
  const total = state.har.log.entries.length;
  const shown = filtered.length;
  stats.textContent = shown === total ? "共 " + total + " 条" : "共 " + total + " 条 / 显示 " + shown + " 条";
}

function renderList(reset) {
  if (reset) {
    entryList.innerHTML = "";
    state.renderedCount = 0;
  }
  if (!state.entries.length) {
    entryList.innerHTML = '<div style="padding:24px;text-align:center;color:rgba(255,255,255,.35);">无匹配请求</div>';
    return;
  }
  const start = state.renderedCount;
  const end = Math.min(start + PAGE_SIZE, state.entries.length);
  const frag = document.createDocumentFragment();
  for (let i = start; i < end; i++) frag.appendChild(buildListItem(state.entries[i], i));
  entryList.appendChild(frag);
  state.renderedCount = end;
  let more = document.getElementById("loadMoreTip");
  if (state.renderedCount < state.entries.length) {
    const remain = state.entries.length - state.renderedCount;
    if (!more) {
      more = document.createElement("div");
      more.id = "loadMoreTip";
      more.style.cssText = "padding:16px;text-align:center;color:rgba(255,255,255,.5);cursor:pointer;border-top:1px solid rgba(255,255,255,.08);font-size:12px;";
      more.addEventListener("click", function () { renderList(false); });
      entryList.appendChild(more);
    }
    more.textContent = "已渲染 " + state.renderedCount + " / " + state.entries.length + "（还剩 " + remain + " 条）";
  } else if (more) {
    more.remove();
  }
}

function refreshListPreservingView() {
  const renderedCount = state.renderedCount;
  const scrollTop = entryListAside.scrollTop;
  renderList(true);
  while (state.renderedCount < Math.min(renderedCount, state.entries.length)) renderList(false);
  entryListAside.scrollTop = scrollTop;
}

function buildListItem(item, i) {
  const div = document.createElement("div");
  const mark = state.marks.get(item.originalIndex);
  let cls = "entry";
  if (i === state.currentIndex) cls += " active";
  if (mark && mark.color) cls += " marked-" + mark.color;
  div.className = cls;
  div.dataset.idx = item.originalIndex;

  const sc = (item.status >= 200 && item.status < 300) ? "ok" : (item.status >= 400 ? "err" : "");
  const icon = TYPE_ICONS[item.type] ? TYPE_ICONS[item.type] + " " : "";
  const typeLabel = TYPE_LABELS[item.type] || item.type;

  let html = "";
  html += '<span class="method method-' + escapeHtml(item.method) + '">' + escapeHtml(item.method) + '</span>';
  html += '<span class="type-tag">' + icon + escapeHtml(typeLabel) + '</span>';
  html += '<span class="url" title="' + escapeHtml(item.url) + '">' + escapeHtml(item.url) + '</span>';
  html += '<span class="status ' + sc + '">' + (item.status || "") + '</span>';
  if (mark && mark.note) {
    html += '<div style="width:100%;margin-top:3px;font-size:11px;color:rgba(255,255,255,.55);font-style:italic;">备注：' + escapeHtml(mark.note) + '</div>';
  }
  div.innerHTML = html;

  let pressTimer = null;
  let longPressed = false;

  div.addEventListener("mousedown", function (event) {
    if (event.button !== 0) return;
    longPressed = false;
    pressTimer = setTimeout(async function () {
      longPressed = true;
      try {
        const code = await generateFetchCode(item);
        await navigator.clipboard.writeText(code);
        showToast("已复制 fetch 代码", "ok");
      } catch (error) {
        showToast("复制失败: " + error.message, "err");
      }
    }, 600);
  });

  function cancelLongPress() { clearTimeout(pressTimer); }
  div.addEventListener("mouseup", cancelLongPress);
  div.addEventListener("mouseleave", cancelLongPress);

  div.addEventListener("click", function () {
    if (longPressed) { longPressed = false; return; }
    state.currentIndex = i;
    entryList.querySelectorAll(".entry.active").forEach(function (el) { el.classList.remove("active"); });
    div.classList.add("active");
    pinnedHeaders.clear();
    renderDetail();
  });

  div.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, item);
  });

  return div;
}

async function getParsedRequestBody(item) {
  const pd = (item.entry.request && item.entry.request.postData) || {};
  if (!pd.text && !(pd.params && pd.params.length)) return { hasBody: false };
  const text = getPostText(item.entry);
  const rule = matchRule((item.entry.request && item.entry.request.url) || "");
  const cfg = getScopeConfig("req", rule);
  try {
    const value = await runDecoder(cfg.decoder, text == null ? "" : text, cfg.keys);
    return { hasBody: true, value: value };
  } catch (e) {
    return { hasBody: true, value: text };
  }
}

function getParsedRequestQuery(item) {
  const rawText = getQueryRawText(item.entry);
  const decoded = smartDecodeText(rawText);
  return isPlainObject(decoded) ? decoded : {};
}

async function generateFetchCode(item) {
  const request = item.entry.request;
  const method = (request.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const headers = {};
  const forbidden = /^(host|content-length|connection|transfer-encoding|upgrade|keep-alive|expect|proxy-)/i;
  const pseudoHeaders = new Set([":method", ":path", ":scheme", ":authority"]);
  let hadCookie = false;
  (request.headers || []).forEach(function (header) {
    const name = header.name || "";
    if (name.toLowerCase() === "cookie") { hadCookie = true; return; }
    if (!pseudoHeaders.has(name.toLowerCase()) && !forbidden.test(name)) headers[name] = header.value;
  });
  const body = await getParsedRequestBody(item);
  const hasBody = body.hasBody && method !== "GET" && method !== "HEAD";
  if (hasBody && !Object.keys(headers).some(function (n) { return n.toLowerCase() === "content-type"; })) {
    headers["Content-Type"] = "application/json";
  }
  const options = [
    "  method: " + JSON.stringify(method),
    "  headers: " + JSON.stringify(headers, null, 2),
  ];
  if (hasBody) options.push("  body: JSON.stringify(" + JSON.stringify(body.value, null, 2) + ")");
  if (hadCookie) options.push('  credentials: "include"');

  const mimeType = (item.entry.response && item.entry.response.content && item.entry.response.content.mimeType) || "";
  const reader = /(?:application|text)\/(?:[^;]+\+)?json/i.test(mimeType) ? "json" : "text";

  const url = new URL(request.url);
  const query = isGet ? getParsedRequestQuery(item) : null;
  if (isGet) url.search = "";
  const fetchUrl = isGet ? "url" : JSON.stringify(request.url);

  const lines = [];
  if (isGet) {
    lines.push("const url = new URL(" + JSON.stringify(url.toString()) + ");");
    lines.push("const params = " + JSON.stringify(query, null, 2) + ";");
    lines.push("for (const [key, value] of Object.entries(params)) {");
    lines.push("  for (const item of Array.isArray(value) ? value : [value]) {");
    lines.push('    const valueText = item !== null && typeof item === "object" ? JSON.stringify(item) : item == null ? "" : String(item);');
    lines.push("    url.searchParams.append(key, valueText);");
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }
  return lines.join("\n") + "\n" +
    "const response = await fetch(" + fetchUrl + ", {\n" + options.join(",\n") + "\n});\n" +
    "const data = await response." + reader + "();\n" +
    "console.log(data);";
}

entryListAside.addEventListener("scroll", function () {
  if (this.scrollTop + this.clientHeight >= this.scrollHeight - 100) {
    if (state.renderedCount < state.entries.length) renderList(false);
  }
});

// ========== 右键菜单 ==========
let ctxMenu = null;
function closeContextMenu() {
  if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
}
document.addEventListener("click", function (e) {
  if (ctxMenu && !ctxMenu.contains(e.target)) closeContextMenu();
});

function showContextMenu(x, y, item) {
  closeContextMenu();
  const origIdx = item.originalIndex;
  const mark = state.marks.get(origIdx) || {};

  const menu = document.createElement("div");
  menu.style.cssText = "position:fixed;z-index:2000;background:rgba(30,30,35,.97);color:#ddd;border:1px solid rgba(255,255,255,.15);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:8px;min-width:190px;font-size:12px;backdrop-filter:blur(20px);";

  const noteBtn = document.createElement("button");
  noteBtn.style.cssText = "display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;color:#ddd;border-radius:6px;font-family:inherit;transition:background .12s;";
  noteBtn.textContent = mark.note ? "编辑备注…" : "添加备注…";
  noteBtn.addEventListener("mouseenter", function () { noteBtn.style.background = "rgba(255,255,255,.08)"; });
  noteBtn.addEventListener("mouseleave", function () { noteBtn.style.background = "transparent"; });
  noteBtn.addEventListener("click", function () {
    const note = prompt("输入备注（留空清除）:", mark.note || "");
    if (note === null) { closeContextMenu(); return; }
    const m = state.marks.get(origIdx) || {};
    if (note.trim()) m.note = note.trim(); else delete m.note;
    if (!m.color && !m.note) state.marks.delete(origIdx); else state.marks.set(origIdx, m);
    refreshListPreservingView();
    if (state.entries[state.currentIndex] && state.entries[state.currentIndex].originalIndex === origIdx) renderDetail();
    closeContextMenu();
  });
  menu.appendChild(noteBtn);

  const colorRow = document.createElement("div");
  colorRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px 4px;border-top:1px solid rgba(255,255,255,.08);margin-top:4px;";
  const colors = [
    ["red", "红色", "#ef5350"],
    ["orange", "橙色", "#ff9800"],
    ["yellow", "黄色", "#fdd835"],
    ["green", "绿色", "#66bb6a"],
    ["blue", "蓝色", "#42a5f5"],
    ["purple", "紫色", "#ab47bc"],
  ];
  colors.forEach(function (entry) {
    const id = entry[0], label = entry[1], color = entry[2];
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.title = (mark.color === id ? "取消" : "标记为") + label;
    const borderColor = mark.color === id ? "#fff" : "rgba(255,255,255,.35)";
    swatch.style.cssText = "width:18px;height:18px;padding:0;border:2px solid " + borderColor + ";border-radius:50%;background:" + color + ";cursor:pointer;";
    swatch.addEventListener("click", function () {
      const next = state.marks.get(origIdx) || {};
      if (next.color === id) delete next.color; else next.color = id;
      if (!next.color && !next.note) state.marks.delete(origIdx); else state.marks.set(origIdx, next);
      refreshListPreservingView();
      closeContextMenu();
    });
    colorRow.appendChild(swatch);
  });
  menu.appendChild(colorRow);

  document.body.appendChild(menu);
  ctxMenu = menu;
  const rect = menu.getBoundingClientRect();
  let fx = x, fy = y;
  if (rect.right > window.innerWidth - 4) fx = window.innerWidth - rect.width - 4;
  if (rect.bottom > window.innerHeight - 4) fy = window.innerHeight - rect.height - 4;
  menu.style.left = fx + "px";
  menu.style.top = fy + "px";
}

// ========== 键盘上下切换请求 ==========
function switchToRequest(newIndex) {
  if (!state.har || !state.entries.length) return;
  if (newIndex < 0 || newIndex >= state.entries.length) return;
  state.currentIndex = newIndex;

  while (state.renderedCount <= newIndex && state.renderedCount < state.entries.length) {
    renderList(false);
  }

  entryList.querySelectorAll(".entry.active").forEach(function (el) { el.classList.remove("active"); });
  const target = state.entries[newIndex];
  const el = entryList.querySelector('.entry[data-idx="' + target.originalIndex + '"]');
  if (el) {
    el.classList.add("active");
    el.scrollIntoView({ block: "nearest" });
  }

  pinnedHeaders.clear();
  renderDetail();
}

document.addEventListener("keydown", function (e) {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

  const ae = document.activeElement;
  const tag = (ae && ae.tagName ? ae.tagName : "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (ae && ae.isContentEditable) return;

  const cfgModal = document.getElementById("configModal");
  if (cfgModal && cfgModal.style.display === "flex") return;
  const menu = document.getElementById("menuPanel");
  if (menu && menu.classList.contains("show")) return;

  if (!state.har || !state.entries.length) return;

  e.preventDefault();
  const cur = state.currentIndex < 0 ? -1 : state.currentIndex;
  const next = e.key === "ArrowDown" ? cur + 1 : cur - 1;
  if (next < 0 || next >= state.entries.length) return;
  switchToRequest(next);
});