// ============================================================
// 启动自检
// ============================================================
console.log("%c[HAR-Decrypt] Panel 加载中", "color:#4fa3e0;font-weight:bold");
try {
  new Function("return 1")();
  console.log("%c[HAR-Decrypt] ✅ CSP 允许 new Function", "color:#7ddf7d");
} catch (e) {
  console.error("[HAR-Decrypt] ❌ CSP 拦截 new Function:", e.message);
}

// ================================================================
// 基础工具
// ================================================================
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

// ================================================================
// 智能解码（helper）
// ================================================================
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

// ================================================================
// HAR 原始值提取
// ================================================================
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

// ================================================================
// localStorage
// ================================================================
const LS_KEYS = {
  userDecoders: "har-decrypt:v1:userDecoders",
  rules: "har-decrypt:v1:rules",
  templates: "har-decrypt:v1:templates",
  seeded: "har-decrypt:v1:seeded",
};
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function saveJSON(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
    return true;
  } catch (e) {
    showToast("存储失败: " + (e.message || e), "err");
    return false;
  }
}
let userDecoders = {};
let fileRules = [];
let userTemplates = {};

// ================================================================
// IndexedDB：库存储
// ================================================================
const LIB_DB = "har-decrypt-libs";
const LIB_STORE = "libs";
let _libDB = null;
// _libIndex: name → { name, code, size, savedAt }（全量驻留内存，但不执行到 window）
const _libIndex = new Map();
// 已执行到 window 的库名
const loadedLibs = new Set();
// 库名 → 该库新增的全局名集合
const pluginGlobals = new Map();
// 防并发懒加载
const libLoadPromises = new Map();

function openLibDB() {
  if (_libDB) return Promise.resolve(_libDB);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(LIB_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(LIB_STORE)) {
        db.createObjectStore(LIB_STORE, { keyPath: "name" });
      }
    };
    req.onsuccess = () => { _libDB = req.result; resolve(_libDB); };
    req.onerror = () => reject(req.error);
  });
}
async function refreshLibIndex() {
  const db = await openLibDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIB_STORE, "readonly");
    const req = tx.objectStore(LIB_STORE).getAll();
    req.onsuccess = () => {
      _libIndex.clear();
      for (const lib of req.result || []) _libIndex.set(lib.name, lib);
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}
async function dbPutLib(lib) {
  const db = await openLibDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIB_STORE, "readwrite");
    tx.objectStore(LIB_STORE).put(lib);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function dbDeleteLib(name) {
  const db = await openLibDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIB_STORE, "readwrite");
    tx.objectStore(LIB_STORE).delete(name);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ================================================================
// 库执行 / 卸载 / 懒加载 / CRUD
// ================================================================
function snapshotWindowKeys() {
  return new Set(Object.getOwnPropertyNames(window));
}
function isValidParamName(name) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return false;
  try { new Function(name, ""); return true; } catch { return false; }
}
function loadScriptViaBlob(name, content) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([content], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const script = document.createElement("script");
    script.src = url;
    script.onload = () => { URL.revokeObjectURL(url); resolve(); };
    script.onerror = () => { URL.revokeObjectURL(url); reject(new Error("脚本执行出错: " + name)); };
    document.head.appendChild(script);
  });
}

function _unloadLibGlobals(name) {
  const keys = pluginGlobals.get(name);
  if (keys) for (const k of keys) { try { delete window[k]; } catch {} }
  pluginGlobals.delete(name);
  loadedLibs.delete(name);
}

async function _execLib(lib) {
  const before = snapshotWindowKeys();
  await loadScriptViaBlob(lib.name, lib.code);
  const set = pluginGlobals.get(lib.name) || new Set();
  for (const k of Object.getOwnPropertyNames(window)) {
    if (!before.has(k)) set.add(k);
  }
  pluginGlobals.set(lib.name, set);
  loadedLibs.add(lib.name);
  resetLibCache();
}

// 懒加载：缺哪个加载哪个（供 runDecoder / runEncoder 调用）
async function ensureLibsLoaded(libNames) {
  if (!libNames || !libNames.length) return;
  await Promise.all(libNames.map(async (name) => {
    if (loadedLibs.has(name)) return;
    if (libLoadPromises.has(name)) return libLoadPromises.get(name);
    const p = (async () => {
      try {
        const lib = _libIndex.get(name);
        if (!lib) throw new Error(`算法依赖库「${name}」未保存。请到「第三方库」Tab 添加其代码。`);
        await _execLib(lib);
        console.log(`[HAR-Decrypt] 📚 懒加载: ${name}`, [...(pluginGlobals.get(name) || [])].join(", "));
      } finally {
        libLoadPromises.delete(name);
      }
    })();
    libLoadPromises.set(name, p);
    return p;
  }));
}

// 保存：只写 IndexedDB + 更新内存索引，不执行
async function saveLib(name, code) {
  if (!name || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name))
    throw new Error("库名必须是合法 JS 标识符（如 CryptoJS）");
  if (!code || !String(code).trim())
    throw new Error("代码不能为空");
  const lib = { name, code: String(code), size: String(code).length, savedAt: Date.now() };
  await dbPutLib(lib);
  _libIndex.set(name, lib);
}

async function deleteLib(name) {
  await dbDeleteLib(name);
  _libIndex.delete(name);
  _unloadLibGlobals(name);
  resetLibCache();
}

async function reloadLib(name) {
  const lib = _libIndex.get(name);
  if (!lib) throw new Error("库不存在: " + name);
  _unloadLibGlobals(name);
  await _execLib(lib);
}

async function reloadAllLoadedLibs() {
  const names = [...loadedLibs];
  for (const n of names) _unloadLibGlobals(n);
  resetLibCache();
  await ensureLibsLoaded(names);
}

function guessLibName(filename) {
  let base = filename.replace(/\.js$/i, "").replace(/\.min$/i, "");
  base = base.replace(/[^A-Za-z0-9_$]/g, "_");
  if (!/^[A-Za-z_$]/.test(base)) base = "_" + base;
  return base || "MyLib";
}

// ================================================================
// 默认模板
// ================================================================
const DEFAULT_TEMPLATES = {
  base64Json: {
    label: "模板·Base64 文本 + JSON",
    code: `function(text, ctx) {
  return JSON.parse(atob(String(text).trim()));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return btoa(s);
}`,
  },
  gzipFix: {
    label: "模板·gzip 头修复 + 解压（输入 base64，jiem）",
    code: `function(text, ctx) {
  const bin = atob(String(text).trim());
  const t = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
  if (t.length < 8) throw new Error('数据长度 < 8');
  t[0] = 0x1f; t[1] = 0x8b; t[2] = 0x08; t[3] = 0x00;
  t[4] = 0x00; t[5] = 0x00; t[6] = 0x00; t[7] = 0x00;
  return JSON.parse(new TextDecoder().decode(pako.ungzip(t)));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const gz = pako.gzip(new TextEncoder().encode(s));
  let bin = '';
  for (let i = 0; i < gz.length; i++) bin += String.fromCharCode(gz[i]);
  return btoa(bin);
}`,
  },
  aesCbc: {
    label: "模板·AES-256-CBC（输入 base64，需 key + iv）",
    code: `async function(text, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥');
  if (!keys.iv) throw new Error('缺少 IV');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const bin = atob(String(text).trim());
  const cipher = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) cipher[i] = bin.charCodeAt(i);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-CBC' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: hexToBytes(keys.iv) }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
}`,
    encode: `async function(value, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥');
  if (!keys.iv) throw new Error('缺少 IV');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const plain = new TextEncoder().encode(s);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-CBC' }, false, ['encrypt']);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: hexToBytes(keys.iv) }, key, plain);
  const bytes = new Uint8Array(cipher);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}`,
  },
  aesGcm: {
    label: "模板·AES-256-GCM（iv(12) || ct || tag(16)）",
    code: `async function(text, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const bin = atob(String(text).trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const iv = keys.iv ? hexToBytes(keys.iv) : bytes.slice(0, 12);
  const ctAndTag = bytes.slice(iv.length);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ctAndTag);
  return JSON.parse(new TextDecoder().decode(plain));
}`,
    encode: `async function(value, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const plain = new TextEncoder().encode(s);
  const iv = keys.iv ? hexToBytes(keys.iv) : new Uint8Array(12);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-GCM' }, false, ['encrypt']);
  const ctAndTag = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(iv.length + ctAndTag.length);
  out.set(iv, 0);
  out.set(ctAndTag, iv.length);
  let bin = '';
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
}`,
  },
  xorByte: {
    label: "模板·单字节 XOR（输入 base64，需 key 0-255）",
    code: `function(text, ctx) {
  const keys = ctx?.keys || {};
  const k = Number(keys.key);
  if (!Number.isFinite(k)) throw new Error('缺少密钥');
  const bin = atob(String(text).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) ^ k;
  try { return JSON.parse(new TextDecoder().decode(out)); }
  catch { return new TextDecoder().decode(out); }
}`,
    encode: `function(value, ctx) {
  const keys = ctx?.keys || {};
  const k = Number(keys.key);
  if (!Number.isFinite(k)) throw new Error('缺少密钥');
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const src = new TextEncoder().encode(s);
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ^ k;
  let bin = '';
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
}`,
  },
};
function getTemplates() {
  return { ...DEFAULT_TEMPLATES, ...userTemplates };
}

// ================================================================
// 时间戳 / JSON 渲染
// ================================================================
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

