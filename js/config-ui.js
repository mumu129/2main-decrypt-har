// ============================================================
// config-ui.js — 配置模态框 / 算法列表 / 库 UI / 导入导出算法
// ============================================================
const configModal = $("configModal"), modalCloseBtn = $("modalCloseBtn");
const addDecoderBtn = $("addDecoderBtn");
const decoderList = $("decoderList");
const decoderForm = $("decoderForm");
const decoderFormError = $("decoderFormError");
const decoderIdInput = $("decoderIdInput"), decoderLabelInput = $("decoderLabelInput");
const decoderCodeInput = $("decoderCodeInput");
const decoderEncodeInput = $("decoderEncodeInput");
const decoderTemplateSelect = $("decoderTemplateSelect");
const saveDecoderBtn = $("saveDecoderBtn"), cancelDecoderBtn = $("cancelDecoderBtn");
let editingDecoderId = null;

function openModal() {
  configModal.style.display = "flex";
  switchTab("decoders");
  renderDecoderList();
  hideDecoderForm();
  fillTemplateSelect();
}
function closeModal() { configModal.style.display = "none"; }
$("configBtn").addEventListener("click", openModal);
modalCloseBtn.addEventListener("click", closeModal);
configModal.addEventListener("click", (e) => { if (e.target === configModal) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (configModal.style.display === "flex") closeModal();
});
document.querySelectorAll(".modal-tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});
function switchTab(name) {
  document.querySelectorAll(".modal-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === name));
  if (name === "libs") renderLibList();
}

// ---------- 算法列表 UI ----------
function renderDecoderList() {
  decoderList.innerHTML = "";
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;";

  const importJsBtn = document.createElement("button");
  importJsBtn.className = "btn-primary";
  importJsBtn.style.fontSize = "12px";
  importJsBtn.textContent = "📥 导入算法 JS";
  importJsBtn.title = "从外部 .js 文件导入 window.HAR_DECODERS / HAR_RULES / HAR_TEMPLATES";
  const importJsInput = document.createElement("input");
  importJsInput.type = "file";
  importJsInput.accept = ".js,application/javascript";
  importJsInput.multiple = true;
  importJsInput.style.display = "none";
  importJsInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) await importDecoderScripts(files);
    e.target.value = "";
  });
  importJsBtn.addEventListener("click", () => importJsInput.click());
  toolbar.appendChild(importJsBtn);
  toolbar.appendChild(importJsInput);

  const exportAllJsBtn = document.createElement("button");
  exportAllJsBtn.className = "btn-secondary";
  exportAllJsBtn.style.fontSize = "12px";
  exportAllJsBtn.textContent = "📦 导出全部算法 (.js)";
  exportAllJsBtn.addEventListener("click", () => {
    try { exportAllDecodersJs(); showToast("已导出", "ok"); }
    catch (e) { showToast("导出失败: " + e.message, "err"); }
  });
  toolbar.appendChild(exportAllJsBtn);

  const exportBackupBtn = document.createElement("button");
  exportBackupBtn.className = "btn-secondary";
  exportBackupBtn.style.fontSize = "12px";
  exportBackupBtn.textContent = "💾 备份 (json)";
  exportBackupBtn.addEventListener("click", () => {
    try { exportBackupJson(); showToast("已导出备份", "ok"); }
    catch (e) { showToast("导出失败: " + e.message, "err"); }
  });
  toolbar.appendChild(exportBackupBtn);

  const importBtn = document.createElement("button");
  importBtn.className = "btn-secondary";
  importBtn.style.fontSize = "12px";
  importBtn.textContent = "📥 导入备份";
  const importInput = document.createElement("input");
  importInput.type = "file"; importInput.accept = ".json,application/json"; importInput.style.display = "none";
  importInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importBackupJson(f);
    e.target.value = "";
  });
  importBtn.addEventListener("click", () => importInput.click());
  toolbar.appendChild(importBtn);
  toolbar.appendChild(importInput);

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn-secondary";
  resetBtn.style.fontSize = "12px";
  resetBtn.style.borderColor = "rgba(239,83,80,.35)";
  resetBtn.style.color = "#fca5a5";
  resetBtn.textContent = "🗑 重置全部";
  resetBtn.addEventListener("click", resetAllConfig);
  toolbar.appendChild(resetBtn);
  decoderList.appendChild(toolbar);

  const all = getAllDecoders();
  const ids = Object.keys(all);
  if (!ids.length) {
    const e = document.createElement("div");
    e.className = "config-empty";
    e.textContent = "暂无算法。";
    decoderList.appendChild(e);
    return;
  }
  ids.sort((a, b) => {
    const ca = userDecoders[a] ? 0 : 1;
    const cb = userDecoders[b] ? 0 : 1;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });

  ids.forEach((id) => {
    const d = all[id];
    const isOverridden = !!userDecoders[id];
    const isBuiltinOriginal = !isOverridden && !!BUILTIN_DECODERS[id];
    const isCustomPure = !BUILTIN_DECODERS[id];

    const item = document.createElement("div");
    item.className = "config-item";

    const comp = isOverridden ? getCompiled(id, userDecoders[id]) : { error: null };
    const errTag = comp.error ? `<span class="badge-error">编译错误</span>` : "";
    const encTag = d.encode ? `<span class="badge-keys">含加密函数</span>` : "";
    let typeTag = "";
    if (isCustomPure) typeTag = `<span class="badge-file">自定义</span>`;
    else if (isOverridden) typeTag = `<span class="badge-header">内置</span><span class="badge-keys">已覆盖</span>`;
    else typeTag = `<span class="badge-header">内置</span>`;

    const libsTag = (d.libs && d.libs.length)
      ? d.libs.map((n) => {
          const ok = loadedLibs.has(n);
          const color = ok ? "#86efac" : "#fca5a5";
          const bg = ok ? "rgba(34,140,60,.2)" : "rgba(239,83,80,.2)";
          return `<span style="background:${bg};color:${color};padding:2px 8px;border-radius:5px;font-size:10.5px;font-weight:500;">🔗 ${escapeHtml(n)}</span>`;
        }).join("")
      : "";

    const src = isOverridden ? userDecoders[id].code : (BUILTIN_DECODERS[id]?.code || "");
    const preview = (src || "").split("\n")[0].slice(0, 80) + ((src || "").includes("\n") ? "…" : "");

    const actions = [`<button data-action="export">📤 导出</button>`];
    actions.push(`<button data-action="edit">编辑</button>`);
    if (isOverridden && BUILTIN_DECODERS[id]) actions.push(`<button data-action="reset" title="恢复为内置">重置</button>`);
    if (isOverridden || isCustomPure) actions.push(`<button data-action="delete" class="danger">删除</button>`);

    item.innerHTML = `
      <div class="config-item-main">
        <div class="config-item-title">${escapeHtml(d.label)} <span class="config-item-id">${escapeHtml(id)}</span>${typeTag}${encTag}${libsTag}${errTag}</div>
        <div class="config-item-preview">${escapeHtml(preview)}</div>
      </div>
      <div class="config-item-actions">${actions.join("")}</div>
    `;

    item.querySelector('[data-action="export"]').addEventListener("click", () => {
      try { exportSingleDecoderJs(id); showToast(`已导出「${id}」`, "ok"); }
      catch (e) { showToast("导出失败: " + e.message, "err"); }
    });
    item.querySelector('[data-action="edit"]').addEventListener("click", () => editDecoder(id));

    const resetBtn2 = item.querySelector('[data-action="reset"]');
    if (resetBtn2) resetBtn2.addEventListener("click", () => {
      if (!confirm(`恢复「${id}」为内置版本？`)) return;
      delete userDecoders[id];
      _compiledFns.delete(id);
      if (!saveJSON(LS_KEYS.userDecoders, userDecoders)) return;
      refreshConfig();
      renderDecoderList();
      showToast(`已重置「${id}」`, "ok");
    });

    const delBtn = item.querySelector('[data-action="delete"]');
    if (delBtn) delBtn.addEventListener("click", () => {
      const isBuiltinOverride = !!BUILTIN_DECODERS[id];
      const msg = isBuiltinOverride ? `删除对「${id}」的覆盖（恢复为内置版本）？` : `删除自定义算法「${id}」？`;
      if (!confirm(msg)) return;
      delete userDecoders[id];
      _compiledFns.delete(id);
      if (!saveJSON(LS_KEYS.userDecoders, userDecoders)) return;
      refreshConfig();
      renderDecoderList();
      showToast(`已删除「${id}」`, "ok");
    });

    decoderList.appendChild(item);
  });
}

