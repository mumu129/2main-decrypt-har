// ============================================================
// 启动自检
// ============================================================
<<<<<<< HEAD
console.log("%c[HAR-Decrypt] Panel 加载中", "color:#4fa3e0;font-weight:bold");
=======
console.log('%c[HAR-Decrypt] Panel 加载中', 'color:#4fa3e0;font-weight:bold');
console.log('[HAR-Decrypt] electronAPI:', typeof window.electronAPI);
console.log('[HAR-Decrypt] pako:', typeof window.pako);

>>>>>>> parent of 8ddbf45 (改背景)
try {
  new Function('return 1')();
  console.log('%c[HAR-Decrypt] ✅ CSP 允许 new Function', 'color:#7ddf7d');
} catch (e) {
  console.error('[HAR-Decrypt] ❌ CSP 拦截 new Function:', e.message);
}

// ================================================================
// 基础工具
// ================================================================
<<<<<<< HEAD
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
=======
function harTextToBytes(text, encoding) {
  if (!text) return new Uint8Array(0);
  if (encoding === 'base64') {
    const bin = atob(text); const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 0xff) return new TextEncoder().encode(text);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes) {
  let bin = ''; const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  return btoa(bin);
}
function hexDump(bytes) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const c = bytes.slice(i, i + 16);
    const hex = Array.from(c).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(c).map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.').join('');
    lines.push(`${i.toString(16).padStart(6, '0')}  ${hex.padEnd(47)}  ${ascii}`);
  }
  return lines.join('\n') || '（0 字节）';
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function bytesToDisplay(data) {
  if (data == null) return { text: '（空）' };
  if (typeof data === 'string') return { text: data };
  if (data instanceof Uint8Array) {
    try { return { text: new TextDecoder('utf-8', { fatal: true }).decode(data) }; }
    catch { return { text: hexDump(data) }; }
  }
  if (data instanceof ArrayBuffer) return bytesToDisplay(new Uint8Array(data));
  return { text: JSON.stringify(data, null, 2) };
>>>>>>> parent of 8ddbf45 (改背景)
}
function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 350); }, 1800);
}
function formatTime(iso) {
<<<<<<< HEAD
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
// 智能解码（raw 内部使用）
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
=======
  if (!iso) return '';
  try { const d = new Date(iso); if (isNaN(d.getTime())) return iso;
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } catch { return iso; }
>>>>>>> parent of 8ddbf45 (改背景)
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
<<<<<<< HEAD
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
  inflate: {
    label: "模板·zlib inflate（输入 base64）",
    code: `function(text, ctx) {
  const bin = atob(String(text).trim());
  const t = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) t[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(pako.inflate(t)));
}`,
    encode: `function(value, ctx) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const d = pako.deflate(new TextEncoder().encode(s));
  let bin = '';
  for (let i = 0; i < d.length; i++) bin += String.fromCharCode(d[i]);
  return btoa(bin);
}`,
  },
  aesCbc: {
    label: "模板·AES-256-CBC（输入 base64，需 key + iv）",
    code: `async function(text, ctx) {
=======
    label: '模板·gzip 头修复 + 解压',
    code: `function(bytes) {
  const t = new Uint8Array(bytes);
  if (t.length < 8) throw new Error('数据长度 < 8');
  t[0] = 0x1f; t[1] = 0x8b; t[2] = 0x08; t[3] = 0x00;
  t[4] = 0x00; t[5] = 0x00; t[6] = 0x00; t[7] = 0x00;
  const raw = pako.ungzip(t);
  return JSON.parse(new TextDecoder().decode(raw));
}`
  },
  base64Json: {
    label: '模板·Base64 + JSON',
    code: `function(bytes) {
  const s = new TextDecoder().decode(bytes).trim();
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(out));
}`
  },
  aesCbc: {
    label: '模板·AES-256-CBC（需规则中配置 key + iv）',
    code: `async function(bytes, ctx) {
>>>>>>> parent of 8ddbf45 (改背景)
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  if (!keys.iv) throw new Error('缺少 IV：请在域名规则中配置 keys.iv');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const bin = atob(String(text).trim());
  const cipher = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) cipher[i] = bin.charCodeAt(i);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-CBC' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: hexToBytes(keys.iv) }, key, cipher);
  return JSON.parse(new TextDecoder().decode(plain));
<<<<<<< HEAD
}`,
    encode: `async function(value, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  if (!keys.iv) throw new Error('缺少 IV：请在域名规则中配置 keys.iv');
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
    label: "模板·AES-256-GCM（输入 base64：iv(12) || ct || tag(16)）",
    code: `async function(text, ctx) {
=======
}`
  },
  aesGcm: {
    label: '模板·AES-256-GCM（需配置 key；iv 默认取前 12 字节）',
    code: `async function(bytes, ctx) {
>>>>>>> parent of 8ddbf45 (改背景)
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  const hexToBytes = h => Uint8Array.from(String(h).replace(/\\s+/g, '').match(/../g) || [], x => parseInt(x, 16));
  const bin = atob(String(text).trim());
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const iv = keys.iv ? hexToBytes(keys.iv) : bytes.slice(0, 12);
  const ctAndTag = bytes.slice(iv.length);
  const key = await crypto.subtle.importKey('raw', hexToBytes(keys.key), { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ctAndTag);
  return JSON.parse(new TextDecoder().decode(plain));
<<<<<<< HEAD
}`,
    encode: `async function(value, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
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
=======
}`
  },
  inflate: {
    label: '模板·zlib inflate',
    code: `function(bytes) {
  const raw = pako.inflate(bytes);
  return JSON.parse(new TextDecoder().decode(raw));
}`
  },
  xorByte: {
    label: '模板·单字节 XOR（需配置 key 为 0-255 整数）',
    code: `function(bytes, ctx) {
>>>>>>> parent of 8ddbf45 (改背景)
  const keys = ctx?.keys || {};
  const k = Number(keys.key);
  if (!Number.isFinite(k)) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  const bin = atob(String(text).trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) ^ k;
  try { return JSON.parse(new TextDecoder().decode(out)); }
  catch { return new TextDecoder().decode(out); }
<<<<<<< HEAD
}`,
    encode: `function(value, ctx) {
  const keys = ctx?.keys || {};
  const k = Number(keys.key);
  if (!Number.isFinite(k)) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  const src = new TextEncoder().encode(s);
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ^ k;
  let bin = '';
  for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
  return btoa(bin);
}`,
=======
}`
>>>>>>> parent of 8ddbf45 (改背景)
  },
};
function getTemplates() { return { ...DEFAULT_TEMPLATES, ...(window.HAR_TEMPLATES || {}) }; }

// ================================================================
// 时间戳 / JSON 渲染
// ================================================================
function detectTimestamp(value) {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) return null;
    const s = String(value);
    if (s.length === 10 && s[0] === '1') return 's';
    if (s.length === 13 && s[0] === '1') return 'ms';
    return null;
  }
  if (typeof value === 'string') {
    if (value.length === 10 && /^1\d{9}$/.test(value)) return 's';
    if (value.length === 13 && /^1\d{12}$/.test(value)) return 'ms';
  }
  return null;
}
function formatTimestamp(value, unit) {
  const ms = unit === 's' ? Number(value) * 1000 : Number(value);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function renderJsonWithTs(data) {
  const pre = document.createElement('pre');
  pre.className = 'json-view';
  function add(str, cls) {
    if (!str) return;
    if (cls) { const s = document.createElement('span'); s.className = cls; s.textContent = str; pre.appendChild(s); }
    else pre.appendChild(document.createTextNode(str));
  }
  function walk(v, indent) {
<<<<<<< HEAD
    const pad = "  ".repeat(indent);
    if (v === null) { add("null", "j-null"); return; }
    if (v === undefined) { add("undefined", "j-null"); return; }
    if (typeof v === "string") {
      add(JSON.stringify(v), "j-string");
=======
    const pad = '  '.repeat(indent);
    if (v === null) { add('null', 'j-null'); return; }
    if (v === undefined) { add('undefined', 'j-null'); return; }
    if (typeof v === 'string') {
      add(JSON.stringify(v), 'j-string');
>>>>>>> parent of 8ddbf45 (改背景)
      const unit = detectTimestamp(v);
      if (unit) add(`  /* ${formatTimestamp(v, unit)} */`, 'j-ts');
      return;
    }
    if (typeof v === 'number') {
      add(String(v), 'j-number');
      const unit = detectTimestamp(v);
<<<<<<< HEAD
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
=======
      if (unit) add(`  /* ${formatTimestamp(v, unit)} */`, 'j-ts');
      return;
    }
    if (typeof v === 'boolean') { add(String(v), 'j-bool'); return; }
    if (Array.isArray(v)) {
      if (v.length === 0) { add('[]'); return; }
      add('[\n');
      v.forEach((item, i) => { add(pad + '  '); walk(item, indent + 1); if (i < v.length - 1) add(','); add('\n'); });
      add(pad + ']'); return;
>>>>>>> parent of 8ddbf45 (改背景)
    }
    if (typeof v === 'object') {
      const keys = Object.keys(v);
<<<<<<< HEAD
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
=======
      if (keys.length === 0) { add('{}'); return; }
      add('{\n');
      keys.forEach((k, i) => { add(pad + '  '); add(JSON.stringify(k), 'j-key'); add(': '); walk(v[k], indent + 1); if (i < keys.length - 1) add(','); add('\n'); });
      add(pad + '}'); return;
>>>>>>> parent of 8ddbf45 (改背景)
    }
    add(String(v));
  }
  walk(data, 0);
  return pre;
}

// ================================================================
<<<<<<< HEAD
// 内置解码器（字符串进 / 值出；encode 值进 / 字符串出）
// ================================================================
const BUILTIN_DECODERS = {
  raw: {
    label: "智能解析（自动尝试 URL / Base64 / JSON / form）",
    decode: (text) => smartDecodeText(text),
  },
  utf8: {
    label: "原样文本",
    decode: (text) => (typeof text === "string" ? text : String(text ?? "")),
    encode: (value) => (typeof value === "string" ? value : JSON.stringify(value)),
  },
  json: {
    label: "JSON 解析",
    decode: (text) => { try { return JSON.parse(String(text)); } catch { return String(text); } },
    encode: (value) => JSON.stringify(value),
  },
  form: {
    label: "form-urlencoded 解析",
    decode: (text) => {
      const t = String(text ?? "");
      if (!t) return t;
      const out = {};
      try {
        new URLSearchParams(t).forEach((value, name) => {
          const parsed = smartDecodeValue(value);
          if (Object.prototype.hasOwnProperty.call(out, name)) {
            if (!Array.isArray(out[name])) out[name] = [out[name]];
            out[name].push(parsed);
          } else out[name] = parsed;
        });
      } catch { return t; }
      return out;
    },
    encode: (value) => {
      if (!isPlainObject(value)) return String(value);
      const parts = [];
      for (const [k, v] of Object.entries(value)) {
        const arr = Array.isArray(v) ? v : [v];
        for (const vv of arr) {
          const s = typeof vv === "string" ? vv : JSON.stringify(vv);
          parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(s)}`);
        }
      }
      return parts.join("&");
    },
  },
  base64: {
    label: "Base64 解码（文本）",
    decode: (text) => { try { return atob(String(text).trim()); } catch { return String(text); } },
    encode: (value) => btoa(typeof value === "string" ? value : JSON.stringify(value)),
  },
  base64Json: {
    label: "Base64 解码 + JSON 解析",
    decode: (text) => JSON.parse(atob(String(text).trim())),
    encode: (value) => btoa(JSON.stringify(value)),
  },
  gzip: {
    label: "gzip 解压（输入 base64）",
    decode: (text) => JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(base64ToBytes(String(text))))),
    encode: (value) => {
      const s = typeof value === "string" ? value : JSON.stringify(value);
      return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s)));
    },
  },
  inflate: {
    label: "zlib inflate（输入 base64）",
    decode: (text) => JSON.parse(new TextDecoder("utf-8").decode(pako.inflate(base64ToBytes(String(text))))),
    encode: (value) => {
      const s = typeof value === "string" ? value : JSON.stringify(value);
      return bytesToBase64Str(pako.deflate(new TextEncoder().encode(s)));
    },
  },
  gzipFix: {
    label: "gzip 头修复 + 解压（输入 base64，jiem）",
    decode: (text) => {
      const t = base64ToBytes(String(text));
      if (t.length < 8) throw new Error("长度 < 8");
      t[0] = 0x1f; t[1] = 0x8b; t[2] = 0x08; t[3] = 0x00;
      t[4] = 0x00; t[5] = 0x00; t[6] = 0x00; t[7] = 0x00;
      return JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(t)));
    },
    encode: (value) => {
      const s = typeof value === "string" ? value : JSON.stringify(value);
      return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s)));
    },
  },
  cookie: {
    label: "Cookie 解析",
    decode: (text) => {
      const t = String(text).trim();
      if (!t) return t;
      const out = {};
      t.split(/;\s*/).forEach((part) => {
        const eq = part.indexOf("=");
        if (eq <= 0) return;
        const k = part.slice(0, eq).trim();
        const v = part.slice(eq + 1).trim();
        if (!k) return;
        out[k] = smartDecodeValue(v);
      });
      return Object.keys(out).length ? out : t;
    },
    encode: (value) => {
      if (!isPlainObject(value)) return String(value);
      return Object.entries(value)
        .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join("; ");
    },
  },
  bearer: {
    label: "Bearer/Token/JWT 解析",
    decode: (text) => {
      let t = String(text).trim();
      const m = t.match(/^(Bearer|Basic|Token|JWT)\s+(.+)$/i);
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
    },
    encode: (value) => (typeof value === "string" ? value : JSON.stringify(value)),
  },
