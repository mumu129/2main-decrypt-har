// ============================================================
// storage.js — localStorage / IndexedDB 库存储 / 懒加载 / 模板
// ============================================================
const LS_KEYS = {
  userDecoders: "har-decrypt:v1:userDecoders",
  rules: "har-decrypt:v1:rules",
  templates: "har-decrypt:v1:templates",
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

// ---------- IndexedDB：库存储 ----------
const LIB_DB = "har-decrypt-libs";
const LIB_STORE = "libs";
let _libDB = null;
const _libIndex = new Map();
const loadedLibs = new Set();
const pluginGlobals = new Map();
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

// ---------- 库执行 / 卸载 / 懒加载 / CRUD ----------
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

// ---------- 默认模板 ----------
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