// ============================================================
// app.js — 入口：HAR 加载 / 拖拽 / 初始化
// ============================================================

async function loadHarFile(file) {
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在读取 ${sizeMB}MB…</div>`;
  await new Promise((r) => setTimeout(r, 30));
  try {
    const text = await file.text();
    detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在解析…</div>`;
    await new Promise((r) => setTimeout(r, 30));
    const har = JSON.parse(text);
    if (!har.log?.entries) throw new Error("不是有效的 HAR 文件");
    state.har = har;
    state.marks.clear();
    state.entryMeta.clear();
    state.currentIndex = -1;
    state.renderedCount = 0;
    pinnedHeaders.clear();
    detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在构建索引…</div>`;
    await new Promise((r) => setTimeout(r, 30));
        resetAllFilters();
    buildFilterOptions();
    rebuildEntryList();
    renderDetail();
    exportListBtn.disabled = false;
    showToast(`已加载 ${file.name}（${har.log.entries.length} 条）`, "ok");
  
  } catch (err) {
    detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>';
    alert("读取 HAR 失败: " + err.message);
  }
}
harInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await loadHarFile(file);
  e.target.value = "";
});

// ========== 拖拽导入 ==========
let dragOverlay = null, dragCounter = 0;
function showDragOverlay() {
  if (!dragOverlay) {
    dragOverlay = document.createElement("div");
    dragOverlay.className = "drag-overlay";
    dragOverlay.innerHTML = `<div class="drag-overlay-inner"><div class="drag-icon">📥</div><div class="drag-text">松开鼠标，导入 HAR 文件</div><div class="drag-hint">支持 .har / .json</div></div>`;
    document.body.appendChild(dragOverlay);
  }
  dragOverlay.style.display = "flex";
}
function hideDragOverlay() { if (dragOverlay) dragOverlay.style.display = "none"; }
function hasFiles(e) { return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"); }
document.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter++; if (dragCounter === 1) showDragOverlay(); });
document.addEventListener("dragover", (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
document.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; hideDragOverlay(); } });
document.addEventListener("drop", async (e) => {
  if (!hasFiles(e)) return;
  if (e.target.closest?.("#libDropZone, #libCodeInput")) return;
  e.preventDefault(); dragCounter = 0; hideDragOverlay();
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  if (!/\.(har|json)$/i.test(file.name) && file.type !== "application/json") { showToast("请拖入 .har 或 .json", "err"); return; }
  await loadHarFile(file);
});

// ========== 依赖自检 ==========
(function dependencyCheck() {
  const names = [
    "escapeHtml", "showToast", "$", "state", "getScopeConfig",
    "getAllDecoders", "buildListItem", "rebuildEntryList",
    "renderDecoderList", "runDecoder", "runEncoder", "matchRule",
    "upsertRuleScope", "renderDetail", "refreshLibIndex", "reloadConfig",
  ];
  const missing = [];
  for (const n of names) {
    let ok = false;
    try { ok = typeof eval(n) !== "undefined"; } catch { ok = false; }
    if (!ok) missing.push(n);
  }
  if (missing.length) {
    console.error(
      "%c[HAR-Decrypt] ❌ 以下依赖未加载（检查 js/ 下对应文件是否存在、<script> 顺序是否正确）：\n  " +
        missing.join(", "),
      "color:#ef5350;font-weight:bold",
    );
  } else {
    console.log("%c[HAR-Decrypt] ✅ 所有依赖已加载", "color:#7ddf7d;font-weight:bold");
  }
})();

// ========== 初始化 ==========
(async () => {
  exportListBtn.disabled = true;
  try { await refreshLibIndex(); }
  catch (e) { console.error("[HAR-Decrypt] 读取 IndexedDB 失败:", e); }
  reloadConfig();
  fillTemplateSelect();
  initLibUI();
  try { await renderLibList(); } catch {}
  console.log("%c[HAR-Decrypt] ✅ 初始化完成（规则是唯一密钥存储）", "color:#7ddf7d;font-weight:bold");
})();