// ================================================================
// 内置解码器（全部字符串 code，可被覆盖）
// ================================================================
const BUILTIN_DECODERS = {
  raw: {
    label: "智能解析（自动尝试 URL / Base64 / JSON / form）",
    libs: [],
    code: `function(text, ctx) {
  return smartDecodeText(text);
}`,
  },
  utf8: {
    label: "原样文本",
    libs: [],
    code: `function(text, ctx) {
  return typeof text === "string" ? text : String(text == null ? "" : text);
}`,
    encode: `function(value, ctx) {
  return typeof value === "string" ? value : JSON.stringify(value);
}`,
  },
  json: {
    label: "JSON 解析",
    libs: [],
    code: `function(text, ctx) {
  try { return JSON.parse(String(text)); } catch { return String(text); }
}`,
    encode: `function(value, ctx) {
  return JSON.stringify(value);
}`,
  },
  form: {
    label: "form-urlencoded 解析",
    libs: [],
    code: `function(text, ctx) {
  const t = String(text == null ? "" : text);
  if (!t) return t;
  const out = {};
  new URLSearchParams(t).forEach((value, name) => {
    const parsed = smartDecodeValue(value);
    if (Object.prototype.hasOwnProperty.call(out, name)) {
      if (!Array.isArray(out[name])) out[name] = [out[name]];
      out[name].push(parsed);
    } else out[name] = parsed;
  });
  return out;
}`,
    encode: `function(value, ctx) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return String(value);
  const parts = [];
  for (const [k, v] of Object.entries(value)) {
    const arr = Array.isArray(v) ? v : [v];
    for (const vv of arr) {
      const s = typeof vv === "string" ? vv : JSON.stringify(vv);
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(s));
    }
  }
  return parts.join("&");
}`,
  },
  base64: {
    label: "Base64 解码（文本）",
    libs: [],
    code: `function(text, ctx) {
  try { return atob(String(text).trim()); } catch { return String(text); }
}`,
    encode: `function(value, ctx) {
  return btoa(typeof value === "string" ? value : JSON.stringify(value));
}`,
  },
  base64Json: {
    label: "Base64 解码 + JSON 解析",
    libs: [],
    code: `function(text, ctx) {
  return JSON.parse(atob(String(text).trim()));
}`,
    encode: `function(value, ctx) {
  return btoa(JSON.stringify(value));
}`,
  },
  gzip: {
    label: "gzip 解压（输入 base64）",
    libs: [],
    code: `function(text, ctx) {
  return JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(base64ToBytes(String(text)))));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s)));
}`,
  },
  inflate: {
    label: "zlib inflate（输入 base64）",
    libs: [],
    code: `function(text, ctx) {
  return JSON.parse(new TextDecoder("utf-8").decode(pako.inflate(base64ToBytes(String(text)))));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return bytesToBase64Str(pako.deflate(new TextEncoder().encode(s)));
}`,
  },
  gzipFix: {
    label: "gzip 头修复 + 解压（输入 base64，jiem）",
    libs: [],
    code: `function(text, ctx) {
  const t = base64ToBytes(String(text));
  if (t.length < 8) throw new Error("长度 < 8");
  t[0] = 0x1f; t[1] = 0x8b; t[2] = 0x08; t[3] = 0x00;
  t[4] = 0x00; t[5] = 0x00; t[6] = 0x00; t[7] = 0x00;
  return JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(t)));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s)));
}`,
  },
  cookie: {
    label: "Cookie 解析",
    libs: [],
    code: `function(text, ctx) {
  const t = String(text).trim();
  if (!t) return t;
  const out = {};
  t.split(/;\\s*/).forEach((part) => {
    const eq = part.indexOf("=");
    if (eq <= 0) return;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (!k) return;
    out[k] = smartDecodeValue(v);
  });
  return Object.keys(out).length ? out : t;
}`,
    encode: `function(value, ctx) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return String(value);
  return Object.entries(value)
    .map(([k, v]) => k + "=" + (typeof v === "string" ? v : JSON.stringify(v)))
    .join("; ");
}`,
  },
  bearer: {
    label: "Bearer/Token/JWT 解析",
    libs: [],
    code: `function(text, ctx) {
  let t = String(text).trim();
  const m = t.match(/^(Bearer|Basic|Token|JWT)\\s+(.+)$/i);
  if (m) t = m[2].trim();
  const parts = t.split(".");
  if (parts.length === 3 && parts[0] && parts[1]) {
    try {
      const decodeB64Url = (s) => {
        let x = s.replace(/-/g, "+").replace(/_/g, "/");
        while (x.length % 4) x += "=";
        const bin = atob(x);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder("utf-8").decode(bytes);
      };
      return {
        header: JSON.parse(decodeB64Url(parts[0])),
        payload: JSON.parse(decodeB64Url(parts[1])),
        signature: parts[2],
      };
    } catch {}
  }
  return t;
}`,
    encode: `function(value, ctx) {
  return typeof value === "string" ? value : JSON.stringify(value);
}`,
  },
};

// ================================================================
// 编译 / 库收集
// ================================================================
const KNOWN_GLOBALS = [
  "CryptoJS", "JSEncrypt", "BigNumber", "Big", "bignumber",
  "sm2", "sm3", "sm4", "smCrypto", "forge", "JSZip",
  "LZString", "lzString", "uuid", "md5", "sha1", "sha256",
  "aesjs", "jsrsasign", "pako",
];
let _libCache = null;
const _compiledFns = new Map();
const INTERNAL_HELPERS = {
  smartDecodeText, smartDecodeValue, isJsonLike, isFormLike, tryBase64,
  base64ToBytes, bytesToBase64Str, isPlainObject, valueToText, escapeHtml,
};
function collectLibs() {
  if (_libCache) return _libCache;
  const map = new Map();
  if (window.pako) map.set("pako", window.pako);
  for (const name of KNOWN_GLOBALS) {
    if (window[name] != null && !map.has(name)) map.set(name, window[name]);
  }
  // 已懒加载的库，全局名注入
  for (const keys of pluginGlobals.values()) {
    for (const name of keys) {
      if (name === "__HAR_PLUGINS__" || map.has(name)) continue;
      if (!isValidParamName(name)) continue;
      const v = window[name];
      if (v === undefined) continue;
      map.set(name, v);
    }
  }
  for (const [k, v] of Object.entries(INTERNAL_HELPERS)) {
    if (!map.has(k)) map.set(k, v);
  }
  _libCache = { names: [...map.keys()], values: [...map.values()] };
  return _libCache;
}
function resetLibCache() { _libCache = null; _compiledFns.clear(); }
function compileDecoderCode(code) {
  try {
    const { names, values } = collectLibs();
    const factory = new Function(...names, `return (${code});`);
    const fn = factory(...values);
    if (typeof fn !== "function") throw new Error("代码必须是一个函数");
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: e.message };
  }
}
function getCompiled(id, d) {
  const encodeCode = d.encode || "";
  const cached = _compiledFns.get(id);
  if (cached && cached.code === d.code && cached.encodeCode === encodeCode) return cached;
  const result = { code: d.code, ...compileDecoderCode(d.code) };
  result.encodeCode = encodeCode;
  if (encodeCode) {
    const encoded = compileDecoderCode(encodeCode);
    result.encodeFn = encoded.fn;
    result.encodeError = encoded.error;
  }
  _compiledFns.set(id, result);
  return result;
}

// ================================================================
// 规则归一化
// ================================================================
function normalizeFieldTree(node) {
  if (!node || typeof node !== "object") return null;
  const param = node.param || node.pathField || node.jsonPath || "";
  if (!param) return null;
  const out = { param: String(param), decoderId: node.decoderId || "raw", fields: [] };
  const kids = Array.isArray(node.fields) ? node.fields
    : Array.isArray(node.jsonFieldRules) ? node.jsonFieldRules : [];
  for (const kid of kids) {
    const n = normalizeFieldTree(kid);
    if (n) out.fields.push(n);
  }
  return out;
}
function normalizePathRule(item) {
  if (!item || typeof item !== "object") return null;
  if (item.param && !Array.isArray(item.fields)) {
    const field = normalizeFieldTree(item);
    if (!field) return null;
    return { path: item.path != null ? String(item.path) : "", target: item.target || "body", fields: [field] };
  }
  if (Array.isArray(item.fields)) {
    const fields = item.fields.map(normalizeFieldTree).filter(Boolean);
    return { path: item.path != null ? String(item.path) : "", target: item.target || "body", fields };
  }
  return null;
}
function normalizeMethodsMap(src) {
  const out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  for (const [m, arr] of Object.entries(src)) {
    const method = String(m).toUpperCase();
    const list = Array.isArray(arr) ? arr : [];
    const normalized = list.map(normalizePathRule).filter(Boolean);
    if (normalized.length) out[method] = normalized;
  }
  return out;
}
function buildMethodsFromLegacy(jsonFieldRules) {
  const out = {};
  if (!Array.isArray(jsonFieldRules)) return out;
  for (const item of jsonFieldRules) {
    if (!item || !item.param) continue;
    const method = String(item.method || "*").toUpperCase() || "*";
    const path = item.path != null ? String(item.path) : "";
    const target = item.target || "body";
    const field = normalizeFieldTree(item);
    if (!field) continue;
    out[method] ||= [];
    let pathRule = out[method].find((p) => p.path === path && p.target === target);
    if (!pathRule) {
      pathRule = { path, target, fields: [] };
      out[method].push(pathRule);
    }
    const idx = pathRule.fields.findIndex((f) => f.param === field.param);
    if (idx >= 0) pathRule.fields[idx] = field;
    else pathRule.fields.push(field);
  }
  return out;
}

function refreshConfig() {
  userDecoders = loadJSON(LS_KEYS.userDecoders, {});
  userTemplates = loadJSON(LS_KEYS.templates, {});
  for (const [id, d] of Object.entries(userDecoders)) {
    if (!Array.isArray(d.libs)) d.libs = [];
  }
  const rulesRaw = loadJSON(LS_KEYS.rules, []);
  fileRules = [];
  const seenDomains = new Map();
  for (const r of (Array.isArray(rulesRaw) ? rulesRaw : [])) {
    if (!r || !r.pattern) continue;
    const isHostRule = r.matchHost !== false && !r.isRegex;
    let methods = {};
    if (r.methods && typeof r.methods === "object" && !Array.isArray(r.methods)) {
      methods = normalizeMethodsMap(r.methods);
    } else if (Array.isArray(r.jsonFieldRules)) {
      methods = buildMethodsFromLegacy(r.jsonFieldRules);
    }
    const reqDecoder = r.reqDecoder || "raw";
    const paramsDecoder = r.paramsDecoder || reqDecoder;
    const rule = {
      pattern: String(r.pattern), isRegex: !!r.isRegex, matchHost: isHostRule,
      reqDecoder, paramsDecoder,
      resDecoder: r.resDecoder || "raw",
      keys: r.keys || null,
      reqHeaderDecoders:
        r.reqHeaderDecoders && typeof r.reqHeaderDecoders === "object" && !Array.isArray(r.reqHeaderDecoders)
          ? r.reqHeaderDecoders : null,
      methods,
    };
    if (isHostRule) {
      const key = rule.pattern.toLowerCase();
      if (seenDomains.has(key)) {
        const idx = seenDomains.get(key);
        const prev = fileRules[idx];
        const merged = { ...prev, ...rule, methods: { ...prev.methods } };
        for (const [m, arr] of Object.entries(rule.methods)) merged.methods[m] = arr;
        fileRules[idx] = merged;
      } else {
        seenDomains.set(key, fileRules.length);
        fileRules.push(rule);
      }
    } else fileRules.push(rule);
  }
  _compiledFns.clear();
}
function reloadConfig() {
  refreshConfig();
  renderDecoderList();
  fillTemplateSelect();
  if (state.har) rebuildEntryList();
}