function editDecoder(id) {
  const all = getAllDecoders();
  const d = all[id];
  if (!d) return;
  const isOverridden = !!userDecoders[id];
  const src = isOverridden ? userDecoders[id] : (BUILTIN_DECODERS[id] || { code: "", encode: "" });
  editingDecoderId = id;
  decoderIdInput.value = id;
  decoderIdInput.disabled = true;
  decoderLabelInput.value = d.label || "";
  decoderCodeInput.value = src.code || "";
  decoderEncodeInput.value = src.encode || "";
  const libsInput = document.getElementById("decoderLibsInput");
  if (libsInput) libsInput.value = (userDecoders[id]?.libs || (BUILTIN_DECODERS[id]?.libs) || []).join(", ");
  fillTemplateSelect();
  decoderTemplateSelect.value = "";
  decoderFormError.style.display = "none";
  decoderForm.style.display = "block";
  addDecoderBtn.style.display = "none";
  decoderForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideDecoderForm() {
  decoderForm.style.display = "none";
  decoderIdInput.disabled = false;
  editingDecoderId = null;
  addDecoderBtn.style.display = "";
  decoderFormError.style.display = "none";
}
function showDecoderError(msg) {
  decoderFormError.textContent = msg;
  decoderFormError.style.display = "block";
}
addDecoderBtn.addEventListener("click", () => {
  editingDecoderId = null;
  decoderIdInput.value = "";
  decoderIdInput.disabled = false;
  decoderLabelInput.value = "";
  decoderCodeInput.value = "";
  decoderEncodeInput.value = "";
  const libsInput = document.getElementById("decoderLibsInput");
  if (libsInput) libsInput.value = "";
  decoderFormError.style.display = "none";
  decoderForm.style.display = "block";
  addDecoderBtn.style.display = "none";
  fillTemplateSelect();
  decoderTemplateSelect.value = "";
  setTimeout(() => decoderIdInput.focus(), 50);
});
cancelDecoderBtn.addEventListener("click", hideDecoderForm);
if (decoderTemplateSelect) {
  decoderTemplateSelect.addEventListener("change", (e) => {
    const id = e.target.value;
    if (!id) return;
    const t = getTemplates()[id];
    if (!t) return;
    decoderCodeInput.value = t.code;
    decoderEncodeInput.value = t.encode || "";
    if (!decoderLabelInput.value.trim()) decoderLabelInput.value = t.label || id;
  });
}
function fillTemplateSelect() {
  if (!decoderTemplateSelect) return;
  const cur = decoderTemplateSelect.value;
  decoderTemplateSelect.innerHTML = '<option value="">-- 手动填写 --</option>';
  const templates = getTemplates();
  for (const [id, t] of Object.entries(templates)) {
    const o = document.createElement("option");
    o.value = id; o.textContent = t.label || id;
    decoderTemplateSelect.appendChild(o);
  }
  decoderTemplateSelect.value = cur;
}
saveDecoderBtn.addEventListener("click", () => {
  const id = editingDecoderId || decoderIdInput.value.trim();
  const label = decoderLabelInput.value.trim();
  const code = decoderCodeInput.value;
  const encode = decoderEncodeInput.value.trim();
  if (!id) return showDecoderError("请填写 ID");
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id)) return showDecoderError("ID 必须是合法 JS 标识符");
  if (!editingDecoderId && getAllDecoders()[id]) return showDecoderError(`"${id}" 已存在`);
  if (!label) return showDecoderError("请填写名称");
  if (!code.trim()) return showDecoderError("请填写代码");
  const comp = compileDecoderCode(code);
  if (comp.error) return showDecoderError("代码编译失败：\n" + comp.error);
  if (encode) {
    const encodeComp = compileDecoderCode(encode);
    if (encodeComp.error) return showDecoderError("加密函数编译失败：\n" + encodeComp.error);
  }
  const libsInput = document.getElementById("decoderLibsInput");
  const libs = libsInput
    ? libsInput.value.split(",").map((s) => s.trim()).filter(Boolean)
    : (userDecoders[id]?.libs || []);
  const wasEditing = !!editingDecoderId;
  userDecoders[id] = { label, code, encode, libs, cdn: userDecoders[id]?.cdn || [] };
  _compiledFns.delete(id);
  if (!saveJSON(LS_KEYS.userDecoders, userDecoders)) return showDecoderError("localStorage 写入失败");
  refreshConfig();
  renderDecoderList();
  hideDecoderForm();
  if (state.har) {
    rebuildEntryList();
    if (state.currentIndex >= 0) renderDetail();
  }
  showToast(wasEditing ? `已更新「${label}」` : `已添加「${label}」`, "ok");
});

