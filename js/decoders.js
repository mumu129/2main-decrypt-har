// ============================================================
// decoders.js — 内置算法 / 编译 / 规则匹配 / 解密执行
// 规则是唯一存储密钥的地方
// ============================================================

const BUILTIN_DECODERS = {
  raw: { label: "智能解析（自动尝试 URL / Base64 / JSON / form）", libs: [],
    code: `function(text, ctx) { return smartDecodeText(text); }` },
  utf8: { label: "原样文本", libs: [],
    code: `function(text, ctx) { return typeof text === "string" ? text : String(text == null ? "" : text); }`,
    encode: `function(value, ctx) { return typeof value === "string" ? value : JSON.stringify(value); }` },
  json: { label: "JSON 解析", libs: [],
    code: `function(text, ctx) { try { return JSON.parse(String(text)); } catch { return String(text); } }`,
    encode: `function(value, ctx) { return JSON.stringify(value); }` },
  form: { label: "form-urlencoded 解析", libs: [],
    code: `function(text, ctx) {
  const t = String(text == null ? "" : text); if (!t) return t;
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
    for (const vv of arr) parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(typeof vv === "string" ? vv : JSON.stringify(vv)));
  }
  return parts.join("&");
}` },
  base64: { label: "Base64 解码（文本）", libs: [],
    code: `function(text, ctx) { try { return atob(String(text).trim()); } catch { return String(text); } }`,
    encode: `function(value, ctx) { return btoa(typeof value === "string" ? value : JSON.stringify(value)); }` },
  base64Json: { label: "Base64 解码 + JSON 解析", libs: [],
    code: `function(text, ctx) { return JSON.parse(atob(String(text).trim())); }`,
    encode: `function(value, ctx) { return btoa(JSON.stringify(value)); }` },
  gzip: { label: "gzip 解压（输入 base64）", libs: [],
    code: `function(text, ctx) { return JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(base64ToBytes(String(text))))); }`,
    encode: `function(value, ctx) { const s = typeof value === "string" ? value : JSON.stringify(value); return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s))); }` },
  inflate: { label: "zlib inflate（输入 base64）", libs: [],
    code: `function(text, ctx) { return JSON.parse(new TextDecoder("utf-8").decode(pako.inflate(base64ToBytes(String(text))))); }`,
    encode: `function(value, ctx) { const s = typeof value === "string" ? value : JSON.stringify(value); return bytesToBase64Str(pako.deflate(new TextEncoder().encode(s))); }` },
  gzipFix: { label: "gzip 头修复 + 解压（输入 base64）", libs: [],
    code: `function(text, ctx) {
  const t = base64ToBytes(String(text));
  if (t.length < 8) throw new Error("长度 < 8");
  t[0] = 0x1f; t[1] = 0x8b; t[2] = 0x08; t[3] = 0x00;
  t[4] = 0x00; t[5] = 0x00; t[6] = 0x00; t[7] = 0x00;
  return JSON.parse(new TextDecoder("utf-8").decode(pako.ungzip(t)));
}`,
    encode: `function(value, ctx) { const s = typeof value === "string" ? value : JSON.stringify(value); return bytesToBase64Str(pako.gzip(new TextEncoder().encode(s))); }` },
  cookie: { label: "Cookie 解析", libs: [],
    code: `function(text, ctx) {
  const t = String(text).trim(); if (!t) return t;
  const out = {};
  t.split(/;\\s*/).forEach((part) => {
    const eq = part.indexOf("="); if (eq <= 0) return;
    const k = part.slice(0, eq).trim(), v = part.slice(eq + 1).trim();
    if (k) out[k] = smartDecodeValue(v);
  });
  return Object.keys(out).length ? out : t;
}`,
    encode: `function(value, ctx) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return String(value);
  return Object.entries(value).map(([k, v]) => k + "=" + (typeof v === "string" ? v : JSON.stringify(v))).join("; ");
}` },
  bearer: { label: "Bearer/Token/JWT 解析", libs: [],
    code: `function(text, ctx) {
  let t = String(text).trim();
  const m = t.match(/^(Bearer|Basic|Token|JWT)\\s+(.+)$/i); if (m) t = m[2].trim();
  const parts = t.split(".");
  if (parts.length === 3 && parts[0] && parts[1]) {
    try {
      const decodeB64Url = (s) => {
        let x = s.replace(/-/g, "+").replace(/_/g, "/");
        while (x.length % 4) x += "=";
        const bin = atob(x), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder("utf-8").decode(bytes);
      };
      return { header: JSON.parse(decodeB64Url(parts[0])), payload: JSON.parse(decodeB64Url(parts[1])), signature: parts[2] };
    } catch {}
  }
  return t;
}`,
    encode: `function(value, ctx) { return typeof value === "string" ? value : JSON.stringify(value); }` },
};