// ================================================================
// 算法列表 / 规则匹配
// ================================================================
function getAllDecoders() {
  const all = {};
  for (const [id, d] of Object.entries(BUILTIN_DECODERS)) {
    if (userDecoders[id]) continue;
    const comp = getCompiled("builtin:" + id, d);
    all[id] = {
      label: d.label, encodeCode: d.encode || "", requires: [],
      libs: Array.isArray(d.libs) ? d.libs : [],
      decode: comp.fn ? async (text, ctx) => comp.fn(text, ctx) : () => { throw new Error("编译失败: " + comp.error); },
      encode: comp.encodeFn ? async (value, ctx) => comp.encodeFn(value, ctx) : null,
      isBuiltin: true, overridden: false,
    };
  }
  for (const [id, d] of Object.entries(userDecoders)) {
    const comp = getCompiled(id, d);
    all[id] = {
      label: d.label, encodeCode: comp.encodeCode, requires: d.requires || [],
      libs: Array.isArray(d.libs) ? d.libs : [],
      decode: comp.fn ? async (text, ctx) => comp.fn(text, ctx) : () => { throw new Error("编译失败: " + comp.error); },
      encode: comp.encodeFn ? async (value, ctx) => comp.encodeFn(value, ctx) : null,
      isBuiltin: !!BUILTIN_DECODERS[id], overridden: !!BUILTIN_DECODERS[id],
    };
  }
  return all;
}
function matchRule(url) {
  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { return null; }
  const hostname = parsedUrl.hostname.toLowerCase();
  for (const r of fileRules) {
    let hit = false;
    if (r.matchHost && !r.isRegex) hit = r.pattern.toLowerCase() === hostname;
    else if (r.isRegex) { try { hit = new RegExp(r.pattern).test(url); } catch {} }
    else hit = url.includes(r.pattern);
    if (!hit) continue;
    return { ...r, urlPath: parsedUrl.pathname, match: r.pattern, note: r.isRegex ? `/${r.pattern}/` : r.pattern };
  }
  return null;
}
function collectMatchedFields(domainRule, method, urlPath, target) {
  if (!domainRule?.methods) return [];
  const reqMethod = String(method || "GET").toUpperCase();
  const methodKeys = [];
  if (domainRule.methods[reqMethod]) methodKeys.push(reqMethod);
  if (domainRule.methods["*"]) methodKeys.push("*");
  const exactByParam = new Map();
  const generalByParam = new Map();
  for (const mk of methodKeys) {
    for (const pathRule of domainRule.methods[mk] || []) {
      if (pathRule.target && pathRule.target !== target) continue;
      const isExact = pathRule.path === urlPath;
      const isGeneral = pathRule.path === "";
      if (!isExact && !isGeneral) continue;
      const bucket = isExact ? exactByParam : generalByParam;
      for (const field of pathRule.fields || []) {
        if (bucket.has(field.param)) continue;
        bucket.set(field.param, field);
      }
    }
  }
  const merged = new Map();
  for (const [p, f] of generalByParam) merged.set(p, f);
  for (const [p, f] of exactByParam) merged.set(p, f);
  return [...merged.values()];
}

// ================================================================
// 首次 seed
// ================================================================
function seedFromScriptsIfNeeded() {
  if (localStorage.getItem(LS_KEYS.seeded) === "1") return;
  if (window.HAR_DECODERS && typeof window.HAR_DECODERS === "object") {
    const cur = loadJSON(LS_KEYS.userDecoders, {});
    let n = 0;
    for (const [id, d] of Object.entries(window.HAR_DECODERS)) {
      if (!d || typeof d.code !== "string") continue;
      if (cur[id]) continue;
      cur[id] = {
        label: d.label || id,
        code: d.code,
        encode: typeof d.encode === "string" ? d.encode : "",
        libs: Array.isArray(d.libs) ? d.libs : [],
        cdn: d.cdn || [],
      };
      n++;
    }
    if (n) saveJSON(LS_KEYS.userDecoders, cur);
  }
  if (Array.isArray(window.HAR_RULES) && !localStorage.getItem(LS_KEYS.rules)) {
    saveJSON(LS_KEYS.rules, window.HAR_RULES);
  }
  if (window.HAR_TEMPLATES && typeof window.HAR_TEMPLATES === "object" && !localStorage.getItem(LS_KEYS.templates)) {
    saveJSON(LS_KEYS.templates, window.HAR_TEMPLATES);
  }
  localStorage.setItem(LS_KEYS.seeded, "1");
}
function reseedFromScripts() {
  if (!confirm("清空当前所有自定义算法/规则/模板，重新从 decoders.js / rules.js 导入？\n（IndexedDB 里的库不受影响）")) return;
  localStorage.removeItem(LS_KEYS.seeded);
  localStorage.removeItem(LS_KEYS.userDecoders);
  localStorage.removeItem(LS_KEYS.rules);
  localStorage.removeItem(LS_KEYS.templates);
  seedFromScriptsIfNeeded();
  reloadConfig();
  showToast("已重新导入", "ok");
}
function resetAllConfig() {
  if (!confirm("清空所有自定义算法、规则、模板（库不受影响）。继续？")) return;
  localStorage.removeItem(LS_KEYS.userDecoders);
  localStorage.removeItem(LS_KEYS.rules);
  localStorage.removeItem(LS_KEYS.templates);
  localStorage.removeItem(LS_KEYS.seeded);
  refreshConfig();
  reloadConfig();
  showToast("已重置", "ok");
}

// ================================================================
// 状态 / DOM 引用
// ================================================================
const PAGE_SIZE = 300;
const MAX_AUTO_DECRYPT = 5 * 1024 * 1024;
function makeFilter() { return { include: new Set(), exclude: new Set() }; }
const state = {
  har: null, entries: [], currentIndex: -1, detailTab: "request",
  decryptState: new Map(), marks: new Map(), headerDecryptState: new Map(),
  filters: { method: makeFilter(), type: makeFilter(), mime: makeFilter(), domain: makeFilter() },
  entryMeta: new Map(), renderedCount: 0,
};
const $ = (id) => document.getElementById(id);
const menuBtn = $("menuBtn"), menuPanel = $("menuPanel");
const harInput = $("harInput"), stats = $("stats"), toggleFilterBtn = $("toggleFilterBtn");
const autoAllBtn = $("autoDecryptAllBtn"), exportBtn = $("exportBtn"), exportListBtn = $("exportListBtn");
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

// ================================================================
// 顶部菜单 / 过滤栏
// ================================================================
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
let filterCollapseTimer = null;
function expandFilter() { filterBar.classList.remove("collapsed"); toggleFilterBtn.textContent = "🔍 收起过滤"; clearTimeout(filterCollapseTimer); }
function collapseFilter() { filterBar.classList.add("collapsed"); toggleFilterBtn.textContent = "🔍 展开过滤"; }
function scheduleCollapseFilter() {
  clearTimeout(filterCollapseTimer);
  filterCollapseTimer = setTimeout(() => {
    if (!filterBar.classList.contains("collapsed")) collapseFilter();
  }, 400);
}
stats.addEventListener("click", () => { if (filterBar.classList.contains("collapsed")) expandFilter(); else collapseFilter(); });
toggleFilterBtn.addEventListener("click", () => { if (filterBar.classList.contains("collapsed")) expandFilter(); else collapseFilter(); });
filterBar.addEventListener("mouseenter", () => clearTimeout(filterCollapseTimer));
filterBar.addEventListener("mouseleave", () => { if (!filterBar.classList.contains("collapsed")) scheduleCollapseFilter(); });

// ================================================================
// 加载 HAR
// ================================================================
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
    state.decryptState.clear();
    state.headerDecryptState.clear();
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
    toggleFilterBtn.disabled = false;
    autoAllBtn.disabled = false;
    exportBtn.disabled = false;
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