// ---------- 导入外部算法 JS ----------
function mergeRules(existing, incoming) {
  const map = new Map();
  const keyOf = (r) => `${r.isRegex ? "re:" : "host:"}${String(r.pattern || "").toLowerCase()}`;
  for (const r of existing || []) map.set(keyOf(r), r);
  for (const r of incoming || []) if (r && r.pattern) map.set(keyOf(r), r);
  return [...map.values()];
}
async function importDecoderScripts(files) {
  let totalDec = 0, totalRules = 0, totalTpl = 0;
  for (const file of files) {
    if (!/\.js$/i.test(file.name) && file.type !== "application/javascript") {
      showToast(`跳过非 JS 文件: ${file.name}`, "err");
      continue;
    }
    let code;
    try { code = await file.text(); }
    catch (e) { showToast(`读取「${file.name}」失败: ${e.message}`, "err"); continue; }
    // 清空临时全局，避免不同文件互相污染
    try { delete window.HAR_DECODERS; } catch {}
    try { delete window.HAR_RULES; } catch {}
    try { delete window.HAR_TEMPLATES; } catch {}
    try {
      await loadScriptViaBlob("import:" + file.name, code);
    } catch (e) {
      showToast(`执行「${file.name}」失败: ${e.message}`, "err");
      continue;
    }
    const decoders = window.HAR_DECODERS;
    const rules = window.HAR_RULES;
    const templates = window.HAR_TEMPLATES;
    try { delete window.HAR_DECODERS; } catch {}
    try { delete window.HAR_RULES; } catch {}
    try { delete window.HAR_TEMPLATES; } catch {}

    if (decoders && typeof decoders === "object") {
      for (const [id, d] of Object.entries(decoders)) {
        if (!d || typeof d.code !== "string") continue;
        userDecoders[id] = {
          label: d.label || id,
          code: d.code,
          encode: typeof d.encode === "string" ? d.encode : "",
          libs: Array.isArray(d.libs) ? d.libs : [],
          cdn: d.cdn || [],
        };
        _compiledFns.delete(id);
        totalDec++;
      }
    }
    if (Array.isArray(rules)) {
      fileRules = mergeRules(fileRules, rules);
      totalRules += rules.length;
    }
    if (templates && typeof templates === "object") {
      for (const [id, t] of Object.entries(templates)) {
        if (!t || typeof t.code !== "string") continue;
        userTemplates[id] = t;
        totalTpl++;
      }
    }
  }
  if (totalDec) saveJSON(LS_KEYS.userDecoders, userDecoders);
  if (totalRules) saveJSON(LS_KEYS.rules, fileRules);
  if (totalTpl) saveJSON(LS_KEYS.templates, userTemplates);
  refreshConfig();
  renderDecoderList();
  fillTemplateSelect();
  if (state.har) rebuildEntryList();
  showToast(`导入完成：${totalDec} 个算法 / ${totalRules} 条规则 / ${totalTpl} 个模板`, "ok");
}