=======
// 智能解析
// ================================================================
function looksLikeBase64(s) {
  if (!s || s.length < 12 || s.length % 4 !== 0) return false;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(s)) return false;
  return /[+/=]/.test(s) || s.length >= 16;
}
function smartDecodeValue(v) {
  if (typeof v !== 'string') return v;
  let cur = v;
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(cur)) break;
    try { const d = decodeURIComponent(cur.replace(/\+/g, ' ')); if (d === cur) break; cur = d; } catch { break; }
  }
  if (looksLikeBase64(cur)) {
    try {
      const bin = atob(cur); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) return text;
    } catch { }
  }
  return cur;
}
function tryParseForm(text) {
  if (!text || !text.includes('=')) return null;
  const parts = text.split('&'); const out = {};
  for (const part of parts) {
    const eq = part.indexOf('='); if (eq <= 0) return null;
    const k = smartDecodeValue(part.slice(0, eq).replace(/\+/g, ' '));
    out[k] = smartDecodeValue(part.slice(eq + 1));
  }
  return Object.keys(out).length ? out : null;
}

// ================================================================
// 内置解码器
// ================================================================
const BUILTIN_DECODERS = {
  raw: { label: '智能解析（form → JSON / URL / Base64）', run: (bytes) => {
    let text; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return bytes; }
    if (!text) return text;
    const t = text.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) { try { return JSON.parse(t); } catch {} }
    const form = tryParseForm(text); if (form) return form;
    return text;
  }},
  utf8: { label: 'UTF-8 解码', run: (b) => new TextDecoder('utf-8').decode(b) },
  json: { label: 'UTF-8 + JSON 解析', run: (b) => JSON.parse(new TextDecoder('utf-8').decode(b)) },
  gunzip: { label: 'gzip 解压', run: (b) => pako.ungzip(b) },
  inflate: { label: 'zlib inflate 解压', run: (b) => pako.inflate(b) },
  gzipFix: { label: 'gzip 头修复 + 解压（jiem）', run: (bytes) => {
    const t = new Uint8Array(bytes);
    if (t.length < 8) throw new Error('长度 < 8');
    t[0]=0x1f;t[1]=0x8b;t[2]=0x08;t[3]=0x00;t[4]=0x00;t[5]=0x00;t[6]=0x00;t[7]=0x00;
    const raw = pako.ungzip(t);
    return JSON.parse(new TextDecoder('utf-8').decode(raw));
  }},
  base64ThenJson: { label: 'Base64 解码 + JSON 解析', run: (bytes) => {
    const s = new TextDecoder().decode(bytes).trim(); const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return JSON.parse(new TextDecoder('utf-8').decode(out));
  }},
  cookie: { label: 'Cookie 解析', run: (bytes) => {
    const text = new TextDecoder('utf-8').decode(bytes).trim();
    if (!text) return text;
    const out = {};
    text.split(/;\s*/).forEach(part => {
      const eq = part.indexOf('='); if (eq <= 0) return;
      const k = part.slice(0, eq).trim(); const v = part.slice(eq + 1).trim();
      if (!k) return;
      out[k] = smartDecodeValue(v);
    });
    return Object.keys(out).length ? out : text;
  }},
  bearer: { label: 'Bearer/Token/JWT 解析', run: (bytes) => {
    let text = new TextDecoder('utf-8').decode(bytes).trim();
    const m = text.match(/^(Bearer|Basic|Token|JWT)\s+(.+)$/i);
    if (m) text = m[2].trim();
    const parts = text.split('.');
    if (parts.length === 3 && parts[0] && parts[1]) {
      try {
        const decodeB64Url = s => {
          let t = s.replace(/-/g, '+').replace(/_/g, '/');
          while (t.length % 4) t += '=';
          const bin = atob(t);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          return new TextDecoder('utf-8').decode(bytes);
        };
        return { header: JSON.parse(decodeB64Url(parts[0])), payload: JSON.parse(decodeB64Url(parts[1])), signature: parts[2] };
      } catch { }
    }
    return text;
  }},
>>>>>>> parent of 8ddbf45 (改背景)
};

// ================================================================
// 插件加载
// ================================================================
const loadedPlugins = new Set();
const pluginGlobals = new Map();

function isValidParamName(name) {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return false;
  try { new Function(name, ""); return true; } catch { return false; }
}
function snapshotWindowKeys() { return new Set(Object.getOwnPropertyNames(window)); }
function unloadPlugin(name) {
  const keys = pluginGlobals.get(name);
  if (keys) for (const key of keys) { try { delete window[key]; } catch {} }
  pluginGlobals.delete(name);
  loadedPlugins.delete(name);
  resetLibCache();
}
function loadScriptViaBlob(name, content) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => { URL.revokeObjectURL(url); resolve(); };
<<<<<<< HEAD
    script.onerror = () => { URL.revokeObjectURL(url); reject(new Error("脚本执行出错: " + name)); };
=======
    script.onerror = () => { URL.revokeObjectURL(url); reject(new Error('脚本执行出错: ' + name)); };
>>>>>>> parent of 8ddbf45 (改背景)
    document.head.appendChild(script);
  });
}
async function loadPlugins() {
  if (!window.electronAPI?.listPlugins) return;
  const r = await window.electronAPI.listPlugins();
<<<<<<< HEAD
  if (!r.success) { console.warn("[HAR-Decrypt] 读取插件失败:", r.error); return; }
=======
  if (!r.success) { console.warn('[HAR-Decrypt] 读取插件失败:', r.error); return; }
  console.log('[HAR-Decrypt] 插件目录:', r.dir);
  console.log('[HAR-Decrypt] 找到', r.files.length, '个插件');
>>>>>>> parent of 8ddbf45 (改背景)
  for (const file of r.files) {
    if (loadedPlugins.has(file.name)) continue;
    const before = snapshotWindowKeys();
    try {
      await loadScriptViaBlob(file.name, file.content);
      loadedPlugins.add(file.name);
      const set = pluginGlobals.get(file.name) || new Set();
      for (const key of Object.getOwnPropertyNames(window)) {
        if (!before.has(key)) set.add(key);
      }
      pluginGlobals.set(file.name, set);
    } catch (e) {
      console.error(`[HAR-Decrypt] ❌ 插件加载失败: ${file.name}`, e);
    }
  }
  resetLibCache();
}

<<<<<<< HEAD
const KNOWN_GLOBALS = [
  "CryptoJS", "JSEncrypt", "BigNumber", "Big", "bignumber",
  "sm2", "sm3", "sm4", "smCrypto", "forge", "JSZip",
  "LZString", "lzString", "uuid", "md5", "sha1", "sha256",
  "aesjs", "jsrsasign", "pako",
];
=======
const KNOWN_GLOBALS = ['CryptoJS', 'JSEncrypt', 'BigNumber', 'Big', 'bignumber', 'sm2', 'sm3', 'sm4', 'smCrypto', 'forge', 'JSZip', 'LZString', 'lzString', 'uuid', 'md5', 'sha1', 'sha256', 'aesjs', 'jsrsasign', 'pako'];
>>>>>>> parent of 8ddbf45 (改背景)
let _libCache = null;
function collectLibs() {
  if (_libCache) return _libCache;
  const map = new Map();
  if (window.pako) map.set('pako', window.pako);
  for (const name of KNOWN_GLOBALS) {
    if (window[name] != null && !map.has(name)) map.set(name, window[name]);
  }
<<<<<<< HEAD
  for (const keys of pluginGlobals.values()) {
    for (const name of keys) {
      if (name === "__HAR_PLUGINS__" || map.has(name)) continue;
      if (!isValidParamName(name)) continue;
      const v = window[name];
      if (v === undefined) continue;
      map.set(name, v);
    }
  }
  if (window.__HAR_PLUGINS__ && typeof window.__HAR_PLUGINS__ === "object") {
=======
  if (window.__HAR_PLUGINS__ && typeof window.__HAR_PLUGINS__ === 'object') {
>>>>>>> parent of 8ddbf45 (改背景)
    for (const [k, v] of Object.entries(window.__HAR_PLUGINS__)) {
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) && !map.has(k)) map.set(k, v);
    }
  }
  _libCache = { names: [...map.keys()], values: [...map.values()] };
<<<<<<< HEAD
=======
  console.log('[HAR-Decrypt] 算法可用库:', _libCache.names.join(', '));
>>>>>>> parent of 8ddbf45 (改背景)
  return _libCache;
}
function resetLibCache() { _libCache = null; _compiledFns.clear(); }
function compileDecoderCode(code) {
  try {
    const { names, values } = collectLibs();
    const factory = new Function(...names, `return (${code});`);
    const fn = factory(...values);
    if (typeof fn !== 'function') throw new Error('代码必须是一个函数');
    return { fn, error: null };
  } catch (e) {
    return { fn: null, error: e.message };
  }
}

// ================================================================
// 配置数据
// ================================================================
let fileDecoders = {};
let fileRules = [];
const _compiledFns = new Map();

function getCompiledCustom(id) {
  const c = fileDecoders[id];
  if (!c) return null;
  const encodeCode = c.encode || "";
  const cached = _compiledFns.get(id);
  if (cached && cached.code === c.code && cached.encodeCode === encodeCode) return cached;
  const result = { code: c.code, ...compileDecoderCode(c.code) };
  result.encodeCode = encodeCode;
  if (encodeCode) {
    const encoded = compileDecoderCode(encodeCode);
    result.encodeFn = encoded.fn;
    result.encodeError = encoded.error;
  }
  _compiledFns.set(id, result);
  return result;
}
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