// ================================================================
// 过滤
// ================================================================
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
function rebuildEntryList() {
  if (!state.har) return;
  const filtered = [];
  state.har.log.entries.forEach((entry, idx) => {
    const meta = state.entryMeta.get(idx);
    if (!meta) return;
    if (!matchDim(meta.method, state.filters.method)) return;
    if (!matchDim(meta.type, state.filters.type)) return;
    if (!matchDim(meta.mime, state.filters.mime)) return;
    if (!matchDim(meta.domain, state.filters.domain)) return;
    filtered.push({
      entry, originalIndex: idx, url: entry.request?.url || "",
      method: meta.method, type: meta.type, status: entry.response?.status || 0,
      time: meta.time, rule: matchRule(entry.request?.url || ""),
    });
  });
  filtered.sort((a, b) => b.time - a.time);
  state.entries = filtered;
  renderList(true);
  const total = state.har.log.entries.length;
  const shown = filtered.length;
  stats.textContent = shown === total ? `共 ${total} 条` : `共 ${total} 条 / 显示 ${shown} 条`;
}
function renderList(reset) {
  if (reset) { entryList.innerHTML = ""; state.renderedCount = 0; }
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
      more.addEventListener("click", () => renderList(false));
      entryList.appendChild(more);
    }
    more.textContent = `已渲染 ${state.renderedCount} / ${state.entries.length}（还剩 ${remain} 条）`;
  } else if (more) more.remove();
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
  if (mark?.color) cls += " marked-" + mark.color;
  div.className = cls;
  div.dataset.idx = item.originalIndex;
  const sc = item.status >= 200 && item.status < 300 ? "ok" : item.status >= 400 ? "err" : "";
  const icon = TYPE_ICONS[item.type] ? TYPE_ICONS[item.type] + " " : "";
  div.innerHTML = `
    <span class="method method-${escapeHtml(item.method)}">${escapeHtml(item.method)}</span>
    <span class="type-tag">${icon}${escapeHtml(TYPE_LABELS[item.type] || item.type)}</span>
    <span class="url" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</span>
    <span class="status ${sc}">${item.status || ""}</span>
    ${mark?.note ? `<div style="width:100%;margin-top:3px;font-size:11px;color:rgba(255,255,255,.55);font-style:italic;">备注：${escapeHtml(mark.note)}</div>` : ""}
  `;
  let pressTimer = null, longPressed = false;
  div.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    longPressed = false;
    pressTimer = setTimeout(async () => {
      longPressed = true;
      try {
        await navigator.clipboard.writeText(await generateFetchCode(item));
        showToast("已复制 fetch 代码", "ok");
      } catch (error) { showToast("复制失败: " + error.message, "err"); }
    }, 600);
  });
  const cancelLongPress = () => clearTimeout(pressTimer);
  div.addEventListener("mouseup", cancelLongPress);
  div.addEventListener("mouseleave", cancelLongPress);
  div.addEventListener("click", () => {
    if (longPressed) { longPressed = false; return; }
    state.currentIndex = i;
    state.detailTab = "request";
    entryList.querySelectorAll(".entry.active").forEach((el) => el.classList.remove("active"));
    div.classList.add("active");
    pinnedHeaders.clear();
    renderDetail();
  });
  div.addEventListener("contextmenu", (e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY, item); });
  return div;
}

async function getParsedRequestBody(item) {
  const pd = item.entry.request?.postData || {};
  if (!pd.text && !(pd.params?.length)) return { hasBody: false };
  const ds = getDecryptState(item.originalIndex);
  let value = ds.reqResult;
  if (value === null || value === undefined) {
    const text = getPostText(item.entry);
    const decoderId = ds.reqDecoder || item.rule?.reqDecoder || "raw";
    value = await runDecoder(decoderId, text ?? "", { rule: item.rule, keys: item.rule?.keys || {}, requestIndex: item.originalIndex });
  }
  return { hasBody: true, value };
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
  for (const header of request.headers || []) {
    const name = header.name || "";
    if (name.toLowerCase() === "cookie") { hadCookie = true; continue; }
    if (!pseudoHeaders.has(name.toLowerCase()) && !forbidden.test(name)) headers[name] = header.value;
  }
  const body = await getParsedRequestBody(item);
  const hasBody = body.hasBody && !["GET", "HEAD"].includes(method);
  if (hasBody && !Object.keys(headers).some((name) => name.toLowerCase() === "content-type"))
    headers["Content-Type"] = "application/json";
  const options = [
    `  method: ${JSON.stringify(method)}`,
    `  headers: ${JSON.stringify(headers, null, 2)}`,
  ];
  if (hasBody) options.push(`  body: JSON.stringify(${JSON.stringify(body.value, null, 2)})`);
  if (hadCookie) options.push('  credentials: "include"');
  const mimeType = item.entry.response?.content?.mimeType || "";
  const reader = /(?:application|text)\/(?:[^;]+\+)?json/i.test(mimeType) ? "json" : "text";
  const url = new URL(request.url);
  const query = isGet ? getParsedRequestQuery(item) : null;
  if (isGet) url.search = "";
  const fetchUrl = isGet ? "url" : JSON.stringify(request.url);
  const lines = [];
  if (isGet) {
    lines.push(`const url = new URL(${JSON.stringify(url.toString())});`);
    lines.push(`const params = ${JSON.stringify(query, null, 2)};`);
    lines.push("for (const [key, value] of Object.entries(params)) {");
    lines.push("  for (const item of Array.isArray(value) ? value : [value]) {");
    lines.push('    const valueText = item !== null && typeof item === "object" ? JSON.stringify(item) : item == null ? "" : String(item);');
    lines.push("    url.searchParams.append(key, valueText);");
    lines.push("  }");
    lines.push("}");
    lines.push("");
  }
  return [
    ...lines,
    `const response = await fetch(${fetchUrl}, {\n${options.join(",\n")}\n});`,
    `const data = await response.${reader}();`,
    "console.log(data);",
  ].join("\n");
}
entryListAside.addEventListener("scroll", function () {
  if (this.scrollTop + this.clientHeight >= this.scrollHeight - 100) {
    if (state.renderedCount < state.entries.length) renderList(false);
  }
});

// ================================================================
// 右键菜单
// ================================================================
let ctxMenu = null;
function closeContextMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
document.addEventListener("click", (e) => { if (ctxMenu && !ctxMenu.contains(e.target)) closeContextMenu(); });
function showContextMenu(x, y, item) {
  closeContextMenu();
  const origIdx = item.originalIndex;
  const mark = state.marks.get(origIdx) || {};
  const menu = document.createElement("div");
  menu.style.cssText = "position:fixed;z-index:2000;background:rgba(30,30,35,.97);color:#ddd;border:1px solid rgba(255,255,255,.15);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:8px;min-width:190px;font-size:12px;backdrop-filter:blur(20px);";
  const noteBtn = document.createElement("button");
  noteBtn.style.cssText = "display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;color:#ddd;border-radius:6px;font-family:inherit;transition:background .12s;";
  noteBtn.textContent = mark.note ? "编辑备注…" : "添加备注…";
  noteBtn.addEventListener("mouseenter", () => (noteBtn.style.background = "rgba(255,255,255,.08)"));
  noteBtn.addEventListener("mouseleave", () => (noteBtn.style.background = "transparent"));
  noteBtn.addEventListener("click", () => {
    const note = prompt("输入备注（留空清除）:", mark.note || "");
    if (note === null) { closeContextMenu(); return; }
    const m = state.marks.get(origIdx) || {};
    if (note.trim()) m.note = note.trim(); else delete m.note;
    if (!m.color && !m.note) state.marks.delete(origIdx); else state.marks.set(origIdx, m);
    refreshListPreservingView();
    if (state.entries[state.currentIndex]?.originalIndex === origIdx) renderDetail();
    closeContextMenu();
  });
  menu.appendChild(noteBtn);
  const colorRow = document.createElement("div");
  colorRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px 4px;border-top:1px solid rgba(255,255,255,.08);margin-top:4px;";
  const colors = [
    ["red", "红色", "#ef5350"], ["orange", "橙色", "#ff9800"],
    ["yellow", "黄色", "#fdd835"], ["green", "绿色", "#66bb6a"],
    ["blue", "蓝色", "#42a5f5"], ["purple", "紫色", "#ab47bc"],
  ];
  for (const [id, label, color] of colors) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.title = `${mark.color === id ? "取消" : "标记为"}${label}`;
    swatch.style.cssText = `width:18px;height:18px;padding:0;border:2px solid ${mark.color === id ? "#fff" : "rgba(255,255,255,.35)"};border-radius:50%;background:${color};cursor:pointer;`;
    swatch.addEventListener("click", () => {
      const next = state.marks.get(origIdx) || {};
      if (next.color === id) delete next.color; else next.color = id;
      if (!next.color && !next.note) state.marks.delete(origIdx); else state.marks.set(origIdx, next);
      refreshListPreservingView();
      closeContextMenu();
    });
    colorRow.appendChild(swatch);
  }
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

