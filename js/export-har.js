// ============================================================
// export-har.js — 导出筛选 HAR（导出前按规则自动解密）
// ============================================================

// 对单个 entry 按规则解密并写回
async function decryptEntryAndWriteBack(e, rule) {
  let count = 0;

  // 请求体
  const reqText = getPostText(e);
  if (reqText && e.request?.postData) {
    const { decoder, keys } = getScopeConfig("req", rule);
    try {
      const result = await runDecoder(decoder, reqText, keys);
      if (typeof result === "string") {
        e.request.postData.text = result;
        delete e.request.postData.encoding;
      } else {
        e.request.postData.text = JSON.stringify(result, null, 2);
        delete e.request.postData.encoding;
        e.request.postData.mimeType = "application/json";
      }
      if ("size" in e.request.postData) e.request.postData.size = new Blob([e.request.postData.text]).size;
      count++;
    } catch (err) { console.warn("[export] req 解密失败:", err.message); }
  }

  // 响应体
  const resText = getResponseText(e);
  if (resText && e.response?.content) {
    const { decoder, keys } = getScopeConfig("res", rule);
    try {
      const result = await runDecoder(decoder, resText, keys);
      if (typeof result === "string") {
        e.response.content.text = result;
        delete e.response.content.encoding;
      } else {
        e.response.content.text = JSON.stringify(result, null, 2);
        delete e.response.content.encoding;
        e.response.content.mimeType = "application/json";
      }
      if ("size" in e.response.content) e.response.content.size = new Blob([e.response.content.text]).size;
      count++;
    } catch (err) { console.warn("[export] res 解密失败:", err.message); }
  }

  return count;
}

// 批量：按 indices 指定的原始索引依次解密
async function applyDecryptToHar(harObj, indices) {
  let count = 0;
  for (const i of indices) {
    const e = harObj.log.entries[i];
    if (!e) continue;
    const rule = matchRule(e.request?.url || "");
    count += await decryptEntryAndWriteBack(e, rule);
  }
  return count;
}

exportListBtn.addEventListener("click", async () => {
  if (!state.har) return;
  if (!state.entries.length) { alert("当前过滤无结果，无法导出。"); return; }

  exportListBtn.disabled = true;
  const oldText = exportListBtn.textContent;
  exportListBtn.textContent = "⏳ 正在按规则解密…";

  try {
    const outHar = JSON.parse(JSON.stringify(state.har));
    const indices = state.entries.map((e) => e.originalIndex);

    // 按规则批量解密
    const decrypted = await applyDecryptToHar(outHar, indices);

    // 只保留筛选出的条目
    const keep = new Set(indices);
    outHar.log.entries = outHar.log.entries.filter((_, i) => keep.has(i));

    const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `capture.filtered-${Date.now()}.har`;
    a.click();
    URL.revokeObjectURL(a.href);

    showToast(`已导出 ${keep.size} 条请求（写回 ${decrypted} 处解密结果）`, "ok");
  } catch (e) {
    showToast("导出失败: " + e.message, "err");
  } finally {
    exportListBtn.disabled = false;
    exportListBtn.textContent = oldText;
  }
});