function refreshFileData() {
  fileDecoders = {};
  fileRules = [];
  if (window.HAR_DECODERS && typeof window.HAR_DECODERS === 'object') {
    for (const [id, d] of Object.entries(window.HAR_DECODERS)) {
      if (BUILTIN_DECODERS[id]) continue;
<<<<<<< HEAD
      if (!d || typeof d.code !== "string") continue;
      fileDecoders[id] = {
        label: d.label || id, code: d.code,
        encode: typeof d.encode === "string" ? d.encode : "",
        requires: Array.isArray(d.requires) ? d.requires : [],
        cdn: d.cdn || [],
      };
=======
      if (!d || typeof d.code !== 'string') continue;
      fileDecoders[id] = { label: d.label || id, code: d.code, cdn: d.cdn || [] };
>>>>>>> parent of 8ddbf45 (改背景)
    }
  }
  if (Array.isArray(window.HAR_RULES)) {
    const seenDomains = new Map();
    for (const r of window.HAR_RULES) {
      if (!r || !r.pattern) continue;
<<<<<<< HEAD
      const isHostRule = r.matchHost !== false && !r.isRegex;
      let methods = {};
      if (r.methods && typeof r.methods === "object" && !Array.isArray(r.methods)) {
        methods = normalizeMethodsMap(r.methods);
      } else if (Array.isArray(r.jsonFieldRules)) {
        methods = buildMethodsFromLegacy(r.jsonFieldRules);
      }
      // 关键：新增 paramsDecoder，旧规则没有时 fallback 到 reqDecoder
      const reqDecoder = r.reqDecoder || "raw";
      const paramsDecoder = r.paramsDecoder || reqDecoder;
      const rule = {
        pattern: String(r.pattern), isRegex: !!r.isRegex, matchHost: isHostRule,
        reqDecoder,
        paramsDecoder,
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
      } else {
        fileRules.push(rule);
      }
=======
      fileRules.push({
        pattern: String(r.pattern),
        isRegex: !!r.isRegex,
        reqDecoder: r.reqDecoder || 'raw',
        resDecoder: r.resDecoder || 'raw',
        keys: r.keys || null,
        reqHeaderDecoders: (r.reqHeaderDecoders && typeof r.reqHeaderDecoders === 'object' && !Array.isArray(r.reqHeaderDecoders)) ? r.reqHeaderDecoders : null,
      });
>>>>>>> parent of 8ddbf45 (改背景)
    }
  }
  _compiledFns.clear();
}
function getAllDecoders() {
  const all = { ...BUILTIN_DECODERS };
  for (const [id, d] of Object.entries(fileDecoders)) {
    const comp = getCompiledCustom(id);
    all[id] = {
<<<<<<< HEAD
      label: d.label, encodeCode: comp.encodeCode, requires: d.requires || [],
      decode: comp.fn ? async (text, ctx) => comp.fn(text, ctx) : () => { throw new Error("编译失败: " + comp.error); },
      encode: comp.encodeFn ? async (value, ctx) => comp.encodeFn(value, ctx) : null,
=======
      label: d.label,
      run: comp.fn ? async (bytes, ctx) => comp.fn(bytes, ctx) : () => { throw new Error('编译失败: ' + comp.error); },
>>>>>>> parent of 8ddbf45 (改背景)
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
<<<<<<< HEAD
    if (r.matchHost && !r.isRegex) hit = r.pattern.toLowerCase() === hostname;
    else if (r.isRegex) { try { hit = new RegExp(r.pattern).test(url); } catch {} }
    else hit = url.includes(r.pattern);
    if (!hit) continue;
    return { ...r, urlPath: parsedUrl.pathname, match: r.pattern, note: r.isRegex ? `/${r.pattern}/` : r.pattern };
=======
    if (r.isRegex) { try { hit = new RegExp(r.pattern).test(url); } catch { hit = false; } }
    else hit = url.includes(r.pattern);
    if (hit) return {
      match: r.pattern, reqDecoder: r.reqDecoder, resDecoder: r.resDecoder,
      keys: r.keys || null, reqHeaderDecoders: r.reqHeaderDecoders || null,
      note: r.isRegex ? `/${r.pattern}/` : r.pattern,
    };
>>>>>>> parent of 8ddbf45 (改背景)
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
// 配置读写
// ================================================================
async function reloadFiles() {
  try {
    const [r1, r2] = await Promise.all([
      window.electronAPI.readConfig('decoders'),
      window.electronAPI.readConfig('rules'),
    ]);
    window.HAR_DECODERS = (r1.success && r1.data?.HAR_DECODERS) || {};
    window.HAR_TEMPLATES = (r1.success && r1.data?.HAR_TEMPLATES) || {};
    window.HAR_RULES = (r2.success && r2.data?.HAR_RULES) || [];
    if (!r2.success) {
      try {
<<<<<<< HEAD
        await window.electronAPI.writeConfig("rules",
          "// HAR 域名规则配置（应用自动生成）\nwindow.HAR_RULES = [];\n");
      } catch (e) { console.error("[HAR-Decrypt] 自动修复失败:", e); }
=======
        await window.electronAPI.writeConfig('rules', '// HAR 域名规则配置（应用自动生成）\nwindow.HAR_RULES = [];\n');
        console.log('[HAR-Decrypt] 已自动修复 rules.js');
      } catch (e) { console.error('[HAR-Decrypt] 自动修复失败:', e); }
>>>>>>> parent of 8ddbf45 (改背景)
    }
    refreshFileData();
    renderDecoderList();
    fillTemplateSelect();
    if (state.har) rebuildEntryList();
<<<<<<< HEAD
  } catch (e) { showToast("重载失败: " + e.message, "err"); }
=======
    console.log('[HAR-Decrypt] 配置已重载：算法', Object.keys(fileDecoders).length, '规则', fileRules.length);
  } catch (e) {
    showToast('重载失败: ' + e.message, 'err');
  }
>>>>>>> parent of 8ddbf45 (改背景)
}
async function rewriteDecodersFile() {
<<<<<<< HEAD
  const rd = await window.electronAPI.readConfig("decoders");
  const oldText = rd.content || "";
  const oldLines = oldText.split("\n");
  let cutLine = oldLines.length;
  for (let i = 0; i < oldLines.length; i++) {
    if (/window\.HAR_DECODERS\s*=/.test(oldLines[i]) || /Object\.assign\(\s*window\.HAR_DECODERS/.test(oldLines[i])) {
      cutLine = i; break;
    }
  }
  const head = oldLines.slice(0, cutLine).join("\n").trimEnd();
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const decLines = ["window.HAR_DECODERS = {"];
  for (const id of Object.keys(fileDecoders)) {
=======
  const rd = await window.electronAPI.readConfig('decoders');
  const oldText = rd.content || '';
  const oldLines = oldText.split('\n');

  let cutLine = oldLines.length;
  for (let i = 0; i < oldLines.length; i++) {
    if (/window\.HAR_DECODERS\s*=/.test(oldLines[i]) || /Object\.assign\(\s*window\.HAR_DECODERS/.test(oldLines[i])) {
      cutLine = i;
      break;
    }
  }
  const head = oldLines.slice(0, cutLine).join('\n').trimEnd();

  const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const decLines = ['window.HAR_DECODERS = {'];
  const ids = Object.keys(fileDecoders);
  for (const id of ids) {
>>>>>>> parent of 8ddbf45 (改背景)
    const d = fileDecoders[id];
    decLines.push(`  ${id}: {`);
    decLines.push(`    label: ${JSON.stringify(d.label)},`);
    decLines.push(`    cdn: ${JSON.stringify(d.cdn || [])},`);
    decLines.push(`    code: \`${esc(d.code)}\``);
    if (d.encode) decLines.push(`    encode: \`${esc(d.encode)}\`,`);
    decLines.push(`  },`);
  }
<<<<<<< HEAD
  decLines.push("};");
  const newText = (head ? head + "\n\n" : "") + decLines.join("\n") + "\n";
  const w = await window.electronAPI.writeConfig("decoders", newText);
=======
  decLines.push('};');

  const newText = (head ? head + '\n\n' : '') + decLines.join('\n') + '\n';
  const w = await window.electronAPI.writeConfig('decoders', newText);
>>>>>>> parent of 8ddbf45 (改背景)
  if (!w.success) throw new Error(w.error);
}
async function rewriteRulesFile() {
<<<<<<< HEAD
  const rd = await window.electronAPI.readConfig("rules");
  const oldText = rd.content || "";
  const oldLines = oldText.split("\n");
=======
  const rd = await window.electronAPI.readConfig('rules');
  const oldText = rd.content || '';
  const oldLines = oldText.split('\n');

>>>>>>> parent of 8ddbf45 (改背景)
  let cutLine = oldLines.length;
  for (let i = 0; i < oldLines.length; i++) {
    if (/window\.HAR_RULES/.test(oldLines[i])) { cutLine = i; break; }
  }
<<<<<<< HEAD
  const head = oldLines.slice(0, cutLine).join("\n").trimEnd();
  function cleanField(f) {
    const o = { param: f.param, decoderId: f.decoderId || "raw", fields: [] };
    if (f.fields?.length) o.fields = f.fields.map(cleanField);
    return o;
  }
  const output = fileRules.map((r) => {
    const out = {
      pattern: r.pattern, isRegex: !!r.isRegex, matchHost: !!r.matchHost,
      reqDecoder: r.reqDecoder || "raw",
      paramsDecoder: r.paramsDecoder || "raw",
      resDecoder: r.resDecoder || "raw",
    };
    if (r.keys && typeof r.keys === "object" && !Array.isArray(r.keys)) out.keys = r.keys;
    if (r.reqHeaderDecoders && typeof r.reqHeaderDecoders === "object" && !Array.isArray(r.reqHeaderDecoders))
      out.reqHeaderDecoders = r.reqHeaderDecoders;
    if (r.methods && Object.keys(r.methods).length) {
      out.methods = {};
      for (const [m, arr] of Object.entries(r.methods)) {
        if (!arr || !arr.length) continue;
        out.methods[m] = arr.map((p) => ({
          path: p.path || "", target: p.target || "body",
          fields: (p.fields || []).map(cleanField),
        }));
      }
    }
    return out;
  });
  const body = "window.HAR_RULES = " + JSON.stringify(output, null, 2) + ";";
  const newText = (head ? head + "\n\n" : "") + body + "\n";
  const w = await window.electronAPI.writeConfig("rules", newText);
=======
  const head = oldLines.slice(0, cutLine).join('\n').trimEnd();

  const ruleLines = ['window.HAR_RULES = ['];
  for (const r of fileRules) {
    ruleLines.push('  {');
    ruleLines.push(`    pattern: ${JSON.stringify(r.pattern)},`);
    ruleLines.push(`    isRegex: ${!!r.isRegex},`);
    ruleLines.push(`    reqDecoder: ${JSON.stringify(r.reqDecoder || 'raw')},`);
    const parts = [`    resDecoder: ${JSON.stringify(r.resDecoder || 'raw')}`];
    if (r.keys && typeof r.keys === 'object' && !Array.isArray(r.keys)) {
      const ks = JSON.stringify(r.keys, null, 2).split('\n').join('\n    ');
      parts.push(`    keys: ${ks}`);
    }
    if (r.reqHeaderDecoders && typeof r.reqHeaderDecoders === 'object' && !Array.isArray(r.reqHeaderDecoders)) {
      const hs = JSON.stringify(r.reqHeaderDecoders, null, 2).split('\n').join('\n    ');
      parts.push(`    reqHeaderDecoders: ${hs}`);
    }
    ruleLines.push(parts.join(',\n'));
    ruleLines.push('  },');
  }
  ruleLines.push('];');

  const newText = (head ? head + '\n\n' : '') + ruleLines.join('\n') + '\n';
  const w = await window.electronAPI.writeConfig('rules', newText);
>>>>>>> parent of 8ddbf45 (改背景)
  if (!w.success) throw new Error(w.error);
}

// ================================================================
// 状态
// ================================================================
const PAGE_SIZE = 300;
const MAX_AUTO_DECRYPT = 5 * 1024 * 1024;
function makeFilter() { return { include: new Set(), exclude: new Set() }; }
const state = {
<<<<<<< HEAD
  har: null, entries: [], currentIndex: -1, detailTab: "request",
  decryptState: new Map(), marks: new Map(), headerDecryptState: new Map(),
=======
  har: null, entries: [], currentIndex: -1,
  decryptState: new Map(), marks: new Map(),
  headerDecryptState: new Map(),
>>>>>>> parent of 8ddbf45 (改背景)
  filters: { method: makeFilter(), type: makeFilter(), mime: makeFilter(), domain: makeFilter() },
  entryMeta: new Map(), renderedCount: 0,
};
const $ = (id) => document.getElementById(id);
<<<<<<< HEAD
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
=======
const menuBtn = $('menuBtn'), menuPanel = $('menuPanel');
const harInput = $('harInput'), stats = $('stats'), toggleFilterBtn = $('toggleFilterBtn');
const autoAllBtn = $('autoDecryptAllBtn'), exportBtn = $('exportBtn'), exportListBtn = $('exportListBtn');
const entryList = $('entryList'), detailPanel = $('detailPanel'), filterBar = $('filterBar');
const entryListAside = document.querySelector('aside');

const TYPE_LABELS = { js:'JS', xhr:'XHR', css:'CSS', html:'HTML', image:'图片', audio:'音频', video:'视频', font:'字体', text:'文本', other:'其它' };
const TYPE_ICONS = { image:'🖼', audio:'🔊', video:'🎬' };

function classifyEntry(entry) {
  const url = (entry.request?.url || '').toLowerCase().split('?')[0];
  const mime = (entry.response?.content?.mimeType || '').toLowerCase();
  const ext = (url.match(/\.([a-z0-9]+)$/) || [])[1] || '';
  if (mime.includes('javascript') || mime.includes('ecmascript') || ext === 'js' || ext === 'mjs' || ext === 'map') return 'js';
  if (mime.includes('css') || ext === 'css') return 'css';
  if (mime.includes('html') || ext === 'html' || ext === 'htm') return 'html';
  if (mime.startsWith('image/') || /^(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/.test(ext)) return 'image';
  if (mime.startsWith('audio/') || /^(mp3|wav|ogg|m4a|flac|aac)$/.test(ext)) return 'audio';
  if (mime.startsWith('video/') || /^(mp4|webm|mkv|avi|mov)$/.test(ext)) return 'video';
  if (mime.includes('font') || /^(woff|woff2|ttf|otf|eot)$/.test(ext)) return 'font';
  if (mime.includes('json') || mime.includes('xml')) return 'xhr';
  const m = (entry.request?.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) return 'xhr';
  if (mime.startsWith('text/') || ext === 'txt' || ext === 'csv' || mime === '') return 'text';
  return 'other';
>>>>>>> parent of 8ddbf45 (改背景)
}
function getMimeKey(entry) { const r = (entry.response?.content?.mimeType || '').split(';')[0].trim().toLowerCase(); return r || '(无 MIME)'; }
function getDomain(entry) { try { return new URL(entry.request.url).hostname || '(无域名)'; } catch { return '(无效 URL)'; } }
function getEntryTime(entry) { const t = entry.startedDateTime; if (!t) return 0; const ms = new Date(t).getTime(); return isNaN(ms) ? 0 : ms; }

// ================================================================
// 顶部菜单 / 过滤栏
// ================================================================
<<<<<<< HEAD
function openMenu() { menuPanel.classList.add("show"); menuBtn.classList.add("open"); }
function closeMenu() { menuPanel.classList.remove("show"); menuBtn.classList.remove("open"); }
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (menuPanel.classList.contains("show")) closeMenu(); else openMenu();
=======
function openMenu() { menuPanel.classList.add('show'); menuBtn.classList.add('open'); }
function closeMenu() { menuPanel.classList.remove('show'); menuBtn.classList.remove('open'); }
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (menuPanel.classList.contains('show')) closeMenu(); else openMenu();
>>>>>>> parent of 8ddbf45 (改背景)
});
document.addEventListener('click', (e) => {
  if (!menuPanel.contains(e.target) && e.target !== menuBtn) closeMenu();
});
<<<<<<< HEAD
menuPanel.addEventListener("click", (e) => {
  if (e.target.closest(".menu-item")) {
    if (e.target.closest("input[type=file]") || e.target.tagName === "INPUT") return;
=======
menuPanel.addEventListener('click', (e) => {
  if (e.target.closest('.menu-item')) {
    if (e.target.closest('input[type=file]') || e.target.tagName === 'INPUT') return;
>>>>>>> parent of 8ddbf45 (改背景)
    setTimeout(closeMenu, 50);
  }
});
let filterCollapseTimer = null;
<<<<<<< HEAD
function expandFilter() { filterBar.classList.remove("collapsed"); toggleFilterBtn.textContent = "🔍 收起过滤"; clearTimeout(filterCollapseTimer); }
function collapseFilter() { filterBar.classList.add("collapsed"); toggleFilterBtn.textContent = "🔍 展开过滤"; }
=======
function expandFilter() { filterBar.classList.remove('collapsed'); toggleFilterBtn.textContent = '🔍 收起过滤'; clearTimeout(filterCollapseTimer); }
function collapseFilter() { filterBar.classList.add('collapsed'); toggleFilterBtn.textContent = '🔍 展开过滤'; }
>>>>>>> parent of 8ddbf45 (改背景)
function scheduleCollapseFilter() {
  clearTimeout(filterCollapseTimer);
  filterCollapseTimer = setTimeout(() => { if (!filterBar.classList.contains('collapsed')) collapseFilter(); }, 400);
}
<<<<<<< HEAD
stats.addEventListener("click", () => { if (filterBar.classList.contains("collapsed")) expandFilter(); else collapseFilter(); });
toggleFilterBtn.addEventListener("click", () => { if (filterBar.classList.contains("collapsed")) expandFilter(); else collapseFilter(); });
filterBar.addEventListener("mouseenter", () => clearTimeout(filterCollapseTimer));
filterBar.addEventListener("mouseleave", () => { if (!filterBar.classList.contains("collapsed")) scheduleCollapseFilter(); });
=======
stats.addEventListener('click', () => { if (filterBar.classList.contains('collapsed')) expandFilter(); else collapseFilter(); });
toggleFilterBtn.addEventListener('click', () => { if (filterBar.classList.contains('collapsed')) expandFilter(); else collapseFilter(); });
filterBar.addEventListener('mouseenter', () => clearTimeout(filterCollapseTimer));
filterBar.addEventListener('mouseleave', () => { if (!filterBar.classList.contains('collapsed')) scheduleCollapseFilter(); });
>>>>>>> parent of 8ddbf45 (改背景)

// ================================================================
// 加载 HAR
// ================================================================
async function loadHarFile(file) {
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在读取 ${sizeMB}MB…</div>`;
  await new Promise(r => setTimeout(r, 30));
  try {
    const text = await file.text();
    detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在解析…</div>`;
    await new Promise(r => setTimeout(r, 30));
    const har = JSON.parse(text);
    if (!har.log?.entries) throw new Error('不是有效的 HAR 文件');
    state.har = har;
    state.decryptState.clear();
    state.headerDecryptState.clear();
    state.marks.clear();
    state.entryMeta.clear();
    state.currentIndex = -1;
    state.renderedCount = 0;
    pinnedHeaders.clear();
    detailPanel.innerHTML = `<div class="empty" style="padding-top:80px;">正在构建索引…</div>`;
    await new Promise(r => setTimeout(r, 30));
    resetAllFilters();
    buildFilterOptions();
    rebuildEntryList();
    renderDetail();
    toggleFilterBtn.disabled = false;
    autoAllBtn.disabled = false;
    exportBtn.disabled = false;
    exportListBtn.disabled = false;
    showToast(`已加载 ${file.name}（${har.log.entries.length} 条）`, 'ok');
  } catch (err) {
    detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>';
<<<<<<< HEAD
    alert("读取 HAR 失败: " + err.message);
=======
    alert('读取 HAR 失败: ' + err.message);
>>>>>>> parent of 8ddbf45 (改背景)
  }
}
harInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  await loadHarFile(file);
  e.target.value = '';
});

let dragOverlay = null, dragCounter = 0;
function showDragOverlay() {
  if (!dragOverlay) {
    dragOverlay = document.createElement('div');
    dragOverlay.className = 'drag-overlay';
    dragOverlay.innerHTML = `<div class="drag-overlay-inner"><div class="drag-icon">📥</div><div class="drag-text">松开鼠标，导入 HAR 文件</div><div class="drag-hint">支持 .har / .json</div></div>`;
    document.body.appendChild(dragOverlay);
  }
  dragOverlay.style.display = 'flex';
}
<<<<<<< HEAD
function hideDragOverlay() { if (dragOverlay) dragOverlay.style.display = "none"; }
function hasFiles(e) { return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files"); }
document.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter++; if (dragCounter === 1) showDragOverlay(); });
document.addEventListener("dragover", (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
document.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; hideDragOverlay(); } });
document.addEventListener("drop", async (e) => {
=======
function hideDragOverlay() { if (dragOverlay) dragOverlay.style.display = 'none'; }
function hasFiles(e) { return e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files'); }
document.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter++; if (dragCounter === 1) showDragOverlay(); });
document.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
document.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragCounter--; if (dragCounter <= 0) { dragCounter = 0; hideDragOverlay(); } });
document.addEventListener('drop', async (e) => {
>>>>>>> parent of 8ddbf45 (改背景)
  if (!hasFiles(e)) return;
  e.preventDefault(); dragCounter = 0; hideDragOverlay();
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
<<<<<<< HEAD
  if (!/\.(har|json)$/i.test(file.name) && file.type !== "application/json") { showToast("请拖入 .har 或 .json", "err"); return; }
=======
  if (!/\.(har|json)$/i.test(file.name) && file.type !== 'application/json') { showToast('请拖入 .har 或 .json', 'err'); return; }
>>>>>>> parent of 8ddbf45 (改背景)
  await loadHarFile(file);
});