// ================================================================
// 请求头
// ================================================================
const pinnedHeaders = new Set();
function buildHeadersSection({ title, headers, originalIndex, rule }) {
  const w = document.createElement("div");
  const t = document.createElement("div");
  t.className = "section-title";
  t.textContent = `${title}（${headers.length}）`;
  w.appendChild(t);
  if (!headers.length) {
    const p = document.createElement("pre");
    p.className = "empty";
    p.textContent = "（无）";
    w.appendChild(p);
    return w;
  }
  const list = document.createElement("div");
  list.className = "headers-list";
  headers.forEach((h) => {
    const stateKey = `${originalIndex}:${h.name}`;
    const row = document.createElement("div");
    row.className = "header-row";
    const line = document.createElement("div");
    line.className = "header-line";
    const nameEl = document.createElement("span");
    nameEl.className = "header-name";
    nameEl.textContent = h.name;
    line.appendChild(nameEl);
    const valEl = document.createElement("span");
    valEl.className = "header-value";
    valEl.textContent = h.value;
    valEl.title = h.value;
    line.appendChild(valEl);
    row.appendChild(line);
    const expand = document.createElement("div");
    expand.className = "header-parse-panel";
    expand.style.display = "none";
    row.appendChild(expand);
    let hoverTimer = null, leaveTimer = null;
    const showPanel = () => {
      if (!expand.dataset.initialized) {
        expand.dataset.initialized = "1";
        initHeaderParsePanel(expand, h.value, stateKey, rule, h.name, originalIndex);
      }
      expand.style.display = "block";
    };
    const hidePanel = () => { if (pinnedHeaders.has(stateKey)) return; expand.style.display = "none"; };
    row.addEventListener("mouseenter", () => {
      if (pinnedHeaders.has(stateKey)) return;
      clearTimeout(leaveTimer); clearTimeout(hoverTimer);
      hoverTimer = setTimeout(showPanel, 200);
    });
    row.addEventListener("mouseleave", () => {
      if (pinnedHeaders.has(stateKey)) return;
      clearTimeout(hoverTimer); clearTimeout(leaveTimer);
      leaveTimer = setTimeout(hidePanel, 300);
    });
    row.addEventListener("click", (e) => {
      if (e.target.closest("select, button, input, textarea, a")) return;
      if (pinnedHeaders.has(stateKey)) {
        pinnedHeaders.delete(stateKey);
        row.classList.remove("pinned");
        if (!row.matches(":hover")) expand.style.display = "none";
      } else {
        pinnedHeaders.add(stateKey);
        row.classList.add("pinned");
        showPanel();
      }
    });
    list.appendChild(row);
  });
  w.appendChild(list);
  return w;
}
function getHeaderDecryptState(stateKey) {
  if (!state.headerDecryptState.has(stateKey))
    state.headerDecryptState.set(stateKey, { decoderId: "", result: null, error: null });
  return state.headerDecryptState.get(stateKey);
}
function initHeaderParsePanel(container, value, stateKey, rule, headerName, requestIndex) {
  const ds = getHeaderDecryptState(stateKey);
  const tb = document.createElement("div");
  tb.className = "toolbar";
  const sel = document.createElement("select");
  const all = getAllDecoders();
  for (const [id, d] of Object.entries(all)) {
    const o = document.createElement("option");
    o.value = id; o.textContent = d.label;
    sel.appendChild(o);
  }
  let defaultId = "raw";
  if (rule && rule.reqHeaderDecoders) {
    const lname = (headerName || "").toLowerCase();
    for (const [k, v] of Object.entries(rule.reqHeaderDecoders)) {
      if (k.toLowerCase() === lname && all[v]) { defaultId = v; break; }
    }
  }
  if (defaultId === "raw") {
    const lower = (headerName || "").toLowerCase();
    if (lower === "cookie") defaultId = "cookie";
    else if (lower === "authorization" || lower === "proxy-authorization") defaultId = "bearer";
  }
  if (ds.decoderId) defaultId = ds.decoderId;
  sel.value = defaultId;
  tb.appendChild(sel);
  container.appendChild(tb);
  const resultEl = document.createElement("div");
  container.appendChild(resultEl);
  const doParse = async (id) => {
    ds.decoderId = id;
    resultEl.innerHTML = '<pre class="loading">解析中…</pre>';
    try {
      const result = await runDecoder(id, value || "", { rule, keys: rule?.keys || {}, requestIndex });
      ds.result = result; ds.error = null;
      renderHeaderResult(resultEl, result);
    } catch (e) {
      ds.result = null; ds.error = e.message || String(e);
      renderHeaderError(resultEl, ds.error);
    }
  };
  sel.addEventListener("change", () => doParse(sel.value));
  if (ds.result !== null || ds.error) {
    if (ds.error) renderHeaderError(resultEl, ds.error);
    else renderHeaderResult(resultEl, ds.result);
  } else {
    resultEl.innerHTML = '<pre class="loading">解析中…</pre>';
    doParse(defaultId);
  }
}
function renderHeaderResult(container, result) {
  container.innerHTML = "";
  if (result === null || result === undefined) {
    const p = document.createElement("pre");
    p.className = "empty";
    p.textContent = "（空）";
    container.appendChild(p);
    return;
  }
  if (isPlainObject(result) || Array.isArray(result)) container.appendChild(renderJsonWithTs(result));
  else {
    const p = document.createElement("pre");
    p.textContent = valueToText(result);
    container.appendChild(p);
  }
  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "复制结果";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(valueToText(result));
      btn.textContent = "已复制";
      setTimeout(() => (btn.textContent = "复制结果"), 1500);
    } catch { btn.textContent = "复制失败"; }
  });
  container.appendChild(btn);
}
function renderHeaderError(container, error) {
  container.innerHTML = "";
  const p = document.createElement("pre");
  p.className = "err";
  p.textContent = error;
  container.appendChild(p);
}

// ================================================================
// 解密 / 加密执行（含懒加载）
// ================================================================
function getRequiredCryptoFields(id) {
  const definition = userDecoders[id] || BUILTIN_DECODERS[id];
  if (definition?.requires?.length) return definition.requires;
  const code = definition?.code || "";
  return ["key", "iv", "offset"].filter((field) =>
    new RegExp(`\\bkeys\\s*(?:\\?\\.\\s*|\\.\\s*)${field}\\b`).test(code),
  );
}
function decodeCryptoInput(value, format) {
  const text = value.trim().replace(/\s+/g, "");
  if (format === "hex") {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(text))
      throw new Error("Hex 必须是偶数位十六进制字符串");
    return text.toLowerCase();
  }
  try {
    const binary = atob(text);
    return Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  } catch { throw new Error("Base64 格式无效"); }
}
function promptForCryptoKeys(fields, currentKeys) {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop crypto-key-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal crypto-key-modal";
    const header = document.createElement("div");
    header.className = "modal-header";
    const title = document.createElement("h2");
    title.textContent = "输入算法参数";
    header.appendChild(title);
    const body = document.createElement("div");
    body.className = "modal-body";
    const encodingRow = document.createElement("div");
    encodingRow.className = "form-row";
    const encodingLabel = document.createElement("label");
    encodingLabel.textContent = "输入编码";
    const encodingSelect = document.createElement("select");
    encodingSelect.innerHTML = '<option value="hex">Hex</option><option value="base64">Base64</option>';
    encodingSelect.value = currentKeys.inputFormat || "hex";
    encodingRow.append(encodingLabel, encodingSelect);
    body.appendChild(encodingRow);
    const inputs = {};
    for (const field of fields) {
      const row = document.createElement("div");
      row.className = "form-row";
      const label = document.createElement("label");
      label.textContent = field === "iv" || field === "offset" ? "IV / 偏移量" : "密钥";
      const input = document.createElement("input");
      input.type = "text"; input.autocomplete = "off"; input.spellcheck = false;
      input.placeholder = encodingSelect.value === "hex" ? "例如 001122aabbcc" : "Base64 编码字符串";
      input.value = currentKeys[field] || "";
      input.addEventListener("input", () => {
        input.placeholder = encodingSelect.value === "hex" ? "例如 001122aabbcc" : "Base64 编码字符串";
      });
      inputs[field] = input;
      row.append(label, input);
      body.appendChild(row);
    }
    encodingSelect.addEventListener("change", () => {
      for (const input of Object.values(inputs))
        input.placeholder = encodingSelect.value === "hex" ? "例如 001122aabbcc" : "Base64 编码字符串";
    });
    const actions = document.createElement("div");
    actions.className = "form-actions";
    const cancel = document.createElement("button");
    cancel.className = "btn-secondary";
    cancel.textContent = "取消";
    const submit = document.createElement("button");
    submit.className = "btn-primary";
    submit.textContent = "应用";
    actions.append(cancel, submit);
    body.appendChild(actions);
    modal.append(header, body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    const finish = (value) => { backdrop.remove(); resolve(value); };
    cancel.addEventListener("click", () => finish(null));
    backdrop.addEventListener("click", (event) => { if (event.target === backdrop) finish(null); });
    submit.addEventListener("click", () => {
      try {
        const format = encodingSelect.value;
        const values = { inputFormat: format };
        for (const field of fields) {
          const raw = inputs[field].value.trim();
          if (!raw) throw new Error(`${field} 不能为空`);
          values[field] = decodeCryptoInput(raw, format);
        }
        finish(values);
      } catch (error) { showToast(error.message, "err"); }
    });
    inputs[fields[0]]?.focus();
  });
}
async function getDecoderContext(id, ctx = {}) {
  const context = { ...ctx, keys: { ...(ctx.keys || {}) } };
  const requirements = getRequiredCryptoFields(id);
  if (!requirements.length) return context;
  const ds = Number.isInteger(ctx.requestIndex) ? getDecryptState(ctx.requestIndex) : null;
  ds && (ds.cryptoKeys ||= {});
  const cached = ds?.cryptoKeys?.[id] || {};
  context.keys = { ...context.keys, ...cached };
  const missing = requirements.filter((field) => !context.keys[field]);
  if (!missing.length) return context;
  const entered = await promptForCryptoKeys(missing, context.keys);
  if (!entered) throw new Error("已取消输入算法参数");
  context.keys = { ...context.keys, ...entered };
  if (ds) ds.cryptoKeys[id] = { ...context.keys };
  return context;
}

async function runDecoder(id, text, ctx) {
  let d = getAllDecoders()[id];
  if (!d) throw new Error("未知解码方式: " + id);
  if (d.libs?.length) {
    const missing = d.libs.filter((n) => !loadedLibs.has(n));
    if (missing.length) {
      await ensureLibsLoaded(missing);
      d = getAllDecoders()[id];
    }
  }
  return await d.decode(String(text ?? ""), await getDecoderContext(id, ctx));
}
async function runEncoder(id, value, ctx) {
  let d = getAllDecoders()[id];
  if (!d) throw new Error("未知解码方式: " + id);
  if (d.libs?.length) {
    const missing = d.libs.filter((n) => !loadedLibs.has(n));
    if (missing.length) {
      await ensureLibsLoaded(missing);
      d = getAllDecoders()[id];
    }
  }
  if (!d?.encode) throw new Error(`「${d?.label || id}」没有配对加密函数`);
  return await d.encode(value, await getDecoderContext(id, ctx));
}

async function runDecryptForItem(item, ds, { skipBodies = false } = {}) {
  const { entry, rule } = item;
  const ctx = { rule, keys: rule?.keys || {}, requestIndex: item.originalIndex };
  const jobs = [];

  const queryText = getQueryRawText(entry);
  if (queryText) {
    const qid = ds.queryDecoder || rule?.paramsDecoder || rule?.reqDecoder || "raw";
    ds.queryDecoder = qid;
    ds.queryLoading = true;
    jobs.push((async () => {
      try { ds.queryResult = await runDecoder(qid, queryText, ctx); ds.queryError = null; }
      catch (e) { ds.queryError = e.message || String(e); ds.queryResult = null; }
      finally { ds.queryLoading = false; }
    })());
  }

  const postText = getPostText(entry);
  if (postText && !skipBodies) {
    const reqId = ds.reqDecoder || rule?.reqDecoder || "raw";
    ds.reqDecoder = reqId;
    if (postText.length > MAX_AUTO_DECRYPT) {
      ds.reqError = `请求体过大 (${(postText.length / 1024 / 1024).toFixed(1)}MB)`;
      ds.reqResult = null;
    } else {
      jobs.push((async () => {
        try { ds.reqResult = await runDecoder(reqId, postText, ctx); ds.reqError = null; }
        catch (e) { ds.reqError = e.message || String(e); ds.reqResult = null; }
      })());
    }
  }

  const resText = getResponseText(entry);
  if (resText && !skipBodies) {
    const resId = ds.resDecoder || rule?.resDecoder || "raw";
    ds.resDecoder = resId;
    if (resText.length > MAX_AUTO_DECRYPT) {
      ds.resError = `响应体过大 (${(resText.length / 1024 / 1024).toFixed(1)}MB)`;
      ds.resResult = null;
    } else {
      jobs.push((async () => {
        try { ds.resResult = await runDecoder(resId, resText, ctx); ds.resError = null; }
        catch (e) { ds.resError = e.message || String(e); ds.resResult = null; }
      })());
    }
  }
  await Promise.all(jobs);
}
function getDecryptState(i) {
  if (!state.decryptState.has(i))
    state.decryptState.set(i, {
      reqDecoder: "", reqResult: null, reqError: null,
      queryDecoder: "", queryResult: null, queryError: null, queryLoading: false,
      cryptoKeys: {},
      resDecoder: "", resResult: null, resError: null,
      autoRan: false, loading: false, fieldDecodes: {},
    });
  return state.decryptState.get(i);
}

