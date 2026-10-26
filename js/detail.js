// ============================================================
// detail.js — 详情渲染
// 规则是唯一密钥存储；请求参数/请求体/请求头/响应体四个区块地位对等
// ============================================================

let _renderInProgress = false;
let _renderAgain = false;

async function renderDetail() {
  if (_renderInProgress) { _renderAgain = true; return; }
  _renderInProgress = true;
  try { await _doRenderDetail(); }
  catch (e) { console.error("[renderDetail]", e); }
  finally {
    _renderInProgress = false;
    if (_renderAgain) { _renderAgain = false; await renderDetail(); }
  }
}

function buildEmptyTip(text) {
  const p = document.createElement("pre");
  p.className = "empty";
  p.textContent = text;
  return p;
}

// ========== 解密块（四个区块共用） ==========
async function renderDecryptBlock({ title, text, scope, rule, requestIndex, url, method, showCompare = false, noHeading = false, onDelete = null }) {
  const block = document.createElement("div");
  block.className = "decrypt-block";

  if (!noHeading) {
    block.style.cssText = "margin-bottom:14px;padding:10px 12px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.06);border-radius:8px;";
    const heading = document.createElement("div");
    heading.className = "section-title";
    heading.style.margin = "0 0 8px";
    const titleSpan = document.createElement("span");
    titleSpan.textContent = `${title}${text ? "" : "（无）"}`;
    heading.appendChild(titleSpan);
    if (onDelete) {
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "✕ 删除";
      delBtn.style.cssText = "margin-left:auto;padding:3px 10px;font-size:11px;border:1px solid rgba(239,83,80,.35);background:rgba(239,83,80,.1);color:#fca5a5;border-radius:5px;cursor:pointer;font-family:inherit;";
      delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "rgba(239,83,80,.25)"; delBtn.style.color = "#fff"; });
      delBtn.addEventListener("mouseleave", () => { delBtn.style.background = "rgba(239,83,80,.1)"; delBtn.style.color = "#fca5a5"; });
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm(`删除字段「${title}」的解析规则？`)) return;
        try { onDelete(); }
        catch (err) { showToast("删除失败: " + err.message, "err"); }
      });
      heading.appendChild(delBtn);
    }
    block.appendChild(heading);
    if (!text) {
      block.appendChild(buildEmptyTip("（无内容）"));
      return block;
    }
  } else if (!text) {
    block.appendChild(buildEmptyTip("（无内容）"));
    return block;
  }

  const { decoder, keys } = getScopeConfig(scope, rule);

  // 算法下拉
  const tb = document.createElement("div");
  tb.className = "toolbar";
  const sel = document.createElement("select");
  for (const [id, d] of Object.entries(getAllDecoders())) {
    const o = document.createElement("option");
    o.value = id; o.textContent = d.label;
    if (id === decoder) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", async () => {
    try {
      upsertRuleScope(url, method, scope, { decoder: sel.value });
      await renderDetail();
    } catch (e) { showToast(e.message, "err"); }
  });
  tb.appendChild(sel);

  // 密钥编辑器
  const reqs = getRequiredCryptoFields(decoder);
  const editor = reqs.length ? buildKeyEditor({ reqs, initialKeys: keys }) : null;
  if (editor) tb.appendChild(editor.saveBtn);
  block.appendChild(tb);
  if (editor) block.appendChild(editor.box);

  // 加密对照
  if (showCompare && getAllDecoders()[decoder]?.encode) {
    const cmp = document.createElement("button");
    cmp.className = "btn-secondary"; cmp.textContent = "🔒 加密对照";
    cmp.style.marginBottom = "8px";
    cmp.addEventListener("click", async () => {
      cmp.disabled = true;
      try {
        const curKeys = editor ? editor.getCurrentHexKeys() : keys;
        const result = await runDecoder(decoder, text, curKeys);
        const enc = await runEncoder(decoder, result, curKeys);
        const encText = typeof enc === "string" ? enc : JSON.stringify(enc);
        const match = encText === text;
        showToast(match ? "✅ 加密结果一致" : "❌ 加密结果不一致", match ? "ok" : "err");
      } catch (e) { showToast("加密失败: " + e.message, "err"); }
      finally { cmp.disabled = false; }
    });
    block.appendChild(cmp);
  }

  // 原始内容
  const det = document.createElement("details");
  det.className = "original-block";
  const sum = document.createElement("summary");
  sum.textContent = `原始（${text.length} 字符）`;
  det.appendChild(sum);
  const pre = document.createElement("pre");
  pre.textContent = text.length > 5000 ? text.slice(0, 5000) + "\n…（已截断）" : text;
  det.appendChild(pre);
  block.appendChild(det);

  // 解析结果
  const rl = document.createElement("div");
  rl.className = "label-mini"; rl.textContent = "解析结果：";
  block.appendChild(rl);
  try {
    const result = await runDecoder(decoder, text, keys);
    if (isPlainObject(result) || Array.isArray(result)) block.appendChild(renderJsonWithTs(result));
    else { const p = document.createElement("pre"); p.textContent = valueToText(result); block.appendChild(p); }
  } catch (e) {
    const p = document.createElement("pre");
    p.className = "err"; p.textContent = e.message || String(e);
    block.appendChild(p);
  }

  // 密钥保存
  if (editor) {
    editor.setupSaveHandler({
      onSave: async () => {
        const curDecoder = sel.value;
        const r = editor.getKeys();
        if (r.action === "delete") {
          try {
            upsertRuleScope(url, method, scope, { decoder: curDecoder, keys: null, keysDelete: true });
            await renderDetail();
          } catch (e) { showToast("保存失败: " + e.message, "err"); }
        } else if (r.action === "save") {
          try {
            upsertRuleScope(url, method, scope, { decoder: curDecoder, keys: r.keys });
            await renderDetail();
          } catch (e) { showToast("保存失败: " + e.message, "err"); }
        } else if (r.action === "invalid") {
          showToast(r.error, "err");
        } else if (r.action === "incomplete") {
          showToast("请填完所有密钥字段（或全部清空以删除）", "err");
        }
      },
      onBlurSave: () => {
        const curDecoder = sel.value;
        const r = editor.getKeys();
        if (r.action === "delete") {
          try {
            upsertRuleScope(url, method, scope, { decoder: curDecoder, keys: null, keysDelete: true });
            showToast("已清除密钥", "ok");
          } catch (e) { showToast("保存失败: " + e.message, "err"); }
        } else if (r.action === "save") {
          try {
            upsertRuleScope(url, method, scope, { decoder: curDecoder, keys: r.keys });
            showToast("已保存（按 Enter 刷新结果）", "ok");
          } catch (e) { showToast("保存失败: " + e.message, "err"); }
        } else if (r.action === "invalid") {
          showToast(r.error, "err");
        }
      },
    });
  }

  return block;
}

