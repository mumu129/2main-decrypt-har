// ============================================================
// core.js — 基础工具 / 智能解码 / HAR 原始值提取 / JSON 渲染
// ============================================================

// ---------- 基础工具 ----------
function base64ToBytes(b64) {
  const bin = atob(String(b64).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64Str(bytes) {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function showToast(msg, type = "") {
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.transition = "opacity .3s";
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 350);
  }, 1800);
}
function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } catch { return iso; }
}
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    && !(v instanceof Uint8Array) && !(v instanceof ArrayBuffer);
}
function valueToText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// ---------- 智能解码 ----------
function isJsonLike(s) {
  const t = s.trim();
  return (t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"));
}
function isFormLike(s) {
  const t = s.trim();
  if (!t.includes("=") || t.startsWith("{") || t.startsWith("[")) return false;
  return /^[^=&]+=[^&]*(?:&[^=&]+=[^&]*)*$/.test(t);
}
function tryBase64(s) {
  if (typeof s !== "string") return null;
  if (s.length < 8 || s.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return null;
  try {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) return null;
    return text;
  } catch { return null; }
}
function smartDecodeValue(v, depth = 0) {
  if (depth > 6) return v;
  if (v === null || v === undefined) return v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => smartDecodeValue(x, depth + 1));
  if (typeof v === "object") {
    const out = {};
    for (const [k, vv] of Object.entries(v)) out[k] = smartDecodeValue(vv, depth + 1);
    return out;
  }
  let cur = v;
  if (/%[0-9A-Fa-f]{2}/.test(cur)) {
    try {
      const d = decodeURIComponent(cur);
      if (d !== cur) cur = d;
    } catch {}
  }
  const b64 = tryBase64(cur);
  if (b64 !== null) cur = b64;
  if (typeof cur === "string" && isJsonLike(cur)) {
    try { return smartDecodeValue(JSON.parse(cur), depth + 1); } catch {}
  }
  return cur;
}
function smartDecodeText(text) {
  if (text == null) return text;
  const t = String(text).trim();
  if (!t) return t;
  if (isJsonLike(t)) {
    try { return smartDecodeValue(JSON.parse(t)); } catch {}
  }
  if (isFormLike(t)) {
    const out = {};
    new URLSearchParams(t).forEach((value, name) => {
      const parsed = smartDecodeValue(value);
      if (Object.prototype.hasOwnProperty.call(out, name)) {
        if (!Array.isArray(out[name])) out[name] = [out[name]];
        out[name].push(parsed);
      } else out[name] = parsed;
    });
    return out;
  }
  const b64 = tryBase64(t);
  if (b64 !== null) {
    const inner = b64.trim();
    if (isJsonLike(inner)) {
      try { return smartDecodeValue(JSON.parse(inner)); } catch {}
    }
    if (isFormLike(inner)) {
      const out = {};
      new URLSearchParams(inner).forEach((value, name) => {
        const parsed = smartDecodeValue(value);
        if (Object.prototype.hasOwnProperty.call(out, name)) {
          if (!Array.isArray(out[name])) out[name] = [out[name]];
          out[name].push(parsed);
        } else out[name] = parsed;
      });
      return out;
    }
    return b64;
  }
  if (/%[0-9A-Fa-f]{2}/.test(t)) {
    try {
      const d = decodeURIComponent(t);
      if (d !== t) return d;
    } catch {}
  }
  return t;
}

// ---------- HAR 原始值提取 ----------
function getQueryRawText(entry) {
  try { return new URL(entry.request.url).search.replace(/^\?/, ""); }
  catch { return ""; }
}
function getPostText(entry) {
  const pd = entry?.request?.postData;
  if (!pd) return null;
  if (Array.isArray(pd.params) && pd.params.length && !pd.text) {
    return pd.params
      .map((p) => {
        if (!p?.name) return "";
        const v = p.value == null ? "" : String(p.value);
        return `${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`;
      })
      .filter(Boolean)
      .join("&");
  }
  return pd.text || null;
}
function getResponseText(entry) {
  return entry?.response?.content?.text || null;
}

// ---------- 时间戳 ----------
function detectTimestamp(value) {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return null;
    const s = String(value);
    if (s.length === 10 && s[0] === "1") return "s";
    if (s.length === 13 && s[0] === "1") return "ms";
    return null;
  }
  if (typeof value === "string") {
    if (value.length === 10 && /^1\d{9}$/.test(value)) return "s";
    if (value.length === 13 && /^1\d{12}$/.test(value)) return "ms";
  }
  return null;
}
function formatTimestamp(value, unit) {
  const ms = unit === "s" ? Number(value) * 1000 : Number(value);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function renderJsonWithTs(data) {
  const pre = document.createElement("pre");
  pre.className = "json-view";
  function add(str, cls) {
    if (!str) return;
    if (cls) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = str;
      pre.appendChild(s);
    } else pre.appendChild(document.createTextNode(str));
  }
  function walk(v, indent) {
    const pad = "  ".repeat(indent);
    if (v === null) { add("null", "j-null"); return; }
    if (v === undefined) { add("undefined", "j-null"); return; }
    if (typeof v === "string") {
      add(JSON.stringify(v), "j-string");
      const unit = detectTimestamp(v);
      if (unit) add(`  /* ${formatTimestamp(v, unit)} */`, "j-ts");
      return;
    }
    if (typeof v === "number") {
      add(String(v), "j-number");
      const unit = detectTimestamp(v);
      if (unit) add(`  /* ${formatTimestamp(v, unit)} */`, "j-ts");
      return;
    }
    if (typeof v === "boolean") { add(String(v), "j-bool"); return; }
    if (Array.isArray(v)) {
      if (v.length === 0) { add("[]"); return; }
      add("[\n");
      v.forEach((item, i) => {
        add(pad + "  ");
        walk(item, indent + 1);
        if (i < v.length - 1) add(",");
        add("\n");
      });
      add(pad + "]");
      return;
    }
    if (typeof v === "object") {
      const keys = Object.keys(v);
      if (keys.length === 0) { add("{}"); return; }
      add("{\n");
      keys.forEach((k, i) => {
        add(pad + "  ");
        add(JSON.stringify(k), "j-key");
        add(": ");
        walk(v[k], indent + 1);
        if (i < keys.length - 1) add(",");
        add("\n");
      });
      add(pad + "}");
      return;
    }
    add(String(v));
  }
  walk(data, 0);
  return pre;
}

// ---------- 启动自检 ----------
console.log("%c[HAR-Decrypt] core 加载中", "color:#4fa3e0;font-weight:bold");
try {
  new Function("return 1")();
  console.log("%c[HAR-Decrypt] ✅ CSP 允许 new Function", "color:#7ddf7d");
} catch (e) {
  console.error("[HAR-Decrypt] ❌ CSP 拦截 new Function:", e.message);
}