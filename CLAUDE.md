# lakemedical.org — Production Brief

Alumni Relationship Engine for WesternU College of Osteopathic Medicine.
Live at **lakemedical.org** via Cloudflare Pages.

---

## What This Is

TOTP-authenticated alumni tracking tool. Login gate → queue → directory →
profile → dashboard views. Data enriched via NPI Registry + PubMed.

## Stack

- **Frontend:** Vanilla HTML/CSS/JS. Zero frameworks. Zero build tools.
- **Backend:** Cloudflare Pages Functions (Workers).
- **Auth:** NTRP wire protocol via NOUS relay. TOTP-based.
- **Data:** Static JSON + KV cache + scheduled refresh pipeline.
- **Styles:** WesternU brand — burgundy (#8b2230), gold (#d4a24a), cream (#faf9f7).

## Architecture

```
Browser (alumni/)
  ├── auth-gate.js → nous.js → wire.js (NTRP pack/unpack)
  │   POST /api/wire (binary NTRP frame)
  │
  └── app.js → router → views (queue, directory, profile, dashboard)
        GET /api/data (alumni JSON)

Cloudflare Worker (functions/api/wire.js)
  ├── Derives cockpit key: HMAC-SHA-256(PSK, "nous-transport:cockpit")
  ├── Encrypts NTRP frame into 0xCA envelope (AES-256-GCM)
  ├── TCP connect to relay.3-nous.net:8080
  └── Decrypts response, returns plaintext NTRP to browser

NOUS Relay (relay.3-nous.net, dynamic DNS)
  ├── Decrypts 0xCA envelope with cockpit key
  ├── Dispatches: auth → register → forward
  └── Delegates to prime via relay_wire_to_prime()
```

## Wire Protocol (NTRP0001)

All auth communication uses binary NTRP triples. No JSON auth endpoints.

```
Frame: [NTRP0001:8B][count:4B LE][payload_len:4B LE][triples...]
Triple: [subject_len:2B LE][subject][predicate_len:2B LE][predicate][object_len:2B LE][object]
```

**Byte order: LITTLE-ENDIAN.** Matches wire.c w16/w32 functions.

## 0xCA Envelope

```
[0xCA:1B][nonce:12B][ciphertext][tag:16B]
Overhead: 29 bytes. AES-256-GCM.
Key: HMAC-SHA-256(master_psk, "nous-transport:cockpit")
```

PSK is a Wrangler secret. Never in browser JS. Never hardcoded.

## Relay Discovery

**Dynamic DNS only. No hardcoded IPs. Ever.**

- Worker connects to `relay.3-nous.net` (DNS resolves at runtime)
- Relay discovers primes via topology table + gcloud FQDN resolution
- 43-node global mesh: 3 elite, 8 prime, 12 relay, 20 edge

## Auth Triples

```
Login:    {auth, action, none} + {user, entity, none} + {totp, signal, none}
Register: {register, action, none} + {user, entity, none}
Session:  {token, meta, session} + [command triples...]
```

## Session

- Token: 64 hex chars (32 random bytes, minted by relay)
- TTL: 900 seconds (15 minutes)
- Storage: sessionStorage (client), triple store (relay)
- IP-bound on relay side

## Deploy

```bash
npx wrangler pages deploy alumni
wrangler secret put NOUS_PSK    # 64-hex master PSK
```

Domain: lakemedical.org (Cloudflare Pages custom domain)

## File Layout

```
alumni/           Static site (HTML/CSS/JS/data)
functions/api/    Cloudflare Workers
  wire.js         NOUS proxy (0xCA envelope + TCP relay)
  data.js         Alumni data endpoint
  health.js       Health check
  refresh.js      Data enrichment pipeline
  seed.js         Initial KV population
public/           PWA manifest + icons
deploy.json       Deploy config
wrangler.toml     Cloudflare Pages config
```

## Rules

1. No frameworks. Vanilla everything.
2. No hardcoded IPs. DNS names or topology lookups only.
3. Wire protocol always. No JSON auth endpoints.
4. WesternU brand on auth gate. Not Be dark theme.
5. PSK stays server-side. Worker secret only.
6. Little-endian byte order in NTRP frames.