// ---------- 算法导出 / 备份 ----------
const _EXPORT_PRELUDE = `// ===== 内置依赖（导出后独立运行）=====
function isJsonLike(s) { const t = s.trim(); return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]")); }
function isFormLike(s) { const t = s.trim(); if (!t.includes("=") || t.startsWith("{") || t.startsWith("[")) return false; return /^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(t); }
function tryBase64(s) { if (typeof s !== "string") return null; if (s.length < 8 || s.length % 4 !== 0) return null; if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null; try { const bin = atob(s); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); const t = new TextDecoder("utf-8", { fatal: true }).decode(b); if (/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/.test(t)) return null; return t; } catch { return null; } }
function smartDecodeValue(v, d) { d = d || 0; if (d > 6) return v; if (v == null || typeof v !== "object") { if (typeof v !== "string") return v; let c = v; if (/%[0-9A-Fa-f]{2}/.test(c)) { try { const r = decodeURIComponent(c); if (r !== c) c = r; } catch {} } const b = tryBase64(c); if (b !== null) c = b; if (typeof c === "string" && isJsonLike(c)) { try { return smartDecodeValue(JSON.parse(c), d + 1); } catch {} } return c; } if (Array.isArray(v)) return v.map(x => smartDecodeValue(x, d + 1)); const o = {}; for (const k of Object.keys(v)) o[k] = smartDecodeValue(v[k], d + 1); return o; }
function smartDecodeText(t) { if (t == null) return t; const s = String(t).trim(); if (!s) return s; if (isJsonLike(s)) { try { return smartDecodeValue(JSON.parse(s), 0); } catch {} } if (isFormLike(s)) { const o = {}; new URLSearchParams(s).forEach((v, n) => { const p = smartDecodeValue(v, 0); if (Object.prototype.hasOwnProperty.call(o, n)) { if (!Array.isArray(o[n])) o[n] = [o[n]]; o[n].push(p); } else o[n] = p; }); return o; } const b = tryBase64(s); if (b !== null) { const i = b.trim(); if (isJsonLike(i)) { try { return smartDecodeValue(JSON.parse(i), 0); } catch {} } if (isFormLike(i)) { const o = {}; new URLSearchParams(i).forEach((v, n) => { const p = smartDecodeValue(v, 0); if (Object.prototype.hasOwnProperty.call(o, n)) { if (!Array.isArray(o[n])) o[n] = [o[n]]; o[n].push(p); } else o[n] = p; }); return o; } return b; } if (/%[0-9A-Fa-f]{2}/.test(s)) { try { const r = decodeURIComponent(s); if (r !== s) return r; } catch {} } return s; }
function base64ToBytes(b64) { const bin = atob(String(b64).trim()); const o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
function bytesToBase64Str(bytes) { let bin = ""; const chunk = 0x8000; for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)); return btoa(bin); }
function isPlainObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
// =====================================
`;
function _escTemplate(s) {
  return String(s || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}
function exportAllDecodersJs() {
  const all = getAllDecoders();
  const ids = Object.keys(all);
  const lines = [
    "// ===== 全部算法导出（可作为外部导入的算法 JS 使用）=====",
    `// 导出于 ${new Date().toISOString()}`,
    "",
    _EXPORT_PRELUDE,
    "",
    "window.HAR_DECODERS = {",
  ];
  for (const id of ids) {
    const d = all[id];
    const isCustom = !!userDecoders[id];
    const src = isCustom ? userDecoders[id] : { code: BUILTIN_DECODERS[id].code, encode: BUILTIN_DECODERS[id].encode || "" };
    lines.push(`  ${id}: {`);
    lines.push(`    label: ${JSON.stringify(d.label)},`);
    lines.push(`    cdn: [],`);
    if (d.libs?.length) lines.push(`    libs: ${JSON.stringify(d.libs)},`);
    lines.push(`    code: \`${_escTemplate(src.code)}\`,`);
    if (src.encode) lines.push(`    encode: \`${_escTemplate(src.encode)}\`,`);
    lines.push(`  },`);
  }
  lines.push("};");
  lines.push("");
  const blob = new Blob([lines.join("\n")], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `decoders-all-${Date.now()}.js`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportSingleDecoderJs(id) {
  const all = getAllDecoders();
  const d = all[id];
  if (!d) throw new Error("算法不存在: " + id);
  const isCustom = !!userDecoders[id];
  const src = isCustom ? userDecoders[id] : { code: BUILTIN_DECODERS[id].code, encode: BUILTIN_DECODERS[id].encode || "" };
  const lines = [
    `// 单独导出：${d.label}（${id}）`,
    `window.HAR_DECODERS = window.HAR_DECODERS || {};`,
    `window.HAR_DECODERS[${JSON.stringify(id)}] = {`,
    `  label: ${JSON.stringify(d.label)},`,
    `  cdn: [],`,
  ];
  if (d.libs?.length) lines.push(`  libs: ${JSON.stringify(d.libs)},`);
  lines.push(`  code: \`${_escTemplate(src.code)}\`,`);
  if (src.encode) lines.push(`  encode: \`${_escTemplate(src.encode)}\`,`);
  lines.push("};", "");
  const blob = new Blob([lines.join("\n")], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `decoder-${id}-${Date.now()}.js`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportBackupJson() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userDecoders,
    rules: fileRules,
    templates: userTemplates,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `har-decrypt-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function importBackupJson(file) {
  file.text().then((text) => {
    let data;
    try { data = JSON.parse(text); } catch (e) { showToast("JSON 解析失败: " + e.message, "err"); return; }
    if (!data || typeof data !== "object") { showToast("文件格式无效", "err"); return; }
    if (!confirm("将覆盖当前的算法、规则和模板。继续？")) return;
    if (data.userDecoders && typeof data.userDecoders === "object") saveJSON(LS_KEYS.userDecoders, data.userDecoders);
    if (Array.isArray(data.rules)) saveJSON(LS_KEYS.rules, data.rules);
    if (data.templates && typeof data.templates === "object") saveJSON(LS_KEYS.templates, data.templates);
    reloadConfig();
    showToast("已导入备份", "ok");
  }).catch((e) => showToast("读取失败: " + e.message, "err"));
}
function resetAllConfig() {
  if (!confirm("清空所有自定义算法、规则、模板（库不受影响）。继续？")) return;
  localStorage.removeItem(LS_KEYS.userDecoders);
  localStorage.removeItem(LS_KEYS.rules);
  localStorage.removeItem(LS_KEYS.templates);
  refreshConfig();
  reloadConfig();
  showToast("已重置", "ok");
}

// ---------- 库 UI ----------
async function handleLibFiles(files) {
  for (const file of files) {
    if (!/\.js$/i.test(file.name) && file.type !== "application/javascript") {
      showToast(`跳过非 JS 文件: ${file.name}`, "err");
      continue;
    }
    try {
      const code = await file.text();
      const defName = guessLibName(file.name);
      const name = prompt(`「${file.name}」的库名（全局变量名）:`, defName);
      if (!name) continue;
      await saveLib(name.trim(), code);
      showToast(`已保存「${name.trim()}」（用到时自动加载）`, "ok");
    } catch (e) {
      showToast(`「${file.name}」失败: ${e.message}`, "err");
    }
  }
  await renderLibList();
}

async function renderLibList() {
  const list = document.getElementById("libList");
  if (!list) return;
  list.innerHTML = "";
  try {
    await refreshLibIndex();
  } catch (e) {
    const err = document.createElement("div");
    err.className = "config-empty";
    err.textContent = "读取 IndexedDB 失败: " + e.message;
    list.appendChild(err);
    return;
  }
  const names = [..._libIndex.keys()].sort();
  if (!names.length) {
    const e = document.createElement("div");
    e.className = "config-empty";
    e.textContent = "还没有保存的库。把 .js 文件拖到上方，或粘贴代码保存。";
    list.appendChild(e);
    return;
  }
  for (const name of names) {
    const lib = _libIndex.get(name);
    const loaded = loadedLibs.has(name);
    const globals = [...(pluginGlobals.get(name) || [])].filter(isValidParamName);
    const badge = loaded ? `<span class="badge-file">已加载</span>` : `<span class="badge-error">按需</span>`;
    const libTags = globals.map((n) => `<span class="badge-keys">${escapeHtml(n)}</span>`).join("");
    const kb = (lib.size / 1024).toFixed(1);
    const item = document.createElement("div");
    item.className = "config-item";
    item.innerHTML = `
      <div class="config-item-main">
        <div class="config-item-title">${escapeHtml(name)} <span class="config-item-id">${kb} KB</span>${badge}${libTags}</div>
        <div class="config-item-preview">${escapeHtml((lib.code || "").slice(0, 100))}…</div>
      </div>
      <div class="config-item-actions">
        <button data-action="reload" ${loaded ? "" : "disabled"}>重新加载</button>
        <button data-action="delete" class="danger">删除</button>
      </div>
    `;
    item.querySelector('[data-action="reload"]').addEventListener("click", async () => {
      try { await reloadLib(name); await renderLibList(); showToast(`已重载「${name}」`, "ok"); }
      catch (e) { showToast("重载失败: " + e.message, "err"); }
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm(`删除库「${name}」？`)) return;
      await deleteLib(name);
      await renderLibList();
      showToast(`已删除「${name}」`, "ok");
    });
    list.appendChild(item);
  }
}

function initLibUI() {
  const dropZone = document.getElementById("libDropZone");
  const fileInput = document.getElementById("libFileInput");
  const nameInput = document.getElementById("libNameInput");
  const codeInput = document.getElementById("libCodeInput");
  const saveBtn = document.getElementById("saveLibBtn");
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.remove("dragover");
  });
  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault(); e.stopPropagation();
    dropZone.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) await handleLibFiles(files);
  });
  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files || []);
    if (files.length) await handleLibFiles(files);
    fileInput.value = "";
  });
  if (saveBtn && nameInput && codeInput) {
    saveBtn.addEventListener("click", async () => {
      try {
        const name = nameInput.value.trim();
        const code = codeInput.value;
        await saveLib(name, code);
        nameInput.value = "";
        codeInput.value = "";
        await renderLibList();
        showToast(`已保存「${name}」（用到时自动加载）`, "ok");
      } catch (e) { showToast(e.message, "err"); }
    });
    codeInput.addEventListener("dragover", (e) => e.preventDefault());
    codeInput.addEventListener("drop", async (e) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length) await handleLibFiles(files);
      else {
        const text = e.dataTransfer.getData("text");
        if (text) codeInput.value = text;
      }
    });
  }

  const reloadBtn = document.getElementById("reloadPluginsBtn");
  if (reloadBtn) reloadBtn.addEventListener("click", async () => {
    try { await reloadAllLoadedLibs(); await renderLibList(); showToast("已重载所有已加载的库", "ok"); }
    catch (e) { showToast("重载失败: " + e.message, "err"); }
  });
}