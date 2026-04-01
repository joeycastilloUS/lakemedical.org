/* wire.js — Cloudflare Worker proxy for NOUS wire protocol
 *
 * POST /api/wire
 *   1. Receive NTRP frame from browser, unpack triples
 *   2. Route to relay HTTP endpoint based on action
 *   3. Pack relay JSON response as NTRP triples, return to browser
 *
 * Uses HTTP to relay (POST /auth, POST /register) instead of 0xCA wire.
 * Avoids Cloudflare TCP half-close issue entirely — no raw sockets needed.
 *
 * Env secrets: NOUS_PSK (reserved for future wire fallback)
 * No hardcoded IPs. DNS resolves relay.3-nous.net at runtime.
 */

var RELAY_HOST = 'relay.3-nous.net';
var RELAY_PORT = 8080;
var RELAY_URL  = 'http://' + RELAY_HOST + ':' + RELAY_PORT;
var RATE_LIMIT = 10;

/* ── NTRP pack/unpack (mirrors browser wire.js) ── */

var WIRE_MAGIC       = 'NTRP0001';
var WIRE_HEADER_SIZE = 16;

function ntrpUnpack(buf) {
  if (buf.length < WIRE_HEADER_SIZE) return null;
  var magic = '';
  for (var i = 0; i < 8; i++) magic += String.fromCharCode(buf[i]);
  if (magic !== WIRE_MAGIC) return null;

  var view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  var count = view.getUint32(8, true);
  var payloadLen = view.getUint32(12, true);
  if (buf.length < WIRE_HEADER_SIZE + payloadLen) return null;

  var dec = new TextDecoder();
  var triples = [];
  var pos = WIRE_HEADER_SIZE;
  var end = pos + payloadLen;

  for (var i = 0; i < count; i++) {
    var fields = [];
    for (var f = 0; f < 3; f++) {
      if (pos + 2 > end) return null;
      var len = view.getUint16(pos, true);
      pos += 2;
      if (pos + len > end) return null;
      fields.push(dec.decode(buf.slice(pos, pos + len)));
      pos += len;
    }
    triples.push({ s: fields[0], p: fields[1], o: fields[2] });
  }
  return triples;
}

function ntrpPack(triples) {
  var enc = new TextEncoder();
  var encoded = [];
  var payloadSize = 0;
  for (var i = 0; i < triples.length; i++) {
    var t = triples[i];
    var s = enc.encode(t.s);
    var p = enc.encode(t.p);
    var o = enc.encode(t.o);
    payloadSize += 2 + s.length + 2 + p.length + 2 + o.length;
    encoded.push({ s: s, p: p, o: o });
  }

  var buf = new Uint8Array(WIRE_HEADER_SIZE + payloadSize);
  var view = new DataView(buf.buffer);
  buf.set(enc.encode(WIRE_MAGIC), 0);
  view.setUint32(8, triples.length, true);
  view.setUint32(12, payloadSize, true);

  var pos = WIRE_HEADER_SIZE;
  for (var i = 0; i < encoded.length; i++) {
    var fields = [encoded[i].s, encoded[i].p, encoded[i].o];
    for (var f = 0; f < 3; f++) {
      view.setUint16(pos, fields[f].length, true);
      pos += 2;
      buf.set(fields[f], pos);
      pos += fields[f].length;
    }
  }
  return buf;
}

/* ── Helpers ── */

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

function jsonErr(status, obj) {
  return new Response(JSON.stringify(obj), {
    status: status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function ntrpResponse(triples) {
  return new Response(ntrpPack(triples), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'no-store'
    }
  });
}

function findTriple(triples, predicate) {
  for (var i = 0; i < triples.length; i++) {
    if (triples[i].p === predicate) return triples[i].s;
  }
  return null;
}

/* ── Action handlers ── */

async function handleAuth(user, totp) {
  if (!user || !totp) {
    return ntrpResponse([
      { s: 'resp', p: 'status', o: 'error' },
      { s: 'resp', p: 'message', o: 'missing user or totp' }
    ]);
  }

  var resp = await fetch(RELAY_URL + '/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user, totp_code: totp })
  });

  if (resp.ok) {
    var json = await resp.json();
    return ntrpResponse([
      { s: 'resp', p: 'status', o: 'ok' },
      { s: json.session_token, p: 'signal', o: 'none' },
      { s: String(json.ttl), p: 'property', o: 'none' }
    ]);
  }

  /* 429 = session limit */
  if (resp.status === 429) {
    return ntrpResponse([
      { s: 'resp', p: 'status', o: 'error' },
      { s: 'resp', p: 'message', o: 'session limit' }
    ]);
  }

  /* 401 = rejected */
  return ntrpResponse([
    { s: 'resp', p: 'status', o: 'rejected' }
  ]);
}

async function handleRegister(user) {
  if (!user) {
    return ntrpResponse([
      { s: 'resp', p: 'status', o: 'error' },
      { s: 'resp', p: 'message', o: 'missing user' }
    ]);
  }

  var resp = await fetch(RELAY_URL + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user })
  });

  var text = await resp.text();
  try {
    var json = JSON.parse(text);
    var status = json.status || (resp.ok ? 'ok' : 'error');
    var triples = [
      { s: 'resp', p: 'status', o: status }
    ];
    /* otpauth URI → signal triple (browser auth-gate.js reads signal) */
    if (json.otpauth) triples.push({ s: json.otpauth, p: 'signal', o: 'none' });
    if (json.role)    triples.push({ s: json.role,     p: 'property', o: 'none' });
    if (json.message) triples.push({ s: 'resp',        p: 'message', o: json.message });
    return ntrpResponse(triples);
  } catch (e) {
    return ntrpResponse([
      { s: 'resp', p: 'status', o: 'error' },
      { s: 'resp', p: 'message', o: 'relay returned: ' + resp.status }
    ]);
  }
}

/* ── Entrypoints ── */

export async function onRequestGet() {
  return new Response(JSON.stringify({
    status: 'wire-proxy-ok',
    mode: 'http',
    relay: RELAY_HOST + ':' + RELAY_PORT
  }), { headers: { 'Content-Type': 'application/json' } });
}

export async function onRequestPost(context) {
  try {
    var request = context.request;

    /* Rate limit */
    var ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (isRateLimited(ip)) return jsonErr(429, { error: 'rate_limited' });

    /* Read + unpack NTRP */
    var body = new Uint8Array(await request.arrayBuffer());
    if (body.length < WIRE_HEADER_SIZE) {
      return jsonErr(400, { error: 'too_short', len: body.length });
    }

    var triples = ntrpUnpack(body);
    if (!triples || triples.length === 0) {
      return jsonErr(400, { error: 'bad_ntrp' });
    }

    /* Extract action + entities */
    var action = findTriple(triples, 'action');
    var user   = findTriple(triples, 'entity');
    var signal = findTriple(triples, 'signal');

    /* Route */
    if (action === 'auth')     return await handleAuth(user, signal);
    if (action === 'register') return await handleRegister(user);

    /* Status — relay doesn't have HTTP session check, return ok */
    if (action === 'status') {
      return ntrpResponse([
        { s: 'resp', p: 'status', o: 'ok' }
      ]);
    }

    return jsonErr(400, { error: 'unknown_action', action: action });

  } catch (e) {
    return jsonErr(502, {
      error: 'exception',
      message: e.message,
      stack: (e.stack || '').substring(0, 500)
    });
  }
}