// ========== 密钥编辑器 ==========
function buildKeyEditor({ reqs, initialKeys }) {
  const box = document.createElement("div");
  box.style.cssText = "margin:8px 0;padding:8px 10px;border:1px solid rgba(79,163,224,.25);border-radius:6px;background:rgba(79,163,224,.05);";
  const allHave = reqs.every((f) => initialKeys[f]);
  const title = document.createElement("div");
  title.style.cssText = `font-size:11px;margin-bottom:6px;color:${allHave ? "#86efac" : "#fca5a5"};`;
  title.textContent = allHave ? "🔑 密钥参数（来自规则）" : "🔑 密钥参数（规则中未配置）";
  box.appendChild(title);

  const fmtRow = document.createElement("div");
  fmtRow.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:6px;";
  const fmtLabel = document.createElement("span");
  fmtLabel.textContent = "编码："; fmtLabel.style.cssText = "font-size:11px;color:rgba(255,255,255,.5);";
  const fmtSel = document.createElement("select");
  fmtSel.innerHTML = '<option value="hex">Hex</option><option value="base64">Base64</option>';
  fmtSel.value = initialKeys.inputFormat === "base64" ? "base64" : "hex";
  fmtSel.style.cssText = "padding:2px 6px;border:1px solid rgba(255,255,255,.15);border-radius:4px;background:rgba(0,0,0,.4);color:#ddd;font-size:11px;";
  fmtRow.append(fmtLabel, fmtSel);
  box.appendChild(fmtRow);

  const inputs = {};
  for (const f of reqs) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:4px;";
    const lbl = document.createElement("span");
    lbl.textContent = f === "iv" || f === "offset" ? "IV：" : "Key：";
    lbl.style.cssText = "font-size:11px;color:rgba(255,255,255,.5);min-width:40px;";
    const inp = document.createElement("input");
    inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
    inp.value = _hexToDisplay(initialKeys[f] || "", fmtSel.value);
    inp.placeholder = fmtSel.value === "hex" ? "hex" : "base64";
    inp.style.cssText = "flex:1;padding:3px 8px;border:1px solid rgba(255,255,255,.15);border-radius:4px;background:rgba(0,0,0,.4);color:#eee;font-size:11px;font-family:Consolas,monospace;";
    inputs[f] = inp;
    row.append(lbl, inp);
    box.appendChild(row);
  }
  fmtSel.addEventListener("change", () => {
    const from = fmtSel.dataset.prev || "hex", to = fmtSel.value;
    if (from === to) return;
    for (const f of reqs) {
      const raw = inputs[f].value.trim();
      let hex = "";
      try { if (raw) hex = decodeCryptoInput(raw, from); } catch {}
      inputs[f].value = hex ? _hexToDisplay(hex, to) : "";
    }
    fmtSel.dataset.prev = to;
  });
  fmtSel.dataset.prev = fmtSel.value;

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "btn-primary";
  saveBtn.textContent = "保存并重新解析";
  saveBtn.style.cssText = "padding:4px 10px;font-size:11px;white-space:nowrap;";

  function getKeys() {
    const allEmpty = reqs.every((f) => !inputs[f].value.trim());
    if (allEmpty) return { action: "delete" };
    try {
      const newKeys = { inputFormat: fmtSel.value };
      for (const f of reqs) {
        const raw = inputs[f].value.trim();
        if (!raw) return { action: "incomplete" };
        newKeys[f] = decodeCryptoInput(raw, fmtSel.value);
      }
      return { action: "save", keys: newKeys };
    } catch (e) {
      return { action: "invalid", error: e.message };
    }
  }
  function getCurrentHexKeys() {
    const r = getKeys();
    return r.action === "save" ? r.keys : initialKeys;
  }
  function setupSaveHandler({ onSave, onBlurSave }) {
    for (const f of reqs) {
      inputs[f].addEventListener("change", () => onBlurSave());
      inputs[f].addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); onSave(); }
      });
    }
    saveBtn.addEventListener("click", () => onSave());
  }
  return { box, saveBtn, getKeys, getCurrentHexKeys, setupSaveHandler };
}