// ================================================================
// 单字段多叉树
// ================================================================
function fieldToNode(field) {
  return {
    path: field.param || "", decoderId: field.decoderId || "raw",
    result: undefined, error: null, loading: false, autoTried: false,
    children: Array.isArray(field.fields) ? field.fields.map(fieldToNode) : [],
  };
}
function nodeToField(node) {
  if (!node.path) return null;
  const children = (node.children || []).map(nodeToField).filter(Boolean);
  return { param: node.path, decoderId: node.decoderId, fields: children };
}
function getFieldDecodeState(ds, target, rule, urlPath, method) {
  ds.fieldDecodes ||= {};
  if (!ds.fieldDecodes[target] || !ds.fieldDecodes[target].initialized) {
    const fields = collectMatchedFields(rule, method, urlPath, target);
    ds.fieldDecodes[target] = { initialized: true, children: fields.map(fieldToNode) };
  }
  return ds.fieldDecodes[target];
}
function collectJsonFields(value, path = [], fields = []) {
  if (Array.isArray(value)) {
    if (!value.length) fields.push({ path, label: "[]" });
    else value.forEach((item, index) => collectJsonFields(item, [...path, index], fields));
    return fields;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!keys.length) fields.push({ path, label: "{}" });
    else keys.forEach((key) => collectJsonFields(value[key], [...path, key], fields));
    return fields;
  }
  fields.push({ path, label: path.map((part) => `[${JSON.stringify(part)}]`).join("") });
  return fields;
}
function getJsonField(value, path) {
  return path.reduce((current, key) => current?.[key], value);
}
async function runFieldDecoder(value, decoderId, ctx) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return await runDecoder(decoderId, text ?? "", ctx);
}
function getJsonSourceFromText(text) {
  if (!text) return null;
  const v = smartDecodeText(text);
  return (isPlainObject(v) || Array.isArray(v)) ? v : null;
}

function buildQuerySection({ entry, item, rule, urlPath, ctx }) {
  const rawText = getQueryRawText(entry);
  const ds = getDecryptState(item.originalIndex);
  const count = rawText ? [...new URLSearchParams(rawText).keys()].length : 0;
  const decoderId = ds.queryDecoder || rule?.paramsDecoder || "raw";
  const w = buildBodySection({
    title: "URL 查询参数",
    originalText: rawText,
    decoderId,
    result: ds.queryResult,
    error: ds.queryError,
    loading: !!ds.queryLoading,
    allowCompare: false,
    resultLabel: `解析结果（${count} 个参数）:`,
    ctx,
    onDecrypt: async (id) => {
      ds.queryDecoder = id;
      ds.queryLoading = true;
      ds.queryError = null;
      try { ds.queryResult = await runDecoder(id, rawText, ctx); }
      catch (e) { ds.queryResult = null; ds.queryError = e.message || String(e); }
      ds.queryLoading = false;
      renderDetail();
      renderList();
    },
  });
  if (!rawText) return w;
  const fieldState = getFieldDecodeState(ds, "query", rule, urlPath, item.method);
  w.appendChild(buildJsonFieldDecoder({
    title: "单个查询参数解析（多叉树）",
    source: ds.queryResult && (isPlainObject(ds.queryResult) || Array.isArray(ds.queryResult))
      ? ds.queryResult
      : getJsonSourceFromText(rawText),
    fieldState,
    ctx,
  }));
  return w;
}

function buildJsonFieldDecoder({ title, source, fieldState, ctx }) {
  const panel = document.createElement("div");
  panel.className = "field-decoder";
  const heading = document.createElement("div");
  heading.className = "label-mini";
  heading.textContent = title;
  panel.appendChild(heading);
  const childrenContainer = document.createElement("div");
  panel.appendChild(childrenContainer);
  function renderChildren() {
    childrenContainer.innerHTML = "";
    if (!fieldState.children.length) {
      const tip = document.createElement("div");
      tip.style.cssText = "padding:10px 12px;color:rgba(255,255,255,.4);font-size:11.5px;background:rgba(255,255,255,.02);border:1px dashed rgba(255,255,255,.1);border-radius:8px;";
      tip.textContent = "尚未配置单字段解析规则。点击下方按钮添加。";
      childrenContainer.appendChild(tip);
    }
    fieldState.children.forEach((node) => {
      childrenContainer.appendChild(buildJsonFieldNode({
        node, source, ctx, level: 0,
        onRemove: () => {
          const i = fieldState.children.indexOf(node);
          if (i >= 0) fieldState.children.splice(i, 1);
          renderDetail();
        },
      }));
    });
  }
  renderChildren();
  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-secondary";
  addBtn.style.marginTop = "8px";
  addBtn.textContent = "+ 添加单参数解析";
  addBtn.disabled = !source;
  addBtn.addEventListener("click", () => {
    fieldState.children.push({
      path: "", decoderId: "raw", result: undefined, error: null,
      loading: false, autoTried: true, children: [],
    });
    renderChildren();
  });
  panel.appendChild(addBtn);
  return panel;
}

function buildJsonFieldNode({ node, source, ctx, onRemove, level = 0 }) {
  const wrap = document.createElement("div");
  wrap.style.cssText = level > 0
    ? "margin-top:8px;padding-left:10px;border-left:2px solid rgba(79,163,224,.35);"
    : "margin-bottom:10px;padding:10px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid rgba(255,255,255,.05);";
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  const pathSelect = document.createElement("select");
  const fields = source ? collectJsonFields(source) : [];
  for (const field of fields) {
    const opt = document.createElement("option");
    opt.value = JSON.stringify(field.path);
    opt.textContent = field.label || "(根值)";
    pathSelect.appendChild(opt);
  }
  if (node.path) {
    if (fields.some((f) => JSON.stringify(f.path) === node.path)) {
      pathSelect.value = node.path;
    } else {
      const opt = document.createElement("option");
      opt.value = node.path;
      opt.textContent = `（规则路径 ${node.path}，当前数据无此字段）`;
      pathSelect.appendChild(opt);
      pathSelect.value = node.path;
    }
  } else if (fields.length) {
    node.path = pathSelect.value;
  }
  pathSelect.disabled = !fields.length;
  pathSelect.addEventListener("change", () => {
    node.path = pathSelect.value;
    node.result = undefined; node.error = null; node.children = [];
    renderResult();
  });
  toolbar.appendChild(pathSelect);

  const decoderSelect = document.createElement("select");
  for (const [id, decoder] of Object.entries(getAllDecoders())) {
    const opt = document.createElement("option");
    opt.value = id; opt.textContent = decoder.label;
    opt.selected = id === node.decoderId;
    decoderSelect.appendChild(opt);
  }
  decoderSelect.addEventListener("change", () => { node.decoderId = decoderSelect.value; });
  toolbar.appendChild(decoderSelect);

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.className = "btn-secondary";
  runBtn.textContent = "解析值";
  runBtn.disabled = !fields.length;
  toolbar.appendChild(runBtn);

  if (onRemove) {
    const rmBtn = document.createElement("button");
    rmBtn.type = "button";
    rmBtn.className = "btn-secondary";
    rmBtn.textContent = "✕ 删除";
    rmBtn.addEventListener("click", (event) => {
      event.preventDefault(); event.stopPropagation(); onRemove();
    });
    toolbar.appendChild(rmBtn);
  }
  wrap.appendChild(toolbar);
  const output = document.createElement("div");
  wrap.appendChild(output);
  const childContainer = document.createElement("div");
  wrap.appendChild(childContainer);

  async function runParse(fromUser) {
    const newPath = pathSelect.value;
    const pathChanged = fromUser && newPath !== node.path;
    const path = JSON.parse(newPath || "[]");
    node.path = newPath;
    node.decoderId = decoderSelect.value;
    node.loading = true;
    node.error = null;
    renderResult();
    try {
      node.result = await runFieldDecoder(getJsonField(source, path), node.decoderId, ctx);
    } catch (e) {
      node.result = undefined;
      node.error = e.message || String(e);
    }
    node.loading = false;
    if (pathChanged) node.children = [];
    renderResult();
  }
  runBtn.addEventListener("click", () => runParse(true));

  function renderResult() {
    output.innerHTML = "";
    childContainer.innerHTML = "";
    if (node.loading) {
      const p = document.createElement("pre");
      p.className = "loading";
      p.textContent = "正在解析参数值…";
      output.appendChild(p);
      return;
    }
    if (node.error) {
      const p = document.createElement("pre");
      p.className = "err";
      p.textContent = node.error;
      output.appendChild(p);
      return;
    }
    if (node.result === undefined) return;
    if (isPlainObject(node.result) || Array.isArray(node.result)) {
      output.appendChild(renderJsonWithTs(node.result));
    } else {
      const p = document.createElement("pre");
      p.textContent = valueToText(node.result);
      output.appendChild(p);
    }
    const isObj = isPlainObject(node.result) || Array.isArray(node.result);
    if (!isObj) return;
    node.children.forEach((child) => {
      childContainer.appendChild(buildJsonFieldNode({
        node: child, source: node.result, ctx, level: level + 1,
        onRemove: () => {
          const i = node.children.indexOf(child);
          if (i >= 0) node.children.splice(i, 1);
          renderDetail();
        },
      }));
    });
    const addChildBtn = document.createElement("button");
    addChildBtn.type = "button";
    addChildBtn.className = "btn-secondary";
    addChildBtn.style.marginTop = "8px";
    addChildBtn.textContent = "+ 继续解析子字段";
    addChildBtn.addEventListener("click", () => {
      node.children.push({
        path: "", decoderId: "raw", result: undefined, error: null,
        loading: false, autoTried: true, children: [],
      });
      renderResult();
    });
    childContainer.appendChild(addChildBtn);
  }
  renderResult();

  if (!node.autoTried && node.path && node.result === undefined && !node.error && fields.length) {
    node.autoTried = true;
    setTimeout(() => runParse(false), 0);
  }
  return wrap;
}

