/* wire.js — Cloudflare Worker proxy for NOUS wire protocol
 *
 * POST /api/wire
 *   1. Receive binary NTRP frame from browser
 *   2. Validate NTRP0001 magic
 *   3. Derive cockpit key: HMAC-SHA-256(PSK, "nous-transport:cockpit")
 *   4. Encrypt into 0xCA envelope (AES-256-GCM)
 *   5. TCP connect to relay.3-nous.net:8080
 *   6. Send envelope, read response
 *   7. Decrypt 0xCA response
 *   8. Return plaintext NTRP to browser
 *
 * Env secrets: NOUS_PSK (64-hex master PSK)
 * No hardcoded IPs. DNS resolves relay.3-nous.net at runtime.
 */

var RELAY_HOST = 'relay.3-nous.net';
var RELAY_PORT = 8080;
var NOUS_MAGIC = 0xCA;
var NONCE_LEN = 12;
var OVERHEAD = 29;  /* 1 magic + 12 nonce + 16 tag */
var RATE_LIMIT = 10; /* requests per minute per IP */

/* Simple in-memory rate limiter (resets per-isolate) */
var rateBuckets = {};

function isRateLimited(ip) {
  var now = Date.now();
  var bucket = rateBuckets[ip];
  if (!bucket || now - bucket.start > 60000) {
    rateBuckets[ip] = { start: now, count: 1 };
    return false;
  }
  bucket.count++;
  return bucket.count > RATE_LIMIT;
}

/* Decode hex string to Uint8Array */
function hexDecode(hex) {
  var bytes = new Uint8Array(hex.length / 2);
  for (var i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/* Concatenate array of Uint8Arrays */
function concatBuffers(chunks) {
  var total = 0;
  for (var i = 0; i < chunks.length; i++) total += chunks[i].length;
  var result = new Uint8Array(total);
  var offset = 0;
  for (var i = 0; i < chunks.length; i++) {
    result.set(chunks[i], offset);
    offset += chunks[i].length;
  }
  return result;
}

export async function onRequestPost(context) {
  var request = context.request;
  var env = context.env;

  /* Rate limit */
  var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response('', { status: 429 });
  }

  /* Read binary body */
  var body;
  try {
    body = new Uint8Array(await request.arrayBuffer());
  } catch (e) {
    return new Response('', { status: 400 });
  }

  /* Validate NTRP0001 magic (first 8 bytes) */
  if (body.length < 16) {
    return new Response('', { status: 400 });
  }
  var magic = '';
  for (var i = 0; i < 8; i++) magic += String.fromCharCode(body[i]);
  if (magic !== 'NTRP0001') {
    return new Response('', { status: 400 });
  }

  /* Check PSK */
  if (!env.NOUS_PSK) {
    return new Response('', { status: 500 });
  }

  try {
    /* Derive cockpit key: HMAC-SHA-256(PSK, "nous-transport:cockpit") */
    var psk = hexDecode(env.NOUS_PSK);
    var label = new TextEncoder().encode('nous-transport:cockpit');
    var baseKey = await crypto.subtle.importKey(
      'raw', psk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    var derived = new Uint8Array(
      await crypto.subtle.sign('HMAC', baseKey, label)
    );

    /* Import derived key for AES-256-GCM */
    var aesKey = await crypto.subtle.importKey(
      'raw', derived, 'AES-GCM', false, ['encrypt', 'decrypt']
    );

    /* Encrypt: build 0xCA envelope */
    var nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN));
    var encrypted = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce }, aesKey, body
      )
    );
    /* WebCrypto returns [ciphertext + 16B tag] — byte-compatible with C layout */

    var envelope = new Uint8Array(1 + NONCE_LEN + encrypted.length);
    envelope[0] = NOUS_MAGIC;
    envelope.set(nonce, 1);
    envelope.set(encrypted, 1 + NONCE_LEN);

    /* TCP connect to relay — DNS resolves at runtime, never hardcoded */
    var socket = connect({ hostname: RELAY_HOST, port: RELAY_PORT });

    /* Send envelope */
    var writer = socket.writable.getWriter();
    await writer.write(envelope);
    await writer.close();

    /* Read response */
    var reader = socket.readable.getReader();
    var chunks = [];
    while (true) {
      var result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
    }
    var response = concatBuffers(chunks);

    /* Validate response envelope */
    if (response.length < OVERHEAD + 1 || response[0] !== NOUS_MAGIC) {
      return new Response('', { status: 502 });
    }

    /* Decrypt response */
    var respNonce = response.slice(1, 1 + NONCE_LEN);
    var respCiphertext = response.slice(1 + NONCE_LEN);
    var plaintext = new Uint8Array(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: respNonce }, aesKey, respCiphertext
      )
    );

    /* Return plaintext NTRP to browser */
    return new Response(plaintext, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store'
      }
    });

  } catch (e) {
    return new Response('', { status: 502 });
  }
}