// ========== 字段解析区（四个区块共用） ==========
function collectJsonFields(value, path = [], fields = []) {
  if (Array.isArray(value)) {
    if (!value.length) fields.push({ path, label: "[]" });
    else value.forEach((item, i) => collectJsonFields(item, [...path, i], fields));
    return fields;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) fields.push({ path, label: "{}" });
    else keys.forEach((k) => collectJsonFields(value[k], [...path, k], fields));
    return fields;
  }
  fields.push({ path, label: path.map((p) => `[${JSON.stringify(p)}]`).join("") });
  return fields;
}
function getJsonField(value, path) {
  return path.reduce((c, k) => c?.[k], value);
}
function getJsonSourceFromText(text) {
  if (!text) return null;
  const v = smartDecodeText(text);
  return (isPlainObject(v) || Array.isArray(v)) ? v : null;
}

async function renderFieldsSection({ title, sourceText, sourceData, target, rule, requestIndex, method, urlPath, url }) {
  const wrap = document.createElement("div");
  const source = sourceData !== undefined ? sourceData : getJsonSourceFromText(sourceText);

  const heading = document.createElement("div");
  heading.className = "label-mini";
  heading.textContent = title;
  wrap.appendChild(heading);

  const isObj = source && (isPlainObject(source) || Array.isArray(source));
  if (!isObj) {
    const tip = document.createElement("div");
    tip.style.cssText = "padding:8px 12px;color:rgba(255,255,255,.35);font-size:11.5px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.1);border-radius:6px;";
    tip.textContent = "解析结果不是对象/数组，无法提取字段。";
    wrap.appendChild(tip);
    return wrap;
  }

  const predefined = collectMatchedFields(rule, method, urlPath, target);

  for (const f of predefined) {
    let pathArr;
    try { pathArr = JSON.parse(f.param); } catch { continue; }
    const fieldValue = getJsonField(source, pathArr);
    const fieldText = fieldValue === undefined || fieldValue === null
      ? ""
      : (typeof fieldValue === "string" ? fieldValue : JSON.stringify(fieldValue));
    const scope = `field|${method}|${target}|${urlPath}|${f.param}`;
    wrap.appendChild(await renderDecryptBlock({
      title: f.param, text: fieldText, scope, rule, requestIndex, url, method,
      onDelete: () => { removeRuleScope(url, scope); renderDetail(); },
    }));
  }

  const allFields = collectJsonFields(source);
  const predefinedParams = new Set(predefined.map((f) => f.param));
  const candidates = allFields.filter((f) => !predefinedParams.has(JSON.stringify(f.path)));

  if (candidates.length) {
    const addBox = document.createElement("div");
    addBox.className = "toolbar";
    addBox.style.marginTop = "8px";

    const sel = document.createElement("select");
    for (const f of candidates) {
      const opt = document.createElement("option");
      opt.value = JSON.stringify(f.path);
      opt.textContent = f.label || "(根值)";
      sel.appendChild(opt);
    }
    addBox.appendChild(sel);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn-secondary";
    addBtn.textContent = "+ 添加到规则";
    addBtn.style.fontSize = "11px";
    addBtn.addEventListener("click", async () => {
      const pathStr = sel.value;
      if (!pathStr) return;
      const scope = `field|${method}|${target}|${urlPath}|${pathStr}`;
      try {
        upsertRuleScope(url, method, scope, { decoder: "raw" });
        await renderDetail();
      } catch (e) { showToast("添加失败: " + e.message, "err"); }
    });
    addBox.appendChild(addBtn);
    wrap.appendChild(addBox);
  }

  return wrap;
}