// ================================================================
// 加密对照 / 导出算法 / 备份
// ================================================================
function showCompareResult(container, match, originalText, encodedText) {
  const w = document.createElement("div");
  w.style.cssText = "margin-top:12px;padding:12px;background:rgba(0,0,0,.3);border-radius:8px;border:1px solid rgba(255,255,255,.08);";
  const title = document.createElement("div");
  title.className = "label-mini";
  title.textContent = match ? "✅ 加密结果与原始内容一致" : "❌ 加密结果与原始内容不一致";
  title.style.color = match ? "#7ddf7d" : "#ef8a8a";
  w.appendChild(title);
  const origLabel = document.createElement("div");
  origLabel.className = "label-mini";
  origLabel.textContent = `原始（${originalText.length} 字符）`;
  w.appendChild(origLabel);
  const origPre = document.createElement("pre");
  origPre.textContent = originalText.slice(0, 1000) + (originalText.length > 1000 ? "\n…" : "");
  w.appendChild(origPre);
  const encLabel = document.createElement("div");
  encLabel.className = "label-mini";
  encLabel.textContent = `加密（${encodedText.length} 字符）`;
  w.appendChild(encLabel);
  const encPre = document.createElement("pre");
  encPre.textContent = encodedText.slice(0, 1000) + (encodedText.length > 1000 ? "\n…" : "");
  w.appendChild(encPre);
  container.appendChild(w);
}

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
    "// ===== 全部算法导出（可直接作为 decoders.js 使用）=====",
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

// ================================================================
// 详情渲染
// ================================================================
function renderDetail() {
  if (state.currentIndex < 0 || !state.entries[state.currentIndex]) {
    detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>';
    return;
  }
  const item = state.entries[state.currentIndex];
  const { entry, originalIndex, rule, type } = item;
  const ds = getDecryptState(originalIndex);
  const mark = state.marks.get(originalIndex);
  const req = entry.request, res = entry.response;
  const reqText = getPostText(entry) || "";
  const resText = getResponseText(entry) || "";
  const isMedia = type === "image" || type === "audio" || type === "video";
  const urlPath = (() => { try { return new URL(item.url).pathname; } catch { return ""; } })();
  const ctx = { rule, keys: rule?.keys || {}, requestIndex: originalIndex };
  const queryText = getQueryRawText(entry);
  const hasQuery = !!queryText;

  if (!ds.autoRan && (reqText || resText || hasQuery)) {
    ds.autoRan = true;
    ds.loading = !isMedia && !!(reqText || resText);
    runDecryptForItem(item, ds, { skipBodies: isMedia }).then(() => {
      ds.loading = false;
      if (state.entries[state.currentIndex]?.originalIndex === originalIndex) renderDetail();
      renderList();
    });
  }
  detailPanel.innerHTML = "";
  const info = document.createElement("div");
  info.innerHTML = `
    <div class="field"><label>URL</label><div class="value">${escapeHtml(item.url)}</div></div>
    <div class="field"><label>方法 / 类型 / 状态 / 时间</label><div class="value">
      <span class="method method-${escapeHtml(item.method)}">${escapeHtml(item.method)}</span>
      &nbsp;<span class="tag">${TYPE_ICONS[type] ? TYPE_ICONS[type] + " " : ""}${escapeHtml(TYPE_LABELS[type] || type)}</span>
      &nbsp;${res?.status || ""} ${escapeHtml(res?.statusText || "")}
      &nbsp;<span class="tag">${escapeHtml(formatTime(entry.startedDateTime))}</span>
      ${rule ? `&nbsp;<span class="tag" style="background:rgba(217,119,6,.2);color:#ffcc80;">规则: ${escapeHtml(rule.note || String(rule.match))}${rule.keys ? " · 含密钥" : ""}</span>` : ""}
    </div></div>
    ${mark?.note ? `<div class="field"><label>备注</label><div class="value" style="color:rgba(255,255,255,.65);font-style:italic;">${escapeHtml(mark.note)}</div></div>` : ""}
  `;
  detailPanel.appendChild(info);

  const requestBody = document.createElement("div");

  if (hasQuery) {
    requestBody.appendChild(buildQuerySection({ entry, item, rule, urlPath, ctx }));
  }

  if (reqText) {
    requestBody.appendChild(buildBodySection({
      title: "请求体",
      originalText: reqText,
      decoderId: ds.reqDecoder || rule?.reqDecoder || "raw",
      result: ds.reqResult,
      error: ds.reqError,
      loading: ds.loading,
      ctx,
      onDecrypt: async (id) => {
        ds.reqDecoder = id;
        try { ds.reqResult = await runDecoder(id, reqText, ctx); ds.reqError = null; }
        catch (err) { ds.reqResult = null; ds.reqError = err.message || String(err); }
        renderDetail();
        renderList();
      },
    }));
    const bodyFieldState = getFieldDecodeState(ds, "body", rule, urlPath, item.method);
    requestBody.appendChild(buildJsonFieldDecoder({
      title: "单个 JSON 参数解析（多叉树）",
      source: ds.reqResult && (isPlainObject(ds.reqResult) || Array.isArray(ds.reqResult))
        ? ds.reqResult
        : getJsonSourceFromText(reqText),
      fieldState: bodyFieldState,
      ctx,
    }));
  } else if (!hasQuery) {
    requestBody.appendChild(buildEmptySection("请求体", "（无请求体）"));
  }

  const responseBody = isMedia
    ? buildEmptySection("响应体", "（媒体预览暂未集成）")
    : buildBodySection({
        title: "响应体",
        originalText: resText,
        decoderId: ds.resDecoder || rule?.resDecoder || "raw",
        result: ds.resResult,
        error: ds.resError,
        loading: ds.loading,
        ctx,
        onDecrypt: async (id) => {
          try { ds.resDecoder = id; ds.resResult = await runDecoder(id, resText, ctx); ds.resError = null; }
          catch (err) { ds.resDecoder = id; ds.resResult = null; ds.resError = err.message || String(err); }
          renderDetail();
          renderList();
        },
      });

  detailPanel.appendChild(buildDetailTabs({
    item, requestBody, headers: req?.headers || [], originalIndex, rule, responseBody,
    requestTabLabel: reqText
      ? hasQuery ? "请求体 / 参数" : "请求体"
      : hasQuery ? "请求参数" : "请求体",
  }));
}

async function generateRuleFromCurrent(item) {
  const url = new URL(item.entry.request.url);
  const method = (item.entry.request.method || "GET").toUpperCase();
  const urlPath = url.pathname;
  const hostname = url.hostname.toLowerCase();
  const ds = getDecryptState(item.originalIndex);
  const currentRule = item.rule;

  const targetsInUi = Object.keys(ds.fieldDecodes || {});
  const collectedByTarget = new Map();
  for (const [target, root] of Object.entries(ds.fieldDecodes || {})) {
    const fields = [];
    for (const node of root.children || []) {
      const field = nodeToField(node);
      if (field) fields.push(field);
    }
    collectedByTarget.set(target, fields);
  }

  const existingIndex = fileRules.findIndex(
    (r) => r.matchHost && !r.isRegex && r.pattern.toLowerCase() === hostname,
  );
  const previous = fileRules.slice();

  let rule;
  if (existingIndex >= 0) {
    rule = JSON.parse(JSON.stringify(fileRules[existingIndex]));
    rule.reqDecoder = ds.reqDecoder || rule.reqDecoder || "raw";
    rule.paramsDecoder = ds.queryDecoder || rule.paramsDecoder || rule.reqDecoder || "raw";
    rule.resDecoder = ds.resDecoder || rule.resDecoder || "raw";
  } else {
    rule = {
      pattern: url.hostname, isRegex: false, matchHost: true,
      reqDecoder: ds.reqDecoder || "raw",
      paramsDecoder: ds.queryDecoder || "raw",
      resDecoder: ds.resDecoder || "raw",
      methods: {},
    };
    if (currentRule?.keys) rule.keys = currentRule.keys;
    if (currentRule?.reqHeaderDecoders) rule.reqHeaderDecoders = currentRule.reqHeaderDecoders;
  }
  rule.methods ||= {};

  rule.methods[method] ||= [];
  const list = rule.methods[method];
  let usedPath = "";
  for (const target of targetsInUi) {
    const normTarget = target || "body";
    const fields = collectedByTarget.get(target) || [];
    const exactIdx = list.findIndex((p) => p.path === urlPath && (p.target || "body") === normTarget);
    const generalIdx = list.findIndex((p) => p.path === "" && (p.target || "body") === normTarget);
    if (!fields.length) {
      if (exactIdx >= 0) list.splice(exactIdx, 1);
      else if (generalIdx >= 0) list.splice(generalIdx, 1);
      continue;
    }
    const targetPath = exactIdx >= 0 || generalIdx < 0 ? urlPath : "";
    const idx = exactIdx >= 0 ? exactIdx : generalIdx;
    const pathRule = { path: targetPath, target: normTarget, fields };
    if (idx >= 0) list[idx] = pathRule;
    else list.push(pathRule);
    if (targetPath) usedPath = targetPath;
  }
  if (!list.length) delete rule.methods[method];

  if (existingIndex >= 0) fileRules[existingIndex] = rule;
  else fileRules.push(rule);

  if (!saveJSON(LS_KEYS.rules, fileRules)) {
    fileRules = previous;
    refreshConfig();
    throw new Error("localStorage 写入失败");
  }
  refreshConfig();
  for (const d of state.decryptState.values()) d.fieldDecodes = {};
  if (state.har) {
    rebuildEntryList();
    if (state.currentIndex >= 0) renderDetail();
  }
  showToast(
    existingIndex >= 0
      ? `已更新 ${hostname} 的 ${method}${usedPath ? ` ${usedPath}` : "（整个域名）"} 规则`
      : `已生成域名规则：${hostname}${usedPath ? ` ${usedPath}` : "（整个域名）"}`,
    "ok",
  );
}