// ========== 库收集 / 编译 ==========
const KNOWN_GLOBALS = ["CryptoJS", "JSEncrypt", "BigNumber", "Big", "bignumber", "sm2", "sm3", "sm4", "smCrypto", "forge", "JSZip", "LZString", "lzString", "uuid", "md5", "sha1", "sha256", "aesjs", "jsrsasign", "pako"];
let _libCache = null;
const _compiledFns = new Map();
const INTERNAL_HELPERS = { smartDecodeText, smartDecodeValue, isJsonLike, isFormLike, tryBase64, base64ToBytes, bytesToBase64Str, isPlainObject, valueToText, escapeHtml };

function collectLibs() {
  if (_libCache) return _libCache;
  const map = new Map();
  if (window.pako) map.set("pako", window.pako);
  for (const name of KNOWN_GLOBALS) if (window[name] != null && !map.has(name)) map.set(name, window[name]);
  for (const keys of pluginGlobals.values()) for (const name of keys) {
    if (name === "__HAR_PLUGINS__" || map.has(name)) continue;
    if (!isValidParamName(name)) continue;
    const v = window[name]; if (v === undefined) continue;
    map.set(name, v);
  }
  for (const [k, v] of Object.entries(INTERNAL_HELPERS)) if (!map.has(k)) map.set(k, v);
  _libCache = { names: [...map.keys()], values: [...map.values()] };
  return _libCache;
}
function resetLibCache() { _libCache = null; _compiledFns.clear(); }