// ========== 请求头 tab（折叠样式保持，展开后有完整功能） ==========
async function renderHeaders(entry, rule, requestIndex, url, method, urlPath) {
  const headers = entry.request?.headers || [];
  const wrap = document.createElement("div");
  const t = document.createElement("div");
  t.className = "section-title";
  t.textContent = `请求头（${headers.length}）`;
  wrap.appendChild(t);
  if (!headers.length) {
    wrap.appendChild(buildEmptyTip("（无）"));
    return wrap;
  }

  const list = document.createElement("div");
  list.className = "headers-list";

  for (const h of headers) {
    const stateKey = `${requestIndex}:${h.name}`;
    const row = document.createElement("div");
    row.className = "header-row";

    const line = document.createElement("div");
    line.className = "header-line";
    const nameEl = document.createElement("span");
    nameEl.className = "header-name";
    nameEl.textContent = h.name;
    const valEl = document.createElement("span");
    valEl.className = "header-value";
    valEl.textContent = h.value;
    valEl.title = h.value;
    line.append(nameEl, valEl);
    row.appendChild(line);

    const expand = document.createElement("div");
    expand.className = "header-parse-panel";
    expand.style.display = "none";
    row.appendChild(expand);

    let initialized = false;
    let initPromise = null;
    const initPanel = () => {
      if (initialized) return initPromise || Promise.resolve();
      initialized = true;
      initPromise = (async () => {
        const scope = `header|${h.name}`;
        // 整体块
        expand.appendChild(await renderDecryptBlock({
          title: h.name, text: h.value || "", scope, rule, requestIndex, url, method, noHeading: true,
        }));
        // 字段解析（先算一次解析结果作为 source）
        const cfg = getScopeConfig(scope, rule);
        let parsed;
        try { parsed = await runDecoder(cfg.decoder, h.value, cfg.keys); } catch { parsed = null; }
        expand.appendChild(await renderFieldsSection({
          title: "字段解析", sourceData: parsed, target: `header:${h.name}`,
          rule, requestIndex, method, urlPath, url,
        }));
      })();
      return initPromise;
    };

    let hoverTimer = null, leaveTimer = null;
    row.addEventListener("mouseenter", () => {
      if (pinnedHeaders.has(stateKey)) return;
      clearTimeout(leaveTimer); clearTimeout(hoverTimer);
      hoverTimer = setTimeout(async () => {
        await initPanel();
        if (!pinnedHeaders.has(stateKey)) expand.style.display = "block";
      }, 200);
    });
    row.addEventListener("mouseleave", () => {
      if (pinnedHeaders.has(stateKey)) return;
      clearTimeout(hoverTimer); clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        if (!pinnedHeaders.has(stateKey)) expand.style.display = "none";
      }, 300);
    });
    row.addEventListener("click", async (e) => {
      if (e.target.closest("select, button, input, textarea, a, .header-parse-panel")) return;
      if (pinnedHeaders.has(stateKey)) {
        pinnedHeaders.delete(stateKey);
        row.classList.remove("pinned");
        if (!row.matches(":hover")) expand.style.display = "none";
      } else {
        pinnedHeaders.add(stateKey);
        row.classList.add("pinned");
        await initPanel();
        expand.style.display = "block";
      }
    });

    if (pinnedHeaders.has(stateKey)) {
      row.classList.add("pinned");
      setTimeout(async () => {
        await initPanel();
        if (pinnedHeaders.has(stateKey)) expand.style.display = "block";
      }, 0);
    }

    list.appendChild(row);
  }

  wrap.appendChild(list);
  return wrap;
}

