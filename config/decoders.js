// ===== 新接口：字符串进 / 字符串出 =====
// decode(text, ctx) → 值（对象 / 字符串 / 数字 / …）
// encode(value, ctx) → 字符串（网络传输时的样子，如 base64）
//
// text 来源：
//   - query:    new URL(url).search.slice(1)  → "a=1&b=2"
//   - body:     postData.text                  → 原始字符串（不解码）
//   - response: content.text                   → 原始字符串（不解码）
//   - field:    该字段值的 JSON 序列化形式
//   - header:   header.value
//
// 二进制（base64 密文 / gzip 流）在算法内部用 atob() 拿字节，不再需要外部预解码。

window.HAR_DECODERS = {
  aesCBC: {
    label: "AES-256-CBC（输入 base64，需 key + iv）",
    cdn: [],
    code: `async function(text, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  if (!keys.iv) throw new Error('缺少 IV：请在域名规则中配置 keys.iv');

  const hexToBytes = h => Uint8Array.from(
    String(h).replace(/\\s+/g, '').match(/../g) || [],
    x => parseInt(x, 16)
  );

  // text 是 HAR 里的原始字符串（base64 密文）
  const bin = atob(String(text).trim());
  const cipher = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) cipher[i] = bin.charCodeAt(i);

  const key = await crypto.subtle.importKey(
    'raw', hexToBytes(keys.key),
    { name: 'AES-CBC' }, false, ['decrypt']
  );
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: hexToBytes(keys.iv) },
    key, cipher
  );
  return JSON.parse(new TextDecoder().decode(plain));
}`,
    encode: `async function(value, ctx) {
  const keys = ctx?.keys || {};
  if (!keys.key) throw new Error('缺少密钥：请在域名规则中配置 keys.key');
  if (!keys.iv) throw new Error('缺少 IV：请在域名规则中配置 keys.iv');

  const hexToBytes = h => Uint8Array.from(
    String(h).replace(/\\s+/g, '').match(/../g) || [],
    x => parseInt(x, 16)
  );

  // value 是解码结果（对象 / 字符串），重新序列化成网络传输的明文
  const plainText = typeof value === 'string' ? value : JSON.stringify(value);
  const plain = new TextEncoder().encode(plainText);

  const key = await crypto.subtle.importKey(
    'raw', hexToBytes(keys.key),
    { name: 'AES-CBC' }, false, ['encrypt']
  );
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: hexToBytes(keys.iv) },
    key, plain
  );

  // 输出网络传输时的样子：base64 字符串
  const bytes = new Uint8Array(cipher);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}`,
  },
};