// ================================================================
// 过滤
// ================================================================
function buildFilterOptions() {
  const counts = { method: new Map(), type: new Map(), mime: new Map(), domain: new Map() };
  state.entryMeta.clear();
  state.har.log.entries.forEach((entry, idx) => {
    const method = (entry.request?.method || 'GET').toUpperCase();
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
    const g = document.getElementById(gid); g.innerHTML = '';
    const all = document.createElement('button');
    all.className = 'tag-btn all-btn active'; all.dataset.value = '__ALL__'; all.textContent = '全部'; g.appendChild(all);
    items.forEach(([v, c]) => {
      const b = document.createElement('button');
      b.className = 'tag-btn'; b.dataset.value = v;
      b.textContent = `${gid === 'typeGroup' ? (TYPE_LABELS[v] || v) : v} (${c})`;
      g.appendChild(b);
    });
  };
<<<<<<< HEAD
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
=======
  render('methodGroup', [...counts.method.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  render('typeGroup', [...counts.type.entries()].sort((a, b) => b[1] - a[1]));
  render('mimeGroup', [...counts.mime.entries()].sort((a, b) => b[1] - a[1]));
  render('domainGroup', [...counts.domain.entries()].sort((a, b) => b[1] - a[1]));
}
function handleGroupClick(e, key) {
  const btn = e.target.closest('.tag-btn'); if (!btn) return;
  const group = btn.parentElement; const v = btn.dataset.value; const f = state.filters[key];
  if (v === '__ALL__') { f.include.clear(); f.exclude.clear(); }
  else if (f.include.has(v)) { f.include.delete(v); f.exclude.add(v); }
  else if (f.exclude.has(v)) { f.exclude.delete(v); }
  else { f.include.add(v); }
  group.querySelectorAll('.tag-btn').forEach(b => {
    const vv = b.dataset.value;
    b.classList.remove('include', 'exclude', 'active');
    if (vv === '__ALL__') { if (!f.include.size && !f.exclude.size) b.classList.add('active'); }
    else if (f.include.has(vv)) b.classList.add('include');
    else if (f.exclude.has(vv)) b.classList.add('exclude');
  });
  rebuildEntryList();
}
$('methodGroup').addEventListener('click', (e) => handleGroupClick(e, 'method'));
$('typeGroup').addEventListener('click', (e) => handleGroupClick(e, 'type'));
$('mimeGroup').addEventListener('click', (e) => handleGroupClick(e, 'mime'));
$('domainGroup').addEventListener('click', (e) => handleGroupClick(e, 'domain'));
function resetAllFilters() {
  Object.values(state.filters).forEach(f => { f.include.clear(); f.exclude.clear(); });
  ['method', 'type', 'mime', 'domain'].forEach(k => {
    document.getElementById(k + 'Group').querySelectorAll('.tag-btn').forEach(b => {
      b.classList.remove('include', 'exclude', 'active');
      if (b.dataset.value === '__ALL__') b.classList.add('active');
    });
  });
}
$('resetFilterBtn').addEventListener('click', () => { resetAllFilters(); rebuildEntryList(); });
>>>>>>> parent of 8ddbf45 (改背景)

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
<<<<<<< HEAD
      entry, originalIndex: idx, url: entry.request?.url || "",
      method: meta.method, type: meta.type, status: entry.response?.status || 0,
      time: meta.time, rule: matchRule(entry.request?.url || ""),
=======
      entry, originalIndex: idx, url: entry.request?.url || '',
      method: meta.method, type: meta.type,
      status: entry.response?.status || 0, time: meta.time,
      rule: matchRule(entry.request?.url || ''),
>>>>>>> parent of 8ddbf45 (改背景)
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
<<<<<<< HEAD
  if (reset) { entryList.innerHTML = ""; state.renderedCount = 0; }
=======
  if (reset) { entryList.innerHTML = ''; state.renderedCount = 0; }
>>>>>>> parent of 8ddbf45 (改背景)
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
  let more = document.getElementById('loadMoreTip');
  if (state.renderedCount < state.entries.length) {
    const remain = state.entries.length - state.renderedCount;
    if (!more) {
<<<<<<< HEAD
      more = document.createElement("div");
      more.id = "loadMoreTip";
      more.style.cssText = "padding:16px;text-align:center;color:rgba(255,255,255,.5);cursor:pointer;border-top:1px solid rgba(255,255,255,.08);font-size:12px;";
      more.addEventListener("click", () => renderList(false));
=======
      more = document.createElement('div');
      more.id = 'loadMoreTip';
      more.style.cssText = 'padding:16px;text-align:center;color:rgba(255,255,255,.5);cursor:pointer;border-top:1px solid rgba(255,255,255,.08);font-size:12px;';
      more.addEventListener('click', () => renderList(false));
>>>>>>> parent of 8ddbf45 (改背景)
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
  const div = document.createElement('div');
  const mark = state.marks.get(item.originalIndex);
  let cls = 'entry';
  if (i === state.currentIndex) cls += ' active';
  if (mark?.color) cls += ' marked-' + mark.color;
  div.className = cls;
  div.dataset.idx = item.originalIndex;
<<<<<<< HEAD
  const sc = item.status >= 200 && item.status < 300 ? "ok" : item.status >= 400 ? "err" : "";
  const icon = TYPE_ICONS[item.type] ? TYPE_ICONS[item.type] + " " : "";
=======
  const sc = item.status >= 200 && item.status < 300 ? 'ok' : item.status >= 400 ? 'err' : '';
  const icon = TYPE_ICONS[item.type] ? TYPE_ICONS[item.type] + ' ' : '';
>>>>>>> parent of 8ddbf45 (改背景)
  div.innerHTML = `
    <span class="method method-${escapeHtml(item.method)}">${escapeHtml(item.method)}</span>
    <span class="type-tag">${icon}${escapeHtml(TYPE_LABELS[item.type] || item.type)}</span>
    <span class="url" title="${escapeHtml(item.url)}">${escapeHtml(item.url)}</span>
    <span class="status ${sc}">${item.status || ''}</span>
    ${mark?.note ? `<div style="width:100%;margin-top:3px;font-size:11px;color:rgba(255,255,255,.55);font-style:italic;">备注：${escapeHtml(mark.note)}</div>` : ''}
  `;
  let pressTimer = null, longPressed = false;
<<<<<<< HEAD
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
=======
  const startPress = () => {
    longPressed = false; div.classList.add('pressing');
    pressTimer = setTimeout(async () => {
      longPressed = true; div.classList.remove('pressing');
      try {
        const code = await generateFetchCode(item.entry, item.rule);
        await navigator.clipboard.writeText(code);
        showToast('已复制 Node.js 代码', 'ok');
      } catch (err) { showToast('复制失败: ' + err.message, 'err'); }
    }, 600);
  };
  const cancelPress = () => { clearTimeout(pressTimer); div.classList.remove('pressing'); };
  div.addEventListener('mousedown', startPress);
  div.addEventListener('mouseup', cancelPress);
  div.addEventListener('mouseleave', cancelPress);
  div.addEventListener('click', () => {
    if (longPressed) { longPressed = false; return; }
    state.currentIndex = i;
    entryList.querySelectorAll('.entry.active').forEach(el => el.classList.remove('active'));
    div.classList.add('active');
    pinnedHeaders.clear();
    renderDetail();
  });
  div.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e.clientX, e.clientY, item); });
  return div;
}
entryListAside.addEventListener('scroll', function () {
>>>>>>> parent of 8ddbf45 (改背景)
  if (this.scrollTop + this.clientHeight >= this.scrollHeight - 100) {
    if (state.renderedCount < state.entries.length) renderList(false);
  }
});

// ================================================================
// 右键菜单
// ================================================================
let ctxMenu = null;
function closeContextMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
<<<<<<< HEAD
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
=======
document.addEventListener('click', (e) => { if (ctxMenu && !ctxMenu.contains(e.target)) closeContextMenu(); });
function showContextMenu(x, y, item) {
  closeContextMenu();
  const origIdx = item.originalIndex; const mark = state.marks.get(origIdx) || {};
  const menu = document.createElement('div');
  menu.style.cssText = 'position:fixed;z-index:2000;background:rgba(30,30,35,.97);color:#ddd;border:1px solid rgba(255,255,255,.15);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.6);padding:8px;min-width:190px;font-size:12px;backdrop-filter:blur(20px);';
  const noteBtn = document.createElement('button');
  noteBtn.style.cssText = 'display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;cursor:pointer;font-size:12px;color:#ddd;border-radius:6px;font-family:inherit;transition:background .12s;';
  noteBtn.textContent = mark.note ? '编辑备注…' : '添加备注…';
  noteBtn.addEventListener('mouseenter', () => noteBtn.style.background = 'rgba(255,255,255,.08)');
  noteBtn.addEventListener('mouseleave', () => noteBtn.style.background = 'transparent');
  noteBtn.addEventListener('click', () => {
    const note = prompt('输入备注（留空清除）:', mark.note || '');
>>>>>>> parent of 8ddbf45 (改背景)
    if (note === null) { closeContextMenu(); return; }
    const m = state.marks.get(origIdx) || {};
    if (note.trim()) m.note = note.trim(); else delete m.note;
    if (!m.color && !m.note) state.marks.delete(origIdx); else state.marks.set(origIdx, m);
<<<<<<< HEAD
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
=======
    renderList(); closeContextMenu();
  });
  menu.appendChild(noteBtn);
  document.body.appendChild(menu); ctxMenu = menu;
>>>>>>> parent of 8ddbf45 (改背景)
  const rect = menu.getBoundingClientRect();
  let fx = x, fy = y;
  if (rect.right > window.innerWidth - 4) fx = window.innerWidth - rect.width - 4;
  if (rect.bottom > window.innerHeight - 4) fy = window.innerHeight - rect.height - 4;
<<<<<<< HEAD
  menu.style.left = fx + "px";
  menu.style.top = fy + "px";
=======
  menu.style.left = fx + 'px'; menu.style.top = fy + 'px';
>>>>>>> parent of 8ddbf45 (改背景)
}

// ================================================================
// 请求头
// ================================================================
const pinnedHeaders = new Set();
function buildHeadersSection({ title, headers, originalIndex, rule }) {
  const w = document.createElement('div');
  const t = document.createElement('div');
  t.className = 'section-title';
  t.textContent = `${title}（${headers.length}）`;
  w.appendChild(t);
  if (!headers.length) { const p = document.createElement('pre'); p.className = 'empty'; p.textContent = '（无）'; w.appendChild(p); return w; }
  const list = document.createElement('div'); list.className = 'headers-list';
  headers.forEach((h) => {
    const stateKey = `${originalIndex}:${h.name}`;
    const row = document.createElement('div'); row.className = 'header-row';
    const line = document.createElement('div'); line.className = 'header-line';
    const nameEl = document.createElement('span'); nameEl.className = 'header-name'; nameEl.textContent = h.name; line.appendChild(nameEl);
    const valEl = document.createElement('span'); valEl.className = 'header-value'; valEl.textContent = h.value; valEl.title = h.value; line.appendChild(valEl);
    row.appendChild(line);
<<<<<<< HEAD
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
=======
    const expand = document.createElement('div'); expand.className = 'header-parse-panel'; expand.style.display = 'none'; row.appendChild(expand);
    let hoverTimer = null, leaveTimer = null;
    const showPanel = () => {
      if (!expand.dataset.initialized) { expand.dataset.initialized = '1'; initHeaderParsePanel(expand, h.value, stateKey, rule, h.name); }
      expand.style.display = 'block';
    };
    const hidePanel = () => { if (pinnedHeaders.has(stateKey)) return; expand.style.display = 'none'; };
    row.addEventListener('mouseenter', () => { if (pinnedHeaders.has(stateKey)) return; clearTimeout(leaveTimer); clearTimeout(hoverTimer); hoverTimer = setTimeout(showPanel, 200); });
    row.addEventListener('mouseleave', () => { if (pinnedHeaders.has(stateKey)) return; clearTimeout(hoverTimer); clearTimeout(leaveTimer); leaveTimer = setTimeout(hidePanel, 300); });
    row.addEventListener('click', (e) => {
      if (e.target.closest('select, button, input, textarea, a')) return;
      if (pinnedHeaders.has(stateKey)) { pinnedHeaders.delete(stateKey); row.classList.remove('pinned'); if (!row.matches(':hover')) expand.style.display = 'none'; }
      else { pinnedHeaders.add(stateKey); row.classList.add('pinned'); showPanel(); }
>>>>>>> parent of 8ddbf45 (改背景)
    });
    list.appendChild(row);
  });
  w.appendChild(list);
  return w;
}
function getHeaderDecryptState(stateKey) {
<<<<<<< HEAD
  if (!state.headerDecryptState.has(stateKey))
    state.headerDecryptState.set(stateKey, { decoderId: "", result: null, error: null });
=======
  if (!state.headerDecryptState.has(stateKey)) state.headerDecryptState.set(stateKey, { decoderId: '', result: null, error: null });
>>>>>>> parent of 8ddbf45 (改背景)
  return state.headerDecryptState.get(stateKey);
}
function initHeaderParsePanel(container, value, stateKey, rule, headerName, requestIndex) {
  const ds = getHeaderDecryptState(stateKey);
  const tb = document.createElement('div'); tb.className = 'toolbar';
  const sel = document.createElement('select');
  const all = getAllDecoders();
  for (const [id, d] of Object.entries(all)) {
<<<<<<< HEAD
    const o = document.createElement("option");
    o.value = id; o.textContent = d.label;
    sel.appendChild(o);
=======
    const o = document.createElement('option'); o.value = id; o.textContent = d.label; sel.appendChild(o);
>>>>>>> parent of 8ddbf45 (改背景)
  }
  let defaultId = 'raw';
  if (rule && rule.reqHeaderDecoders) {
    const lname = (headerName || '').toLowerCase();
    for (const [k, v] of Object.entries(rule.reqHeaderDecoders)) {
      if (k.toLowerCase() === lname && all[v]) { defaultId = v; break; }
    }
  }
<<<<<<< HEAD
  if (defaultId === "raw") {
    const lower = (headerName || "").toLowerCase();
    if (lower === "cookie") defaultId = "cookie";
    else if (lower === "authorization" || lower === "proxy-authorization") defaultId = "bearer";
=======
  if (defaultId === 'raw') {
    const lower = (headerName || '').toLowerCase();
    if (lower === 'cookie') defaultId = 'cookie';
    else if (lower === 'authorization' || lower === 'proxy-authorization') defaultId = 'bearer';
>>>>>>> parent of 8ddbf45 (改背景)
  }
  if (ds.decoderId) defaultId = ds.decoderId;
  sel.value = defaultId;
  tb.appendChild(sel); container.appendChild(tb);
  const resultEl = document.createElement('div'); container.appendChild(resultEl);
  const doParse = async (id) => {
    ds.decoderId = id;
    resultEl.innerHTML = '<pre class="loading">解析中…</pre>';
    try {
<<<<<<< HEAD
      const result = await runDecoder(id, value || "", { rule, keys: rule?.keys || {}, requestIndex });
      ds.result = result; ds.error = null;
      renderHeaderResult(resultEl, result);
    } catch (e) {
      ds.result = null; ds.error = e.message || String(e);
      renderHeaderError(resultEl, ds.error);
    }
=======
      const bytes = new TextEncoder().encode(value || '');
      const result = await runDecoder(id, bytes, { rule, keys: rule?.keys || {} });
      ds.result = result; ds.error = null;
      renderHeaderResult(resultEl, result);
    } catch (e) { ds.result = null; ds.error = e.message || String(e); renderHeaderError(resultEl, ds.error); }
>>>>>>> parent of 8ddbf45 (改背景)
  };
  sel.addEventListener('change', () => doParse(sel.value));
  if (ds.result !== null || ds.error) { if (ds.error) renderHeaderError(resultEl, ds.error); else renderHeaderResult(resultEl, ds.result); }
  else { resultEl.innerHTML = '<pre class="loading">解析中…</pre>'; doParse(defaultId); }
}
function renderHeaderResult(container, result) {
<<<<<<< HEAD
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
=======
  container.innerHTML = '';
  if (result === null || result === undefined) { const p = document.createElement('pre'); p.className = 'empty'; p.textContent = '（空）'; container.appendChild(p); return; }
  const isObj = typeof result === 'object' && !(result instanceof Uint8Array) && !(result instanceof ArrayBuffer);
  if (isObj) container.appendChild(renderJsonWithTs(result));
  else { const d = bytesToDisplay(result); const p = document.createElement('pre'); p.textContent = d.text; container.appendChild(p); }
  const btn = document.createElement('button'); btn.className = 'copy-btn'; btn.textContent = '复制结果';
  btn.addEventListener('click', async () => {
    try { const t = typeof result === 'string' ? result : JSON.stringify(result, null, 2); await navigator.clipboard.writeText(t); btn.textContent = '已复制'; setTimeout(() => btn.textContent = '复制结果', 1500); }
    catch { btn.textContent = '复制失败'; }
>>>>>>> parent of 8ddbf45 (改背景)
  });
  container.appendChild(btn);
}
function renderHeaderError(container, error) {
  container.innerHTML = '';
  const p = document.createElement('pre'); p.className = 'err'; p.textContent = error; container.appendChild(p);
}

// ================================================================
// 解密 / 加密执行
// ================================================================
function getRequiredCryptoFields(id) {
  const definition = fileDecoders[id] || BUILTIN_DECODERS[id];
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
  const d = getAllDecoders()[id];
<<<<<<< HEAD
  if (!d) throw new Error("未知解码方式: " + id);
  return await d.decode(String(text ?? ""), await getDecoderContext(id, ctx));
=======
  if (!d) throw new Error('未知解码方式: ' + id);
  return await d.run(bytes, ctx);
>>>>>>> parent of 8ddbf45 (改背景)
}
async function runEncoder(id, value, ctx) {
  const d = getAllDecoders()[id];
  if (!d?.encode) throw new Error(`「${d?.label || id}」没有配对加密函数`);
  return await d.encode(value, await getDecoderContext(id, ctx));
}

async function runDecryptForItem(item, ds, { skipBodies = false } = {}) {
  const { entry, rule } = item;
<<<<<<< HEAD
  const ctx = { rule, keys: rule?.keys || {}, requestIndex: item.originalIndex };
  const jobs = [];

  // query 参数：使用 paramsDecoder（fallback 到 reqDecoder 兼容旧规则）
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

  // 请求体：reqDecoder
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

  // 响应体：resDecoder
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
=======
  const reqId = ds.reqDecoder || rule?.reqDecoder || 'raw';
  const resId = ds.resDecoder || rule?.resDecoder || 'raw';
  ds.reqDecoder = reqId; ds.resDecoder = resId;
  const reqSize = entry.request?.bodySize || 0;
  const resSize = entry.response?.content?.size || 0;
  const ctx = { rule, keys: rule?.keys || {} };
  const jobs = [];
  const rt = entry.request?.postData?.text;
  if (rt) {
    if (reqSize > MAX_AUTO_DECRYPT) { ds.reqError = `请求体过大 (${(reqSize/1024/1024).toFixed(1)}MB)`; ds.reqResult = null; }
    else jobs.push((async () => {
      try { const b = harTextToBytes(rt, entry.request.postData.encoding || ''); ds.reqResult = await runDecoder(reqId, b, ctx); ds.reqError = null; }
      catch (e) { ds.reqError = e.message || String(e); ds.reqResult = null; }
    })());
  }
  const st = entry.response?.content?.text;
  if (st) {
    if (resSize > MAX_AUTO_DECRYPT) { ds.resError = `响应体过大 (${(resSize/1024/1024).toFixed(1)}MB)`; ds.resResult = null; }
    else jobs.push((async () => {
      try { const b = harTextToBytes(st, entry.response.content.encoding || ''); ds.resResult = await runDecoder(resId, b, ctx); ds.resError = null; }
      catch (e) { ds.resError = e.message || String(e); ds.resResult = null; }
    })());
>>>>>>> parent of 8ddbf45 (改背景)
  }
  await Promise.all(jobs);
}
function getDecryptState(i) {
<<<<<<< HEAD
  if (!state.decryptState.has(i))
    state.decryptState.set(i, {
      reqDecoder: "", reqResult: null, reqError: null,
      queryDecoder: "", queryResult: null, queryError: null, queryLoading: false,
      cryptoKeys: {},
      resDecoder: "", resResult: null, resError: null,
      autoRan: false, loading: false, fieldDecodes: {},
    });
=======
  if (!state.decryptState.has(i)) state.decryptState.set(i, { reqDecoder: '', reqResult: null, reqError: null, resDecoder: '', resResult: null, resError: null, autoRan: false, loading: false });
>>>>>>> parent of 8ddbf45 (改背景)
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
      // 不清空字段规则
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
// 加密对照 / 导出
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
function exportEncoderCode(decoderId) {
  const def = fileDecoders[decoderId];
  if (!def?.encode) throw new Error("没有可导出的加密函数");
  const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  const code = [
    `// 自动导出：${def.label}（${decoderId}）`,
    `// 解密：async function(text, ctx) -> 值`,
    `// 加密：async function(value, ctx) -> 字符串`,
    `window.HAR_ENCODERS = window.HAR_ENCODERS || {};`,
    `window.HAR_ENCODERS[${JSON.stringify(decoderId)}] = {`,
    `  label: ${JSON.stringify(def.label)},`,
    `  decode: \`${esc(def.code)}\`,`,
    `  encode: \`${esc(def.encode)}\`,`,
    `};`, "",
  ].join("\n");
  const blob = new Blob([code], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `encoder-${decoderId}.js`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ================================================================
// 详情渲染
// ================================================================
function renderDetail() {
<<<<<<< HEAD
  if (state.currentIndex < 0 || !state.entries[state.currentIndex]) {
    detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>';
    return;
  }
=======
  if (state.currentIndex < 0 || !state.entries[state.currentIndex]) { detailPanel.innerHTML = '<div class="empty">选择左侧请求查看详情，或将 HAR 文件拖入本页</div>'; return; }
>>>>>>> parent of 8ddbf45 (改背景)
  const item = state.entries[state.currentIndex];
  const { entry, originalIndex, rule, type } = item;
  const ds = getDecryptState(originalIndex);
  const mark = state.marks.get(originalIndex);
  const req = entry.request, res = entry.response;
<<<<<<< HEAD
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
=======
  const reqText = req?.postData?.text || '';
  const resText = res?.content?.text || '';
  const isMedia = type === 'image' || type === 'audio' || type === 'video';
  if (!isMedia && !ds.autoRan && (reqText || resText)) {
    ds.autoRan = true; ds.loading = true;
    runDecryptForItem(item, ds).then(() => {
>>>>>>> parent of 8ddbf45 (改背景)
      ds.loading = false;
      if (state.entries[state.currentIndex]?.originalIndex === originalIndex) renderDetail();
      renderList();
    });
  }
  detailPanel.innerHTML = '';
  const info = document.createElement('div');
  info.innerHTML = `
    <div class="field"><label>URL</label><div class="value">${escapeHtml(item.url)}</div></div>
    <div class="field"><label>方法 / 类型 / 状态 / 时间</label><div class="value">
      <span class="method method-${escapeHtml(item.method)}">${escapeHtml(item.method)}</span>
      &nbsp;<span class="tag">${TYPE_ICONS[type] ? TYPE_ICONS[type] + ' ' : ''}${escapeHtml(TYPE_LABELS[type] || type)}</span>
      &nbsp;${res?.status || ''} ${escapeHtml(res?.statusText || '')}
      &nbsp;<span class="tag">${escapeHtml(formatTime(entry.startedDateTime))}</span>
      ${rule ? `&nbsp;<span class="tag" style="background:rgba(217,119,6,.2);color:#ffcc80;">规则: ${escapeHtml(rule.note || String(rule.match))}${rule.keys ? ' · 含密钥' : ''}</span>` : ''}
    </div></div>
    ${mark?.note ? `<div class="field"><label>备注</label><div class="value" style="color:rgba(255,255,255,.65);font-style:italic;">${escapeHtml(mark.note)}</div></div>` : ''}
  `;
  detailPanel.appendChild(info);
<<<<<<< HEAD

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
        // 不清空字段规则
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
=======
  detailPanel.appendChild(buildHeadersSection({ title: '请求头', headers: req?.headers || [], originalIndex, rule }));
  if (reqText) {
    detailPanel.appendChild(buildBodySection({
      title: '请求体', originalText: reqText, encoding: req?.postData?.encoding || '',
      decoderId: ds.reqDecoder || rule?.reqDecoder || 'raw',
      result: ds.reqResult, error: ds.reqError, loading: ds.loading,
      onDecrypt: async (id) => {
        try { const b = harTextToBytes(reqText, req?.postData?.encoding || ''); ds.reqDecoder = id; ds.reqResult = await runDecoder(id, b, { rule, keys: rule?.keys || {} }); ds.reqError = null; }
        catch (err) { ds.reqDecoder = id; ds.reqResult = null; ds.reqError = err.message || String(err); }
        renderDetail(); renderList();
      },
    }));
  } else {
    const params = extractRequestParams(entry);
    if (params) detailPanel.appendChild(buildParamsSection(params.title, params.obj));
    else detailPanel.appendChild(buildEmptySection('请求体', '（无请求体）'));
  }
  if (isMedia) {
    detailPanel.appendChild(buildEmptySection('响应体', '（媒体预览暂未集成）'));
  } else {
    detailPanel.appendChild(buildBodySection({
      title: '响应体', originalText: resText, encoding: res?.content?.encoding || '',
      decoderId: ds.resDecoder || rule?.resDecoder || 'raw',
      result: ds.resResult, error: ds.resError, loading: ds.loading,
      onDecrypt: async (id) => {
        try { const b = harTextToBytes(resText, res?.content?.encoding || ''); ds.resDecoder = id; ds.resResult = await runDecoder(id, b, { rule, keys: rule?.keys || {} }); ds.resError = null; }
        catch (err) { ds.resDecoder = id; ds.resResult = null; ds.resError = err.message || String(err); }
        renderDetail(); renderList();
      },
    }));
>>>>>>> parent of 8ddbf45 (改背景)
  }

  const existingIndex = fileRules.findIndex(
    (r) => r.matchHost && !r.isRegex && r.pattern.toLowerCase() === hostname,
  );
  const previous = fileRules.slice();

  let rule;
  if (existingIndex >= 0) {
    rule = JSON.parse(JSON.stringify(fileRules[existingIndex]));
    rule.reqDecoder = ds.reqDecoder || rule.reqDecoder || "raw";
    // 新增：paramsDecoder 独立保存
    rule.paramsDecoder = ds.queryDecoder || rule.paramsDecoder || rule.reqDecoder || "raw";
    rule.resDecoder = ds.resDecoder || rule.resDecoder || "raw";
  } else {
    rule = {
      pattern: url.hostname, isRegex: false, matchHost: true,
      reqDecoder: ds.reqDecoder || "raw",
      // 新增：新规则也带 paramsDecoder
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

  try {
    await rewriteRulesFile();
    // Bug 1 修复：不依赖 reloadFiles 读回（避免缓存/时序问题），
    // 直接用内存同步到 window.HAR_RULES 并重建索引
    window.HAR_RULES = JSON.parse(JSON.stringify(fileRules));
    refreshFileData();
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
  } catch (error) {
    fileRules = previous;
    window.HAR_RULES = JSON.parse(JSON.stringify(previous));
    refreshFileData();
    throw error;
  }
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
<<<<<<< HEAD
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
=======
  const det = document.createElement('details'); det.className = 'original-block';
  const sum = document.createElement('summary'); sum.textContent = `原始内容（${originalText.length} 字符）`; det.appendChild(sum);
  const pre = document.createElement('pre');
  pre.textContent = originalText.length > 5000 ? originalText.slice(0, 5000) + '\n…（已截断）' : originalText;
  det.appendChild(pre);
  let pinned = false; let hoverTimer = null, leaveTimer = null;
  det.addEventListener('mouseenter', () => { if (pinned) return; clearTimeout(leaveTimer); clearTimeout(hoverTimer); hoverTimer = setTimeout(() => { det.open = true; }, 200); });
  det.addEventListener('mouseleave', () => { if (pinned) return; clearTimeout(hoverTimer); clearTimeout(leaveTimer); leaveTimer = setTimeout(() => { if (!pinned) det.open = false; }, 400); });
  sum.addEventListener('click', (e) => { e.preventDefault(); if (pinned) { pinned = false; det.open = false; } else { pinned = true; det.open = true; } });
  return det;
}

function extractRequestParams(entry) {
  const hp = entry.request.postData?.params;
  if (hp?.length) { const o = {}; hp.forEach(p => o[p.name] = p.value); return { title: '请求参数', obj: o }; }
  try { const u = new URL(entry.request.url); const o = {}; u.searchParams.forEach((v, k) => { o[k] = v; }); if (Object.keys(o).length) return { title: '请求参数（URL Query）', obj: o }; } catch {}
  return null;
}
function buildParamsSection(title, obj) {
  const w = document.createElement('div');
  const t = document.createElement('div'); t.className = 'section-title'; t.textContent = title; w.appendChild(t);
  w.appendChild(renderJsonWithTs(obj));
  return w;
}
function buildEmptySection(title, text) {
  const w = document.createElement('div');
  const t = document.createElement('div'); t.className = 'section-title'; t.textContent = title; w.appendChild(t);
  const p = document.createElement('pre'); p.className = 'empty'; p.textContent = text; w.appendChild(p);
  return w;
}
function buildBodySection({ title, originalText, encoding, decoderId, result, error, loading, onDecrypt }) {
  const w = document.createElement('div');
  const t = document.createElement('div'); t.className = 'section-title'; t.textContent = title + (originalText ? '' : '（无）'); w.appendChild(t);
  if (!originalText) { const p = document.createElement('pre'); p.className = 'empty'; p.textContent = '（无内容）'; w.appendChild(p); return w; }
  const tb = document.createElement('div'); tb.className = 'toolbar';
  const sel = document.createElement('select');
  const all = getAllDecoders();
  for (const [id, d] of Object.entries(all)) {
    const o = document.createElement('option'); o.value = id; o.textContent = d.label;
    if (id === decoderId) o.selected = true; sel.appendChild(o);
>>>>>>> parent of 8ddbf45 (改背景)
  }
  sel.addEventListener('change', () => onDecrypt(sel.value));
  tb.appendChild(sel);
<<<<<<< HEAD

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
    if (fileDecoders[decoderId]?.encode) {
      const exportBtn2 = document.createElement("button");
      exportBtn2.type = "button";
      exportBtn2.className = "btn-secondary";
      exportBtn2.textContent = "📤 导出加密函数";
      exportBtn2.title = "下载该算法的解密+加密函数代码";
      exportBtn2.addEventListener("click", () => {
        try { exportEncoderCode(decoderId); showToast("已导出加密函数", "ok"); }
        catch (e) { showToast(e.message, "err"); }
      });
      tb.appendChild(exportBtn2);
    }
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
=======
  if (encoding) { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = `HAR 编码: ${encoding}`; tb.appendChild(tag); }
  w.appendChild(tb);
  w.appendChild(buildOriginalDetails(originalText));
  const rl = document.createElement('div'); rl.className = 'label-mini'; rl.textContent = '解析结果:'; w.appendChild(rl);
  if (loading) { const p = document.createElement('pre'); p.className = 'loading'; p.textContent = '正在自动解密…'; w.appendChild(p); }
  else if (error) { const p = document.createElement('pre'); p.className = 'err'; p.textContent = error; w.appendChild(p); }
  else if (result === null || result === undefined) { const p = document.createElement('pre'); p.className = 'empty'; p.textContent = '（无结果）'; w.appendChild(p); }
  else {
    const isObj = result !== null && typeof result === 'object' && !(result instanceof Uint8Array) && !(result instanceof ArrayBuffer);
    if (isObj) w.appendChild(renderJsonWithTs(result));
    else { const d = bytesToDisplay(result); const p = document.createElement('pre'); p.textContent = d.text; w.appendChild(p); }
>>>>>>> parent of 8ddbf45 (改背景)
  }
  return w;
}

<<<<<<< HEAD
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
=======
// ================================================================
// fetch 代码生成
// ================================================================
function extractRequestInfo(entry) {
  const method = (entry.request.method || 'GET').toUpperCase();
  const fullUrl = entry.request.url; const u = new URL(fullUrl);
  const queryParams = {}; u.searchParams.forEach((v, k) => { queryParams[k] = v; });
  const bodyText = entry.request.postData?.text || '';
  let bodyParams = null;
  if (bodyText) {
    const t = bodyText.trim();
    if (t.startsWith('{') || t.startsWith('[')) { try { bodyParams = JSON.parse(t); } catch {} }
    if (!bodyParams) { const f = tryParseForm(bodyText); if (f) bodyParams = f; }
  }
  const headers = {}; (entry.request.headers || []).forEach(h => { headers[h.name] = h.value; });
  return { method, fullUrl, u, queryParams, bodyText, bodyParams, headers };
}
async function generateFetchCode(entry, rule) {
  const { method, fullUrl, u, queryParams, bodyText, bodyParams, headers } = extractRequestInfo(entry);
  const baseUrl = u.origin + u.pathname;
  const hasQuery = Object.keys(queryParams).length > 0;
  const hasBody = !!bodyText;
  const forbidden = /^(host|content-length|connection|transfer-encoding|upgrade|keep-alive|expect|proxy-)/i;
  const cleanHeaders = {};
  for (const [k, v] of Object.entries(headers)) if (!forbidden.test(k)) cleanHeaders[k] = v;
  const L = [];
  L.push(`// 来源: ${method} ${fullUrl}`);
  L.push('// 运行环境: Node.js 18+');
  L.push('');
  L.push('(async () => {');
  if (hasQuery) { L.push(`  const queryParams = ${JSON.stringify(queryParams, null, 2).split('\n').join('\n  ')};`); L.push(''); }
  if (hasBody) {
    if (bodyParams) L.push(`  const bodyParams = ${JSON.stringify(bodyParams, null, 2).split('\n').join('\n  ')};`);
    else L.push(`  const rawBody = ${JSON.stringify(bodyText)};`);
    L.push('');
  }
  if (hasQuery) {
    L.push(`  const query = Object.entries(queryParams).map(([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(v)}\`).join('&');`);
    L.push(`  const url = '${baseUrl}' + (query ? '?' + query : '');`);
  } else L.push(`  const url = '${baseUrl}';`);
  L.push('');
  if (Object.keys(cleanHeaders).length) {
    L.push(`  const headers = ${JSON.stringify(cleanHeaders, null, 2).split('\n').join('\n  ')};`);
  } else L.push(`  const headers = {};`);
  L.push('');
  const opts = [`    method: '${method}'`, `    headers`];
  if (hasBody) opts.push(bodyParams ? `    body: JSON.stringify(bodyParams)` : `    body: rawBody`);
  L.push(`  const res = await fetch(url, {\n${opts.join(',\n')}\n  });`);
  L.push(`  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);`);
  const useRule = rule && rule.resDecoder && rule.resDecoder !== 'raw';
  if (useRule) {
    L.push(`  // 命中规则「${rule.note || String(rule.match)}」，响应需解密（${rule.resDecoder}）`);
    L.push(`  const buf = await res.arrayBuffer();`);
    L.push(`  const data = new Uint8Array(buf);`);
  } else {
    L.push(`  let data;`);
    L.push(`  try { data = await res.clone().json(); } catch { try { data = await res.clone().text(); } catch { data = await res.arrayBuffer(); } }`);
  }
  L.push(`  console.log(data);`);
  L.push(`})().catch(err => { console.error(err); process.exit(1); });`);
  return L.join('\n');
>>>>>>> parent of 8ddbf45 (改背景)
}

// 批量解密
autoAllBtn.addEventListener('click', async () => {
  if (!state.har) return;
  autoAllBtn.disabled = true; autoAllBtn.textContent = '⏳ 处理中…';
  let total = 0;
  for (let i = 0; i < state.har.log.entries.length; i++) {
    const entry = state.har.log.entries[i]; const url = entry.request?.url || '';
    const rule = matchRule(url); if (!rule) continue;
    total++;
    const ds = getDecryptState(i); ds.autoRan = true;
    await runDecryptForItem({ entry, originalIndex: i, url, rule }, ds);
  }
  renderList(); renderDetail();
  autoAllBtn.textContent = '🔓 批量解密'; autoAllBtn.disabled = false;
  alert(`命中规则 ${total} 条，已处理完成。`);
});

// 导出
function applyDecryptToHar(harObj) {
  let count = 0;
  for (const [origIdx, ds] of state.decryptState) {
<<<<<<< HEAD
    const e = harObj.log.entries[origIdx];
    if (!e) continue;
=======
    const e = harObj.log.entries[origIdx]; if (!e) continue;
>>>>>>> parent of 8ddbf45 (改背景)
    if (ds.reqResult != null && e.request?.postData) { writeResultBack(e.request.postData, ds.reqResult); count++; }
    if (ds.resResult != null && e.response?.content) { writeResultBack(e.response.content, ds.resResult); count++; }
  }
  return count;
}
exportBtn.addEventListener('click', () => {
  if (!state.har) return;
  const outHar = JSON.parse(JSON.stringify(state.har));
  const count = applyDecryptToHar(outHar);
<<<<<<< HEAD
  const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "capture.decrypted.har";
  a.click();
  URL.revokeObjectURL(a.href);
  if (count === 0) alert("没有可写回的解密结果。");
=======
  const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'capture.decrypted.har'; a.click(); URL.revokeObjectURL(a.href);
  if (count === 0) alert('没有可写回的解密结果。');
>>>>>>> parent of 8ddbf45 (改背景)
});
exportListBtn.addEventListener('click', () => {
  if (!state.har) return;
<<<<<<< HEAD
  if (!state.entries.length) { alert("当前过滤无结果，无法导出。"); return; }
=======
  if (!state.entries.length) { alert('当前过滤无结果，无法导出。'); return; }
>>>>>>> parent of 8ddbf45 (改背景)
  const outHar = JSON.parse(JSON.stringify(state.har));
  applyDecryptToHar(outHar);
  const keep = new Set(state.entries.map(e => e.originalIndex));
  const kept = keep.size;
  outHar.log.entries = outHar.log.entries.filter((_, i) => keep.has(i));
<<<<<<< HEAD
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
=======
  const blob = new Blob([JSON.stringify(outHar, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `capture.filtered-${Date.now()}.har`; a.click(); URL.revokeObjectURL(a.href);
  showToast(`已导出 ${kept} 条请求`, 'ok');
});
function writeResultBack(c, r) {
  if (typeof r === 'string') { c.text = r; delete c.encoding; c.mimeType = 'application/json'; }
  else if (r instanceof Uint8Array) { c.text = bytesToBase64(r); c.encoding = 'base64'; }
  else if (r instanceof ArrayBuffer) { c.text = bytesToBase64(new Uint8Array(r)); c.encoding = 'base64'; }
  else { c.text = JSON.stringify(r, null, 2); delete c.encoding; c.mimeType = 'application/json'; }
  if ('size' in c) c.size = new Blob([c.text]).size;
>>>>>>> parent of 8ddbf45 (改背景)
}

// ================================================================
// 配置模态框
// ================================================================
<<<<<<< HEAD
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
=======
const configModal = $('configModal'), modalCloseBtn = $('modalCloseBtn');
const addDecoderBtn = $('addDecoderBtn'), addRuleBtn = $('addRuleBtn');
const decoderList = $('decoderList'), ruleList = $('ruleList');
const decoderForm = $('decoderForm'), ruleForm = $('ruleForm');
const decoderFormError = $('decoderFormError'), ruleFormError = $('ruleFormError');
const decoderIdInput = $('decoderIdInput'), decoderLabelInput = $('decoderLabelInput');
const decoderCodeInput = $('decoderCodeInput');
const decoderTemplateSelect = $('decoderTemplateSelect');
const saveDecoderBtn = $('saveDecoderBtn'), cancelDecoderBtn = $('cancelDecoderBtn');
const rulePatternInput = $('rulePatternInput'), ruleTypeSelect = $('ruleTypeSelect');
const ruleReqDecoderSelect = $('ruleReqDecoderSelect'), ruleResDecoderSelect = $('ruleResDecoderSelect');
const ruleKeysInput = $('ruleKeysInput');
const ruleReqHeaderDecodersInput = $('ruleReqHeaderDecodersInput');
const saveRuleBtn = $('saveRuleBtn'), cancelRuleBtn = $('cancelRuleBtn');

>>>>>>> parent of 8ddbf45 (改背景)
let editingDecoderId = null;

function openModal() {
<<<<<<< HEAD
  configModal.style.display = "flex";
  switchTab("decoders");
  renderDecoderList();
  renderPluginList();
  hideDecoderForm();
  fillTemplateSelect();
  updatePluginsDirLabel();
}
function closeModal() { configModal.style.display = "none"; }
$("configBtn").addEventListener("click", openModal);
modalCloseBtn.addEventListener("click", closeModal);
configModal.addEventListener("click", (e) => { if (e.target === configModal) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (configModal.style.display === "flex") closeModal();
});
=======
  configModal.style.display = 'flex';
  switchTab('decoders');
  renderDecoderList(); renderRuleList(); renderPluginList();
  hideDecoderForm(); hideRuleForm();
  fillDecoderSelects();
  fillTemplateSelect();
  updatePluginsDirLabel();
}
function closeModal() { configModal.style.display = 'none'; }
$('configBtn').addEventListener('click', openModal);
modalCloseBtn.addEventListener('click', closeModal);
configModal.addEventListener('click', (e) => { if (e.target === configModal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && configModal.style.display === 'flex') closeModal(); });

>>>>>>> parent of 8ddbf45 (改背景)
async function updatePluginsDirLabel() {
  try { const r = await window.electronAPI.listPlugins(); $('pluginsDirPath').textContent = r.dir; } catch (e) {}
}
<<<<<<< HEAD
$("openPluginsDirBtn").addEventListener("click", () => window.electronAPI.openPluginsDir());
document.querySelectorAll(".modal-tab").forEach((tab) => {
  tab.addEventListener("click", () => switchTab(tab.dataset.tab));
});
function switchTab(name) {
  document.querySelectorAll(".modal-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === name));
  if (name === "plugins") renderPluginList();
}
$("reloadPluginsBtn").addEventListener("click", async () => {
=======
$('openPluginsDirBtn').addEventListener('click', () => window.electronAPI.openPluginsDir());

document.querySelectorAll('.modal-tab').forEach(tab => { tab.addEventListener('click', () => switchTab(tab.dataset.tab)); });
function switchTab(name) {
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === name));
  if (name === 'rules') fillDecoderSelects();
  if (name === 'plugins') renderPluginList();
}

$('reloadPluginsBtn').addEventListener('click', async () => {
>>>>>>> parent of 8ddbf45 (改背景)
  loadedPlugins.clear();
  await loadPlugins();
  await reloadFiles();
  renderPluginList();
  showToast('插件已重新加载', 'ok');
});

function renderDecoderList() {
  decoderList.innerHTML = '';
  const fileIds = Object.keys(fileDecoders);
  if (!fileIds.length) {
    const e = document.createElement('div'); e.className = 'config-empty';
    e.textContent = 'decoders.js 中暂无算法。'; decoderList.appendChild(e); return;
  }
  fileIds.forEach(id => {
    const d = fileDecoders[id];
    const item = document.createElement('div'); item.className = 'config-item';
    const comp = getCompiledCustom(id);
<<<<<<< HEAD
    const errTag = comp.error ? `<span class="badge-error">编译错误</span>` : "";
    const encTag = d.encode ? `<span class="badge-keys">含加密函数</span>` : "";
    const preview = (d.code || "").split("\n")[0].slice(0, 80);
    item.innerHTML = `
      <div class="config-item-main">
        <div class="config-item-title">${escapeHtml(d.label)} <span class="config-item-id">${escapeHtml(id)}</span><span class="badge-file">文件</span>${encTag}${errTag}</div>
        <div class="config-item-preview">${escapeHtml(preview)}${d.code?.includes("\n") ? "…" : ""}</div>
=======
    const errTag = comp.error ? `<span class="badge-error">编译错误</span>` : '';
    const preview = (d.code || '').split('\n')[0].slice(0, 80);
    item.innerHTML = `
      <div class="config-item-main">
        <div class="config-item-title">${escapeHtml(d.label)} <span class="config-item-id">${escapeHtml(id)}</span><span class="badge-file">文件</span>${errTag}</div>
        <div class="config-item-preview">${escapeHtml(preview)}${d.code?.includes('\n') ? '…' : ''}</div>
>>>>>>> parent of 8ddbf45 (改背景)
      </div>
      <div class="config-item-actions">
        <button data-action="edit">编辑</button>
        <button data-action="delete" class="danger">删除</button>
      </div>
    `;
<<<<<<< HEAD
    item.querySelector('[data-action="edit"]').addEventListener("click", () => editDecoder(id));
    item.querySelector('[data-action="delete"]').addEventListener("click", () => deleteDecoder(id));
=======
    item.querySelector('[data-action="edit"]').addEventListener('click', () => editDecoder(id));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteDecoder(id));
>>>>>>> parent of 8ddbf45 (改背景)
    decoderList.appendChild(item);
  });
}
function editDecoder(id) {
  const d = fileDecoders[id];
  if (!d) return;
  editingDecoderId = id;
  decoderIdInput.value = id;
  decoderIdInput.disabled = true;
<<<<<<< HEAD
  decoderLabelInput.value = d.label || "";
  decoderCodeInput.value = d.code || "";
  decoderEncodeInput.value = d.encode || "";
=======
  decoderLabelInput.value = d.label || '';
  decoderCodeInput.value = d.code || '';
>>>>>>> parent of 8ddbf45 (改背景)
  fillTemplateSelect();
  decoderTemplateSelect.value = '';
  decoderFormError.style.display = 'none';
  decoderForm.style.display = 'block';
  addDecoderBtn.style.display = 'none';
  decoderForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
async function deleteDecoder(id) {
  if (!confirm(`从 decoders.js 删除「${id}」？`)) return;
  const backup = fileDecoders[id];
  delete fileDecoders[id];
  _compiledFns.delete(id);
  try {
    await rewriteDecodersFile();
    await reloadFiles();
    renderDecoderList();
    showToast(`已删除「${id}」`, 'ok');
  } catch (e) {
    fileDecoders[id] = backup;
    renderDecoderList();
    showToast('写回失败: ' + e.message, 'err');
  }
}
function hideDecoderForm() {
  decoderForm.style.display = 'none';
  decoderIdInput.disabled = false;
  editingDecoderId = null;
  addDecoderBtn.style.display = '';
  decoderFormError.style.display = 'none';
}
<<<<<<< HEAD
addDecoderBtn.addEventListener("click", () => {
  editingDecoderId = null;
  decoderIdInput.value = "";
  decoderIdInput.disabled = false;
  decoderLabelInput.value = "";
  decoderCodeInput.value = "";
  decoderEncodeInput.value = "";
  decoderFormError.style.display = "none";
  decoderForm.style.display = "block";
  addDecoderBtn.style.display = "none";
=======
function showDecoderError(msg) { decoderFormError.textContent = msg; decoderFormError.style.display = 'block'; }

addDecoderBtn.addEventListener('click', () => {
  editingDecoderId = null;
  decoderIdInput.value = ''; decoderIdInput.disabled = false;
  decoderLabelInput.value = ''; decoderCodeInput.value = '';
  decoderFormError.style.display = 'none'; decoderForm.style.display = 'block';
  addDecoderBtn.style.display = 'none';
>>>>>>> parent of 8ddbf45 (改背景)
  fillTemplateSelect();
  decoderTemplateSelect.value = '';
  setTimeout(() => decoderIdInput.focus(), 50);
});
<<<<<<< HEAD
cancelDecoderBtn.addEventListener("click", hideDecoderForm);
=======
cancelDecoderBtn.addEventListener('click', hideDecoderForm);

>>>>>>> parent of 8ddbf45 (改背景)
if (decoderTemplateSelect) {
  decoderTemplateSelect.addEventListener('change', (e) => {
    const id = e.target.value;
    if (!id) return;
    const t = getTemplates()[id];
    if (!t) return;
    decoderCodeInput.value = t.code;
<<<<<<< HEAD
    decoderEncodeInput.value = t.encode || "";
=======
>>>>>>> parent of 8ddbf45 (改背景)
    if (!decoderLabelInput.value.trim()) decoderLabelInput.value = t.label || id;
  });
}
function fillTemplateSelect() {
  if (!decoderTemplateSelect) return;
  const cur = decoderTemplateSelect.value;
  decoderTemplateSelect.innerHTML = '<option value="">-- 手动填写 --</option>';
  const templates = getTemplates();
  for (const [id, t] of Object.entries(templates)) {
<<<<<<< HEAD
    const o = document.createElement("option");
    o.value = id; o.textContent = t.label || id;
=======
    const o = document.createElement('option');
    o.value = id;
    o.textContent = t.label || id;
>>>>>>> parent of 8ddbf45 (改背景)
    decoderTemplateSelect.appendChild(o);
  }
  decoderTemplateSelect.value = cur;
}
<<<<<<< HEAD
saveDecoderBtn.addEventListener("click", async () => {
  const id = editingDecoderId || decoderIdInput.value.trim();
  const label = decoderLabelInput.value.trim();
  const code = decoderCodeInput.value;
  const encode = decoderEncodeInput.value.trim();
  if (!id) return showDecoderError("请填写 ID");
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id)) return showDecoderError("ID 必须是合法 JS 标识符");
  if (!editingDecoderId && (BUILTIN_DECODERS[id] || fileDecoders[id])) return showDecoderError(`"${id}" 已存在`);
  if (!label) return showDecoderError("请填写名称");
  if (!code.trim()) return showDecoderError("请填写代码");
  const comp = compileDecoderCode(code);
  if (comp.error) return showDecoderError("代码编译失败：\n" + comp.error);
  if (encode) {
    const encodeComp = compileDecoderCode(encode);
    if (encodeComp.error) return showDecoderError("加密函数编译失败：\n" + encodeComp.error);
  }
=======

saveDecoderBtn.addEventListener('click', async () => {
  const id = editingDecoderId || decoderIdInput.value.trim();
  const label = decoderLabelInput.value.trim();
  const code = decoderCodeInput.value;
  if (!id) return showDecoderError('请填写 ID');
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id)) return showDecoderError('ID 必须是合法 JS 标识符');
  if (!editingDecoderId && (BUILTIN_DECODERS[id] || fileDecoders[id])) return showDecoderError(`"${id}" 已存在`);
  if (!label) return showDecoderError('请填写名称');
  if (!code.trim()) return showDecoderError('请填写代码');
  const comp = compileDecoderCode(code);
  if (comp.error) return showDecoderError('代码编译失败：\n' + comp.error);
>>>>>>> parent of 8ddbf45 (改背景)
  const wasEditing = !!editingDecoderId;
  fileDecoders[id] = { label, code, encode, cdn: fileDecoders[id]?.cdn || [] };
  _compiledFns.delete(id);
  try {
    await rewriteDecodersFile();
    hideDecoderForm();
    await reloadFiles();
    showToast(wasEditing ? `已更新「${label}」` : `已添加「${label}」`, 'ok');
  } catch (e) {
    showDecoderError('写入失败: ' + e.message);
  }
});
<<<<<<< HEAD
=======

// ========== 规则列表 ==========
function renderRuleList() {
  ruleList.innerHTML = '';
  if (!fileRules.length) {
    const e = document.createElement('div'); e.className = 'config-empty';
    e.textContent = 'rules.js 中暂无规则。'; ruleList.appendChild(e); return;
  }
  fileRules.forEach((r, idx) => {
    const item = document.createElement('div'); item.className = 'config-item';
    const typeLabel = r.isRegex ? '正则' : '包含';
    const keysTag = r.keys ? '<span class="badge-keys">含密钥</span>' : '';
    const headerTag = r.reqHeaderDecoders ? '<span class="badge-header">含头解析</span>' : '';
    item.innerHTML = `
      <div class="config-item-main">
        <div class="config-item-title">${escapeHtml(r.pattern)} <span class="config-item-id">${escapeHtml(typeLabel)}</span><span class="badge-file">文件</span>${keysTag}${headerTag}</div>
        <div class="config-item-preview">请求: <code>${escapeHtml(r.reqDecoder)}</code> · 响应: <code>${escapeHtml(r.resDecoder)}</code></div>
      </div>
      <div class="config-item-actions">
        <button data-action="edit">编辑</button>
        <button data-action="delete" class="danger">删除</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener('click', () => editRule(idx));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => deleteFileRule(idx));
    ruleList.appendChild(item);
  });
}

function editRule(idx) {
  const r = fileRules[idx];
  if (!r) return;
  editingRuleIndex = idx;
  rulePatternInput.value = r.pattern;
  ruleTypeSelect.value = r.isRegex ? 'regex' : 'string';
  fillDecoderSelects();
  ruleReqDecoderSelect.value = r.reqDecoder || 'raw';
  ruleResDecoderSelect.value = r.resDecoder || 'raw';
  ruleKeysInput.value = r.keys ? JSON.stringify(r.keys, null, 2) : '';
  ruleReqHeaderDecodersInput.value = r.reqHeaderDecoders ? JSON.stringify(r.reqHeaderDecoders, null, 2) : '';
  ruleFormError.style.display = 'none'; ruleForm.style.display = 'block';
  addRuleBtn.style.display = 'none';
  ruleForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteFileRule(idx) {
  const r = fileRules[idx];
  if (!r) return;
  if (!confirm(`从 rules.js 删除规则「${r.pattern}」？`)) return;
  const backup = fileRules[idx];
  fileRules.splice(idx, 1);
  try {
    await rewriteRulesFile();
    await reloadFiles();
    renderRuleList();
    if (state.har) rebuildEntryList();
    showToast('已删除规则', 'ok');
  } catch (e) {
    fileRules.splice(idx, 0, backup);
    renderRuleList();
    showToast('写回失败: ' + e.message, 'err');
  }
}

function hideRuleForm() { ruleForm.style.display = 'none'; editingRuleIndex = -1; addRuleBtn.style.display = ''; ruleFormError.style.display = 'none'; }
function showRuleError(msg) { ruleFormError.textContent = msg; ruleFormError.style.display = 'block'; }
function fillDecoderSelects() {
  const all = getAllDecoders();
  const fill = (sel, cur) => {
    sel.innerHTML = '';
    for (const [id, d] of Object.entries(all)) {
      const o = document.createElement('option'); o.value = id; o.textContent = d.label;
      if (id === cur) o.selected = true; sel.appendChild(o);
    }
  };
  fill(ruleReqDecoderSelect, ruleReqDecoderSelect.value || 'raw');
  fill(ruleResDecoderSelect, ruleResDecoderSelect.value || 'raw');
}
addRuleBtn.addEventListener('click', () => {
  editingRuleIndex = -1;
  rulePatternInput.value = ''; ruleTypeSelect.value = 'string';
  fillDecoderSelects();
  ruleReqDecoderSelect.value = 'raw'; ruleResDecoderSelect.value = 'raw';
  ruleKeysInput.value = ''; ruleReqHeaderDecodersInput.value = '';
  ruleFormError.style.display = 'none'; ruleForm.style.display = 'block';
  addRuleBtn.style.display = 'none'; rulePatternInput.focus();
});
cancelRuleBtn.addEventListener('click', hideRuleForm);
saveRuleBtn.addEventListener('click', async () => {
  const pattern = rulePatternInput.value.trim();
  const isRegex = ruleTypeSelect.value === 'regex';
  const reqDecoder = ruleReqDecoderSelect.value;
  const resDecoder = ruleResDecoderSelect.value;
  if (!pattern) return showRuleError('请填写域名模式');
  if (isRegex) { try { new RegExp(pattern); } catch (e) { return showRuleError('正则无效：' + e.message); } }
  if (!reqDecoder && !resDecoder) return showRuleError('至少选择一个算法');
  let keys = null;
  const keysStr = ruleKeysInput.value.trim();
  if (keysStr) { try { keys = JSON.parse(keysStr); } catch (e) { return showRuleError('密钥 JSON 无效：' + e.message); } }
  let reqHeaderDecoders = null;
  const reqHdrsStr = ruleReqHeaderDecodersInput.value.trim();
  if (reqHdrsStr) {
    try { reqHeaderDecoders = JSON.parse(reqHdrsStr); }
    catch (e) { return showRuleError('请求头解析绑定 JSON 无效：' + e.message); }
    if (typeof reqHeaderDecoders !== 'object' || Array.isArray(reqHeaderDecoders) || reqHeaderDecoders === null) return showRuleError('必须是 JSON 对象');
    const allDec = getAllDecoders();
    for (const [k, v] of Object.entries(reqHeaderDecoders)) {
      if (!allDec[v]) return showRuleError(`请求头「${k}」绑定的算法「${v}」不存在`);
    }
  }
  const rule = { pattern, isRegex, reqDecoder, resDecoder };
  if (keys) rule.keys = keys;
  if (reqHeaderDecoders && Object.keys(reqHeaderDecoders).length) rule.reqHeaderDecoders = reqHeaderDecoders;

  const wasEditing = editingRuleIndex >= 0;
  if (wasEditing) fileRules[editingRuleIndex] = rule;
  else fileRules.push(rule);

  try {
    await rewriteRulesFile();
    hideRuleForm();
    await reloadFiles();
    showToast(wasEditing ? `已更新规则` : '规则已添加', 'ok');
  } catch (e) {
    showRuleError('写入失败: ' + e.message);
  }
});

// 插件列表
>>>>>>> parent of 8ddbf45 (改背景)
async function renderPluginList() {
  const list = $('pluginList');
  list.innerHTML = '';
  try {
    const r = await window.electronAPI.listPlugins();
    $('pluginsDirPath').textContent = r.dir;
    if (!r.files || !r.files.length) {
      const e = document.createElement('div'); e.className = 'config-empty';
      e.textContent = '暂无插件。点击「打开插件目录」把 UMD .js 文件复制进去。';
      list.appendChild(e); return;
    }
    for (const f of r.files) {
<<<<<<< HEAD
      const loaded = loadedPlugins.has(f.name);
      const globals = [...(pluginGlobals.get(f.name) || [])].filter(isValidParamName);
      const badge = loaded ? `<span class="badge-file">已加载</span>` : `<span class="badge-error">未加载</span>`;
      const libTags = globals.map((n) => `<span class="badge-keys">${escapeHtml(n)}</span>`).join("");
      const item = document.createElement("div");
      item.className = "config-item";
      item.innerHTML = `
        <div class="config-item-main">
          <div class="config-item-title">${escapeHtml(f.name)} <span class="config-item-id">${f.size} 字节</span>${badge}${libTags}</div>
          <div class="config-item-preview">${escapeHtml((f.content || "").slice(0, 100))}…</div>
=======
      const item = document.createElement('div'); item.className = 'config-item';
      item.innerHTML = `
        <div class="config-item-main">
          <div class="config-item-title">${escapeHtml(f.name)} <span class="config-item-id">${f.size} 字节</span></div>
          <div class="config-item-preview">${escapeHtml((f.content || '').slice(0, 100))}…</div>
>>>>>>> parent of 8ddbf45 (改背景)
        </div>
        <div class="config-item-actions">
          <button data-action="delete" class="danger">删除</button>
        </div>
      `;
<<<<<<< HEAD
      item.querySelector('[data-action="delete"]').addEventListener("click", async () => {
        if (!confirm(`删除插件「${f.name}」？`)) return;
        await window.electronAPI.deletePlugin(f.name);
        unloadPlugin(f.name);
        await renderPluginList();
        showToast(`已删除「${f.name}」并卸载`, "ok");
=======
      item.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        if (!confirm(`删除插件「${f.name}」？`)) return;
        await window.electronAPI.deletePlugin(f.name);
        await renderPluginList();
>>>>>>> parent of 8ddbf45 (改背景)
      });
      list.appendChild(item);
    }
  } catch (e) {
    const err = document.createElement('div'); err.className = 'config-empty';
    err.textContent = '读取失败: ' + e.message;
    list.appendChild(err);
  }
}

// ================================================================
// 初始化
// ================================================================
(async () => {
  toggleFilterBtn.disabled = true;
  autoAllBtn.disabled = true;
  exportBtn.disabled = true;
  exportListBtn.disabled = true;
  await loadPlugins();
  await reloadFiles();
  fillTemplateSelect();
<<<<<<< HEAD
  console.log("%c[HAR-Decrypt] ✅ 初始化完成", "color:#7ddf7d;font-weight:bold");
=======
  console.log('%c[HAR-Decrypt] ✅ 初始化完成', 'color:#7ddf7d;font-weight:bold');
>>>>>>> parent of 8ddbf45 (改背景)
})();