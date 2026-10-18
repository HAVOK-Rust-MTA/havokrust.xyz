// Assinatura das interações do Discord: Ed25519 sobre (timestamp + corpo BRUTO), com a Public Key do app.
// Interação sem assinatura válida recebe 401 (o Discord exige isso para aceitar a URL no Developer Portal).

const MAX_SKEW_S = 5 * 60; // timestamp mais velho (ou mais no futuro) que isso = possível replay

const hexToBytes = (hex) => {
  if (typeof hex !== 'string' || hex.length % 2 || !/^[0-9a-f]*$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
};

let keyCache = { hex: null, key: null };
async function publicKey(hex) {
  if (keyCache.hex !== hex) {
    const raw = hexToBytes(hex);
    if (!raw || raw.length !== 32) throw new Error('invalid DISCORD_PUBLIC_KEY');
    keyCache = { hex, key: await crypto.subtle.importKey('raw', raw, { name: 'Ed25519' }, false, ['verify']) };
  }
  return keyCache.key;
}

// devolve o corpo (texto) se a assinatura confere; senão null
export async function verifyRequest(request, publicKeyHex, nowS = Math.floor(Date.now() / 1000)) {
  const signature = hexToBytes(request.headers.get('X-Signature-Ed25519') || '');
  const timestamp = request.headers.get('X-Signature-Timestamp') || '';
  if (!signature || signature.length !== 64 || !/^\d{1,12}$/.test(timestamp)) return null;
  if (Math.abs(nowS - Number(timestamp)) > MAX_SKEW_S) return null;
  const body = await request.text();
  try {
    const ok = await crypto.subtle.verify('Ed25519', await publicKey(publicKeyHex), signature, new TextEncoder().encode(timestamp + body));
    return ok ? body : null;
  } catch {
    return null;
  }
}