function buildDetailTabs({ item, requestBody, headers, originalIndex, rule, responseBody, requestTabLabel = "请求体" }) {
  const root = document.createElement("div");
  root.className = "detail-tab-container";
  const tabBar = document.createElement("div");
  tabBar.className = "detail-tabs";
  const requestPanel = document.createElement("div");
  requestPanel.appendChild(requestBody);
  const headersPanel = document.createElement("div");
  headersPanel.appendChild(buildHeadersSection({ title: "请求头", headers, originalIndex, rule }));
  const responsePanel = document.createElement("div");
  responsePanel.appendChild(responseBody);
  const tabs = [
    { id: "request", label: requestTabLabel, panel: requestPanel },
    { id: "headers", label: `请求头 (${headers.length})`, panel: headersPanel },
    { id: "response", label: "响应体", panel: responsePanel },
  ];
  const buttons = new Map();
  for (const tab of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "detail-tab";
    button.textContent = tab.label;
    button.addEventListener("click", () => activate(tab.id));
    buttons.set(tab.id, button);
    tabBar.appendChild(button);
    root.appendChild(tab.panel);
  }
  const ruleButton = document.createElement("button");
  ruleButton.type = "button";
  ruleButton.className = "detail-rule-btn";
  ruleButton.textContent = "生成域名规则";
  ruleButton.title = "整体解析作用于整个域名；单字段解析写入当前路径";
  ruleButton.addEventListener("click", async () => {
    ruleButton.disabled = true;
    try { await generateRuleFromCurrent(item); }
    catch (error) { showToast(`规则保存失败: ${error.message}`, "err"); }
    finally { ruleButton.disabled = false; }
  });
  tabBar.appendChild(ruleButton);
  function activate(id) {
    state.detailTab = id;
    for (const tab of tabs) {
      const active = tab.id === id;
      buttons.get(tab.id).classList.toggle("active", active);
      tab.panel.hidden = !active;
    }
  }
  root.prepend(tabBar);
  activate(tabs.some((tab) => tab.id === state.detailTab) ? state.detailTab : "request");
  return root;
}

function buildOriginalDetails(originalText) {
  const det = document.createElement("details");
  det.className = "original-block";
  const sum = document.createElement("summary");
  sum.textContent = `原始内容（${originalText.length} 字符）`;
  det.appendChild(sum);
  const pre = document.createElement("pre");
  pre.textContent = originalText.length > 5000 ? originalText.slice(0, 5000) + "\n…（已截断）" : originalText;
  det.appendChild(pre);
  let pinned = false;
  let hoverTimer = null, leaveTimer = null;
  det.addEventListener("mouseenter", () => {
    if (pinned) return;
    clearTimeout(leaveTimer); clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => { det.open = true; }, 200);
  });
  det.addEventListener("mouseleave", () => {
    if (pinned) return;
    clearTimeout(hoverTimer); clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => { if (!pinned) det.open = false; }, 400);
  });
  sum.addEventListener("click", (e) => {
    e.preventDefault();
    if (pinned) { pinned = false; det.open = false; }
    else { pinned = true; det.open = true; }
  });
  return det;
}

function buildBodySection({
  title, originalText, decoderId, result, error, loading, onDecrypt, ctx = {},
  resultLabel = "", allowCompare = true,
}) {
  const w = document.createElement("div");
  const t = document.createElement("div");
  t.className = "section-title";
  t.textContent = title + (originalText ? "" : "（无）");
  w.appendChild(t);
  if (!originalText) {
    const p = document.createElement("pre");
    p.className = "empty";
    p.textContent = "（无内容）";
    w.appendChild(p);
    return w;
  }
  const tb = document.createElement("div");
  tb.className = "toolbar";
  const sel = document.createElement("select");
  const all = getAllDecoders();
  for (const [id, d] of Object.entries(all)) {
    const o = document.createElement("option");
    o.value = id; o.textContent = d.label;
    if (id === decoderId) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => onDecrypt(sel.value));
  tb.appendChild(sel);

  const activeDef = all[decoderId];
  if (allowCompare && activeDef?.encode && result != null) {
    const compareBtn = document.createElement("button");
    compareBtn.type = "button";
    compareBtn.className = "btn-secondary";
    compareBtn.textContent = "🔒 加密对照";
    compareBtn.title = "encode(decode(原文)) === 原文（字符串比较）";
    compareBtn.addEventListener("click", async () => {
      compareBtn.disabled = true;
      compareBtn.textContent = "⏳ 加密中…";
      try {
        const encoded = await runEncoder(decoderId, result, ctx);
        const encodedText = typeof encoded === "string" ? encoded : JSON.stringify(encoded);
        const match = encodedText === originalText;
        showCompareResult(w, match, originalText, encodedText);
        showToast(match ? "加密结果与原文一致" : "加密结果与原文不一致", match ? "ok" : "err");
      } catch (e) {
        showToast("加密失败: " + e.message, "err");
      } finally {
        compareBtn.disabled = false;
        compareBtn.textContent = "🔒 加密对照";
      }
    });
    tb.appendChild(compareBtn);
  }

  w.appendChild(tb);
  w.appendChild(buildOriginalDetails(originalText));
  const rl = document.createElement("div");
  rl.className = "label-mini";
  rl.textContent = resultLabel || (title === "请求体" ? "整体解析结果:" : "解析结果:");
  w.appendChild(rl);
  if (loading) {
    const p = document.createElement("pre");
    p.className = "loading";
    p.textContent = "正在自动解密…";
    w.appendChild(p);
  } else if (error) {
    const p = document.createElement("pre");
    p.className = "err";
    p.textContent = error;
    w.appendChild(p);
  } else if (result === null || result === undefined) {
    const p = document.createElement("pre");
    p.className = "empty";
    p.textContent = "（无结果）";
    w.appendChild(p);
  } else if (isPlainObject(result) || Array.isArray(result)) {
    w.appendChild(renderJsonWithTs(result));
  } else {
    const p = document.createElement("pre");
    p.textContent = valueToText(result);
    w.appendChild(p);
  }
  return w;
}

function buildEmptySection(title, text) {
  const w = document.createElement("div");
  const t = document.createElement("div");
  t.className = "section-title";
  t.textContent = title;
  w.appendChild(t);
  const p = document.createElement("pre");
  p.className = "empty";
  p.textContent = text;
  w.appendChild(p);
  return w;
}

// ================================================================
// 批量解密 / 导出 HAR
// ================================================================
autoAllBtn.addEventListener("click", async () => {
  if (!state.har) return;
  autoAllBtn.disabled = true;
  autoAllBtn.textContent = "⏳ 处理中…";
  let total = 0;
  for (let i = 0; i < state.har.log.entries.length; i++) {
    const entry = state.har.log.entries[i];
    const url = entry.request?.url || "";
    const rule = matchRule(url);
    if (!rule) continue;
    total++;
    const ds = getDecryptState(i);
    ds.autoRan = true;
    await runDecryptForItem({ entry, originalIndex: i, url, rule }, ds);
  }
  renderList();
  renderDetail();
  autoAllBtn.textContent = "🔓 批量解密";
  autoAllBtn.disabled = false;
  alert(`命中规则 ${total} 条，已处理完成。`);
});
function applyDecryptToHar(harObj) {
  let count = 0;
  for (const [origIdx, ds] of state.decryptState) {
    const e = harObj.log.entries[origIdx];
    if (!e) continue;
    if (ds.reqResult != null && e.request?.postData) { writeResultBack(e.request.postData, ds.reqResult); count++; }
    if (ds.resResult != null && e.response?.content) { writeResultBack(e.response.content, ds.resResult); count++; }
  }
  return count;
}
exportBtn.addEventListener("click", () => {
  if (!state.har) return;
  const outHar = JSON.parse(JSON.stringify(state.har));
  const count = applyDecryptToHar(outHar);
  const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "capture.decrypted.har";
  a.click();
  URL.revokeObjectURL(a.href);
  if (count === 0) alert("没有可写回的解密结果。");
});
exportListBtn.addEventListener("click", () => {
  if (!state.har) return;
  if (!state.entries.length) { alert("当前过滤无结果，无法导出。"); return; }
  const outHar = JSON.parse(JSON.stringify(state.har));
  applyDecryptToHar(outHar);
  const keep = new Set(state.entries.map((e) => e.originalIndex));
  const kept = keep.size;
  outHar.log.entries = outHar.log.entries.filter((_, i) => keep.has(i));
  const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `capture.filtered-${Date.now()}.har`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast(`已导出 ${kept} 条请求`, "ok");
});
function writeResultBack(c, r) {
  if (typeof r === "string") { c.text = r; delete c.encoding; }
  else { c.text = JSON.stringify(r, null, 2); delete c.encoding; c.mimeType = "application/json"; }
  if ("size" in c) c.size = new Blob([c.text]).size;
}

// ================================================================
// 配置模态框
// ================================================================
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

// -------- 算法列表 UI --------
function renderDecoderList() {
  decoderList.innerHTML = "";
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;";

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

  const reseedBtn = document.createElement("button");
  reseedBtn.className = "btn-secondary";
  reseedBtn.style.fontSize = "12px";
  reseedBtn.textContent = "🔄 从脚本重新导入";
  reseedBtn.addEventListener("click", reseedFromScripts);
  toolbar.appendChild(reseedBtn);

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

// ================================================================
// 库 UI（懒加载版）
// ================================================================
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

// ================================================================
// 初始化
// ================================================================
(async () => {
  toggleFilterBtn.disabled = true;
  autoAllBtn.disabled = true;
  exportBtn.disabled = true;
  exportListBtn.disabled = true;
  try { await refreshLibIndex(); }
  catch (e) { console.error("[HAR-Decrypt] 读取 IndexedDB 失败:", e); }
  seedFromScriptsIfNeeded();
  reloadConfig();
  fillTemplateSelect();
  initLibUI();
  // 首次渲染（用户打开配置时也会再 render 一次）
  try { await renderLibList(); } catch {}
  console.log("%c[HAR-Decrypt] ✅ 初始化完成（库使用懒加载）", "color:#7ddf7d;font-weight:bold");
})();