function compileDecoderCode(code) {
  try {
    const { names, values } = collectLibs();
    const fn = new Function(...names, `return (${code});`)(...values);
    if (typeof fn !== "function") throw new Error("代码必须是一个函数");
    return { fn, error: null };
  } catch (e) { return { fn: null, error: e.message }; }
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

// ========== 规则归一化 ==========
function normalizeFieldTree(node) {
  if (!node || typeof node !== "object") return null;
  const param = node.param || node.pathField || node.jsonPath || "";
  if (!param) return null;
  const out = { param: String(param), decoderId: node.decoderId || "raw", fields: [] };
  if (node.keys && typeof node.keys === "object" && !Array.isArray(node.keys)) {
    const keys = {};
    for (const [k, v] of Object.entries(node.keys)) if (typeof v === "string" && v) keys[k] = v;
    if (Object.keys(keys).length) out.keys = keys;
  }
  for (const kid of (Array.isArray(node.fields) ? node.fields : Array.isArray(node.jsonFieldRules) ? node.jsonFieldRules : [])) {
    const n = normalizeFieldTree(kid); if (n) out.fields.push(n);
  }
  return out;
}
function normalizePathRule(item) {
  if (!item || typeof item !== "object") return null;
  if (item.param && !Array.isArray(item.fields)) {
    const f = normalizeFieldTree(item);
    return f ? { path: item.path != null ? String(item.path) : "", target: item.target || "body", fields: [f] } : null;
  }
  if (Array.isArray(item.fields)) {
    return { path: item.path != null ? String(item.path) : "", target: item.target || "body", fields: item.fields.map(normalizeFieldTree).filter(Boolean) };
  }
  return null;
}
function normalizeMethodsMap(src) {
  const out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  for (const [m, arr] of Object.entries(src)) {
    const list = (Array.isArray(arr) ? arr : []).map(normalizePathRule).filter(Boolean);
    if (list.length) out[String(m).toUpperCase()] = list;
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
    const field = normalizeFieldTree(item); if (!field) continue;
    out[method] ||= [];
    let pr = out[method].find((p) => p.path === path && p.target === target);
    if (!pr) { pr = { path, target, fields: [] }; out[method].push(pr); }
    const idx = pr.fields.findIndex((f) => f.param === field.param);
    if (idx >= 0) pr.fields[idx] = field; else pr.fields.push(field);
  }
  return out;
}
function refreshConfig() {
  userDecoders = loadJSON(LS_KEYS.userDecoders, {});
  userTemplates = loadJSON(LS_KEYS.templates, {});
  for (const d of Object.values(userDecoders)) if (!Array.isArray(d.libs)) d.libs = [];
  const rulesRaw = loadJSON(LS_KEYS.rules, []);
  fileRules = [];
  const seen = new Map();
  for (const r of (Array.isArray(rulesRaw) ? rulesRaw : [])) {
    if (!r || !r.pattern) continue;
    const isHostRule = r.matchHost !== false && !r.isRegex;
    let methods = {};
    if (r.methods && typeof r.methods === "object" && !Array.isArray(r.methods)) methods = normalizeMethodsMap(r.methods);
    else if (Array.isArray(r.jsonFieldRules)) methods = buildMethodsFromLegacy(r.jsonFieldRules);
    const reqDecoder = r.reqDecoder || "raw";
    const rule = {
      pattern: String(r.pattern), isRegex: !!r.isRegex, matchHost: isHostRule,
      reqDecoder, paramsDecoder: r.paramsDecoder || reqDecoder, resDecoder: r.resDecoder || "raw",
      keys: r.keys || null,
      reqHeaderDecoders: r.reqHeaderDecoders && typeof r.reqHeaderDecoders === "object" && !Array.isArray(r.reqHeaderDecoders) ? r.reqHeaderDecoders : null,
      targetKeys: r.targetKeys && typeof r.targetKeys === "object" && !Array.isArray(r.targetKeys) ? r.targetKeys : null,
      headerKeys: r.headerKeys && typeof r.headerKeys === "object" && !Array.isArray(r.headerKeys) ? r.headerKeys : null,
      methods,
    };
    if (isHostRule) {
      const key = rule.pattern.toLowerCase();
      if (seen.has(key)) {
        const i = seen.get(key), prev = fileRules[i];
        const merged = { ...prev, ...rule, methods: { ...prev.methods } };
        for (const [m, arr] of Object.entries(rule.methods)) merged.methods[m] = arr;
        fileRules[i] = merged;
      } else { seen.set(key, fileRules.length); fileRules.push(rule); }
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

// ========== 算法表 / 规则匹配 ==========
function getAllDecoders() {
  const all = {};
  for (const [id, d] of Object.entries(BUILTIN_DECODERS)) {
    if (userDecoders[id]) continue;
    const comp = getCompiled("builtin:" + id, d);
    all[id] = {
      label: d.label, encodeCode: d.encode || "", requires: [], libs: d.libs || [],
      decode: comp.fn ? async (t, c) => comp.fn(t, c) : () => { throw new Error("编译失败: " + comp.error); },
      encode: comp.encodeFn ? async (v, c) => comp.encodeFn(v, c) : null,
      isBuiltin: true, overridden: false,
    };
  }
  for (const [id, d] of Object.entries(userDecoders)) {
    const comp = getCompiled(id, d);
    all[id] = {
      label: d.label, encodeCode: comp.encodeCode, requires: d.requires || [], libs: d.libs || [],
      decode: comp.fn ? async (t, c) => comp.fn(t, c) : () => { throw new Error("编译失败: " + comp.error); },
      encode: comp.encodeFn ? async (v, c) => comp.encodeFn(v, c) : null,
      isBuiltin: !!BUILTIN_DECODERS[id], overridden: !!BUILTIN_DECODERS[id],
    };
  }
  return all;
}
function matchRule(url) {
  let parsed; try { parsed = new URL(url); } catch { return null; }
  const hostname = parsed.hostname.toLowerCase();
  for (const r of fileRules) {
    let hit = false;
    if (r.matchHost && !r.isRegex) hit = r.pattern.toLowerCase() === hostname;
    else if (r.isRegex) { try { hit = new RegExp(r.pattern).test(url); } catch {} }
    else hit = url.includes(r.pattern);
    if (hit) return { ...r, urlPath: parsed.pathname, match: r.pattern, note: r.isRegex ? `/${r.pattern}/` : r.pattern };
  }
  return null;
}
function collectMatchedFields(rule, method, urlPath, target) {
  if (!rule?.methods) return [];
  const m = String(method || "GET").toUpperCase();
  const keys = [m, "*"].filter((k) => rule.methods[k]);
  const exact = new Map(), general = new Map();
  for (const mk of keys) {
    for (const pr of rule.methods[mk] || []) {
      if (pr.target && pr.target !== target) continue;
      const isExact = pr.path === urlPath, isGeneral = pr.path === "";
      if (!isExact && !isGeneral) continue;
      const bucket = isExact ? exact : general;
      for (const f of pr.fields || []) if (!bucket.has(f.param)) bucket.set(f.param, f);
    }
  }
  const merged = new Map();
  for (const [p, f] of general) merged.set(p, f);
  for (const [p, f] of exact) merged.set(p, f);
  return [...merged.values()];
}

// ========== 密钥工具 ==========
function getRequiredCryptoFields(id) {
  const def = userDecoders[id] || BUILTIN_DECODERS[id];
  if (def?.requires?.length) return def.requires;
  const code = def?.code || "";
  return ["key", "iv", "offset"].filter((f) => new RegExp(`\\bkeys\\s*(?:\\?\\.\\s*|\\.\\s*)${f}\\b`).test(code));
}
function _hexToBytes(hex) {
  const c = String(hex == null ? "" : hex).replace(/\s+/g, "").toLowerCase();
  if (!/^(?:[0-9a-f]{2})*$/.test(c)) return null;
  const out = new Uint8Array(c.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(c.substr(i * 2, 2), 16);
  return out;
}
function _bytesToBase64(bytes) { let bin = ""; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
function _base64ToHex(b64) { const bin = atob(b64); return Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, "0")).join(""); }
function _hexToDisplay(hex, format) {
  if (!hex) return "";
  const b = _hexToBytes(hex); if (!b || !b.length) return "";
  if (format === "base64") { try { return _bytesToBase64(b); } catch { return ""; } }
  return String(hex).toLowerCase();
}
function decodeCryptoInput(value, format) {
  const text = String(value == null ? "" : value).trim().replace(/\s+/g, "");
  if (!text) throw new Error("输入为空");
  if (format === "hex") {
    if (!/^(?:[0-9a-fA-F]{2})+$/.test(text)) {
      const hint = text.length % 2 === 1 ? "奇数位" : "含非十六进制字符";
      throw new Error(`Hex 必须是偶数位十六进制（${hint}）。当前："${value}"`);
    }
    return text.toLowerCase();
  }
  try { const hex = _base64ToHex(text); if (!hex) throw new Error(); return hex; }
  catch { throw new Error(`Base64 格式无效。当前："${value}"。若是十六进制请切到 Hex。`); }
}

// ========== 核心：只从规则读配置 ==========
function getScopeConfig(scope, rule) {
  if (!rule) return { decoder: "raw", keys: {} };
  if (scope === "req") {
    const d = rule.reqDecoder || "raw";
    return { decoder: d, keys: rule.targetKeys?.req?.[d] || {} };
  }
  if (scope === "res") {
    const d = rule.resDecoder || "raw";
    return { decoder: d, keys: rule.targetKeys?.res?.[d] || {} };
  }
  if (scope === "query") {
    const d = rule.paramsDecoder || "raw";
    return { decoder: d, keys: rule.targetKeys?.query?.[d] || {} };
  }
  if (scope.startsWith("header|")) {
    const name = scope.slice(7);
    const d = rule.reqHeaderDecoders?.[name] || "raw";
    return { decoder: d, keys: rule.headerKeys?.[name]?.[d] || {} };
  }
  if (scope.startsWith("field|")) {
    const parts = scope.split("|");
    const m = parts[1], path = parts[2], fieldPath = parts.slice(3).join("|");
    const pr = (rule.methods?.[m] || []).find((p) => p.path === path);
    const f = pr?.fields?.find((x) => x.param === fieldPath);
    return { decoder: f?.decoderId || "raw", keys: f?.keys || {} };
  }
  return { decoder: "raw", keys: {} };
}

// 修改内存规则（不保存）
function _mutateRule(url, method, scope, { decoder, keys, keysDelete }) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("无效的 URL: " + url); }
  const hostname = parsed.hostname.toLowerCase();
  const urlPath = parsed.pathname;

  let rule = fileRules.find((r) => !r.isRegex && r.matchHost && r.pattern.toLowerCase() === hostname);
  if (!rule) {
    rule = {
      pattern: hostname, isRegex: false, matchHost: true,
      reqDecoder: "raw", paramsDecoder: "raw", resDecoder: "raw",
      targetKeys: {}, reqHeaderDecoders: {}, headerKeys: {}, methods: {},
    };
    fileRules.push(rule);
  }

  if (scope === "req" || scope === "res" || scope === "query") {
    if (scope === "req") rule.reqDecoder = decoder || "raw";
    else if (scope === "res") rule.resDecoder = decoder || "raw";
    else rule.paramsDecoder = decoder || "raw";
    if (keysDelete) {
      if (rule.targetKeys?.[scope] && decoder) delete rule.targetKeys[scope][decoder];
    } else if (keys && Object.keys(keys).length && decoder) {
      rule.targetKeys ||= {};
      rule.targetKeys[scope] ||= {};
      rule.targetKeys[scope][decoder] = { ...keys };
    }
  } else if (scope.startsWith("header|")) {
    const name = scope.slice(7);
    if (!decoder || decoder === "raw") {
      if (rule.reqHeaderDecoders) delete rule.reqHeaderDecoders[name];
      if (rule.headerKeys) delete rule.headerKeys[name];
    } else {
      rule.reqHeaderDecoders ||= {};
      rule.reqHeaderDecoders[name] = decoder;
      if (keysDelete) {
        if (rule.headerKeys?.[name]) delete rule.headerKeys[name];
      } else if (keys && Object.keys(keys).length) {
        rule.headerKeys ||= {};
        rule.headerKeys[name] = { [decoder]: { ...keys } };
      }
    }
  } else if (scope.startsWith("field|")) {
    const parts = scope.split("|");
    const m = parts[1], path = parts[2], fieldPath = parts.slice(3).join("|");
    rule.methods ||= {};
    rule.methods[m] ||= [];
    let pr = rule.methods[m].find((p) => p.path === path);
    if (!pr) { pr = { path, target: "body", fields: [] }; rule.methods[m].push(pr); }
    let f = pr.fields.find((x) => x.param === fieldPath);
    if (!f) { f = { param: fieldPath, decoderId: "raw", fields: [] }; pr.fields.push(f); }

    const oldDecoder = f.decoderId;
    f.decoderId = decoder || "raw";
    const decoderChanged = oldDecoder !== f.decoderId;

    if (keysDelete) {
      // 显式清除
      delete f.keys;
    } else if (keys && Object.keys(keys).length) {
      // 传了新密钥：覆盖
      f.keys = { ...keys };
    } else if (decoderChanged) {
      // 切算法但没传密钥：清掉旧密钥，避免被误用为新算法的密钥
      delete f.keys;
    }
  }
}

// 写入内存 + localStorage；失败时回滚
function upsertRuleScope(url, method, scope, opts) {
  _mutateRule(url, method, scope, opts);
  if (!saveJSON(LS_KEYS.rules, fileRules)) {
    refreshConfig();
    throw new Error("localStorage 写入失败");
  }
}

// 从规则中彻底移除某个 scope（目前只支持 field 类型）
function removeRuleScope(url, scope) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error("无效的 URL: " + url); }
  const hostname = parsed.hostname.toLowerCase();
  const rule = fileRules.find((r) => !r.isRegex && r.matchHost && r.pattern.toLowerCase() === hostname);
  if (!rule) return false;

  if (scope.startsWith("field|")) {
    const parts = scope.split("|");
    const m = parts[1], path = parts[2], fieldPath = parts.slice(3).join("|");
    const list = rule.methods?.[m];
    if (!list) return false;
    const pr = list.find((p) => p.path === path);
    if (!pr) return false;
    pr.fields = pr.fields.filter((f) => f.param !== fieldPath);
    if (!pr.fields.length) {
      rule.methods[m] = list.filter((p) => p !== pr);
      if (!rule.methods[m].length) delete rule.methods[m];
    }
    if (!saveJSON(LS_KEYS.rules, fileRules)) {
      refreshConfig();
      throw new Error("localStorage 写入失败");
    }
    return true;
  }
  return false;
}

// ========== 解密执行 ==========
async function runDecoder(decoderId, text, keys) {
  const d = getAllDecoders()[decoderId];
  if (!d) throw new Error("未知解码器: " + decoderId);
  if (d.libs?.length) {
    const missing = d.libs.filter((n) => !loadedLibs.has(n));
    if (missing.length) await ensureLibsLoaded(missing);
  }
  const d2 = getAllDecoders()[decoderId];
  if (!d2?.decode) throw new Error("解码器不可用: " + decoderId);
  return await d2.decode(String(text ?? ""), { keys: keys || {} });
}
async function runEncoder(decoderId, value, keys) {
  const d = getAllDecoders()[decoderId];
  if (!d) throw new Error("未知解码器: " + decoderId);
  if (d.libs?.length) {
    const missing = d.libs.filter((n) => !loadedLibs.has(n));
    if (missing.length) await ensureLibsLoaded(missing);
  }
  const d2 = getAllDecoders()[decoderId];
  if (!d2?.encode) throw new Error(`「${d2?.label || decoderId}」没有配对加密函数`);
  return await d2.encode(value, { keys: keys || {} });
}