// ========== 详情页：四个对等 tab ==========
async function _doRenderDetail() {
  if (state.currentIndex < 0 || !state.entries[state.currentIndex]) {
    detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>';
    return;
  }
  const item = state.entries[state.currentIndex];
  const { entry, originalIndex, type } = item;
  const url = entry.request?.url || "";
  const rule = matchRule(url);
  const method = (entry.request?.method || "GET").toUpperCase();
  const urlPath = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
  const isMedia = type === "image" || type === "audio" || type === "video";

  const headers = entry.request?.headers || [];
  const reqText = getPostText(entry) || "";
  const resText = getResponseText(entry) || "";
  const queryText = getQueryRawText(entry) || "";

  detailPanel.innerHTML = "";

  // 信息栏
  const info = document.createElement("div");
  const mark = state.marks.get(originalIndex);
  info.innerHTML = `
    <div class="field"><label>URL</label><div class="value">${escapeHtml(url)}</div></div>
    <div class="field"><label>方法 / 类型 / 状态 / 时间</label><div class="value">
      <span class="method method-${escapeHtml(method)}">${escapeHtml(method)}</span>
      &nbsp;<span class="tag">${TYPE_ICONS[type] ? TYPE_ICONS[type] + " " : ""}${escapeHtml(TYPE_LABELS[type] || type)}</span>
      &nbsp;${entry.response?.status || ""} ${escapeHtml(entry.response?.statusText || "")}
      &nbsp;<span class="tag">${escapeHtml(formatTime(entry.startedDateTime))}</span>
      ${rule ? `&nbsp;<span class="tag" style="background:rgba(217,119,6,.2);color:#ffcc80;">规则: ${escapeHtml(rule.note || String(rule.match))}</span>` : ""}
    </div></div>
    ${mark?.note ? `<div class="field"><label>备注</label><div class="value" style="color:rgba(255,255,255,.65);font-style:italic;">${escapeHtml(mark.note)}</div></div>` : ""}
  `;
  detailPanel.appendChild(info);

  // 4 tab
  const tabBar = document.createElement("div");
  tabBar.className = "detail-tabs";
  const tabs = [
    { id: "params", label: "请求参数" },
    { id: "body", label: "请求体" },
    { id: "headers", label: `请求头（${headers.length}）` },
    { id: "response", label: "响应体" },
  ];
  const panels = {};
  const buttons = new Map();
  for (const tab of tabs) {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "detail-tab"; btn.textContent = tab.label;
    btn.addEventListener("click", () => activateTab(tab.id));
    buttons.set(tab.id, btn);
    tabBar.appendChild(btn);
    const panel = document.createElement("div");
    panel.hidden = true;
    panels[tab.id] = panel;
  }
  detailPanel.appendChild(tabBar);
  for (const id of Object.keys(panels)) detailPanel.appendChild(panels[id]);

  function activateTab(id) {
    state.detailTab = id;
    for (const t of tabs) {
      buttons.get(t.id).classList.toggle("active", t.id === id);
      panels[t.id].hidden = t.id !== id;
    }
  }

  // ---- 请求参数 tab ----
  if (queryText) {
    panels.params.appendChild(await renderDecryptBlock({
      title: "查询参数", text: queryText, scope: "query", rule, requestIndex: originalIndex, url, method,
      showCompare: true,
    }));
    const qCfg = getScopeConfig("query", rule);
    let qParsed;
    try { qParsed = await runDecoder(qCfg.decoder, queryText, qCfg.keys); } catch { qParsed = null; }
    panels.params.appendChild(await renderFieldsSection({
      title: "字段解析", sourceData: qParsed, target: "query",
      rule, requestIndex: originalIndex, method, urlPath, url,
    }));
  } else {
    panels.params.appendChild(buildEmptyTip("（无查询参数）"));
  }

  // ---- 请求体 tab ----
  if (reqText) {
    panels.body.appendChild(await renderDecryptBlock({
      title: "请求体", text: reqText, scope: "req", rule, requestIndex: originalIndex, url, method,
      showCompare: true,
    }));
    const bCfg = getScopeConfig("req", rule);
    let bParsed;
    try { bParsed = await runDecoder(bCfg.decoder, reqText, bCfg.keys); } catch { bParsed = null; }
    panels.body.appendChild(await renderFieldsSection({
      title: "字段解析", sourceData: bParsed, target: "body",
      rule, requestIndex: originalIndex, method, urlPath, url,
    }));
  } else {
    panels.body.appendChild(buildEmptyTip("（无请求体）"));
  }

  // ---- 请求头 tab ----
  panels.headers.appendChild(await renderHeaders(entry, rule, originalIndex, url, method, urlPath));

  // ---- 响应体 tab ----
  if (isMedia) {
    panels.response.appendChild(buildEmptyTip("（媒体预览暂未集成）"));
  } else if (resText) {
    panels.response.appendChild(await renderDecryptBlock({
      title: "响应体", text: resText, scope: "res", rule, requestIndex: originalIndex, url, method,
      showCompare: true,
    }));
    const rCfg = getScopeConfig("res", rule);
    let rParsed;
    try { rParsed = await runDecoder(rCfg.decoder, resText, rCfg.keys); } catch { rParsed = null; }
    panels.response.appendChild(await renderFieldsSection({
      title: "字段解析", sourceData: rParsed, target: "res",
      rule, requestIndex: originalIndex, method, urlPath, url,
    }));
  } else {
    panels.response.appendChild(buildEmptyTip("（无响应体）"));
  }

  activateTab(tabs.some((t) => t.id === state.detailTab) ? state.detailTab : tabs[0].id);
}