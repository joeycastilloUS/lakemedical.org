# Board: lakemedical.org — Full Stack Build

Updated 2026-04-02 · 63 items · 278 pts · 18 boards (27–44)
Source: Multi-Tenant + Dual-Write + Provisioning UI estimates

---

## Board 27 — Repo Extract + Wire.js (16 pts)

### Ready

### In Progress

### Done
- {lakemedical.org GitHub repo + alumni/ + functions/ + config, add as, new production repo} · 5 · ~A ✅
- {CLAUDE.md + be/ + board.md, add to, lakemedical.org} · 3 · ~A ✅
- {wire.js NTRP pack/unpack, add to, alumni/js/} · 5 · ~A ✅
- {nous.js high-level client, add to, alumni/js/} · 3 · ~A ✅

---

## Board 28 — NOUS Auth Gate (16 pts)

### Ready

### In Progress

### Done
- {auth-gate.css WesternU brand, update in, alumni/css/} · 3 · ~U ✅
- {auth-gate.js login + register via wire triples, update in, alumni/js/} · 5 · ~U ✅
- {QR encoder for TOTP registration, add to, alumni/js/utils/qr.js} · 5 · ~A ✅
- {session timer + auto-expire + re-auth gate, add to, auth-gate.js} · 3 · ~A ✅

---

## Board 29 — Worker Proxy + Deploy + E2E (15 pts)

### Ready

### In Progress

### Done
- {wire.js Worker with 0xCA envelope encrypt/decrypt + relay proxy, add to, functions/api/} · 5 · ~A ✅
- {NOUS_PSK secret + relay.3-nous.net DNS + wrangler config, update in, deploy config} · 5 · ~U ✅
- {full wire auth E2E, test on, lakemedical.org + NOUS us-west2} · 5 · ~T ✅ (18/18 pass, 5 skipped — NOUS_PSK + relay DNS pending)

---

## Board 30 — Close the Loop (21 pts)

### Ready

### In Progress

### Done
- {502 root cause, diagnose on, relay logs + prime reachability + PSK match} · 5 · ~f ✅
- {prime VMs + binary, verify on, GCE nodes + wire auth handler} · 5 · ~t ✅
- {test user with TOTP secret, add to, prime user store} · 3 · ~a ✅
- {full auth round-trip, test on, lakemedical.org → relay → prime} · 5 · ~t ✅
- {E2E test script, update with, real auth assertions + session token check} · 3 · ~u ✅

---

## Board 31 — Fix QR Code, All C (11 pts)

### Ready

### In Progress

### Done
- {qr_data field, add to, relay /register JSON response} · 3 · ~u ✅
- {qr_data + qr_size triples, add to, Worker handleRegister} · 2 · ~u ✅
- {server QR rendering + delete qr.js, update in, auth-gate.js + index.html} · 3 · ~u ✅
- {QR scannable output, test on, browser register flow} · 3 · ~t ✅

---

## Board 32 — Landing Page + Login Split (10 pts)

### Ready

### In Progress

### Done
- {product landing page, add as, index.html with acmedev branding} · 5 · ~a ✅
- {auth gate + login page, add as, login.html with acmedev branding} · 3 · ~a ✅
- {current app, update to, app.html with session guard} · 2 · ~u ✅

---

## Board 33 — alumni-server Scaffold (18 pts)

### Ready
- {HTTP listener + tenant router, add to, alumni-server.c} · 5 · ~a
- {config + health endpoints, add to, alumni-server.c} · 5 · ~a
- {tenant provisioning CLI, add to, alumni-server.c} · 5 · ~a
- {port 9080, open on, VM firewall} · 3 · ~a

### In Progress

### Done

---

## Board 34 — Data Layer (18 pts) ⛔ blocked by Board 33

### Ready
- {per-tenant encrypted triple store, add to, alumni-server.c} · 5 · ~a
- {CSV import endpoint, add to, alumni-server.c} · 5 · ~a
- {data serving endpoint, add to, alumni-server.c} · 5 · ~a
- {tenant routing, update in, Worker proxy} · 3 · ~u

### In Progress

### Done

---

## Board 35 — Enrichment Engine (20 pts) ⛔ blocked by Board 34

### Ready
- {NPI enrichment client, add to, alumni-server.c} · 5 · ~a
- {PubMed enrichment client, add to, alumni-server.c} · 5 · ~a
- {scheduler event loop + cursor tracking, add to, alumni-server.c} · 5 · ~a
- {cause-effect rule evaluator, add to, alumni-server.c} · 5 · ~a

### In Progress

### Done

---

## Board 36 — Cause-Effect Config (13 pts) ⛔ blocked by Board 35

### Ready
- {factory rule store + 4 causes + 3 effects, add to, alumni-server.c} · 5 · ~a
- {effect producer + outreach templates, add to, alumni-server.c} · 5 · ~a
- {tenant override system, add to, alumni-server.c} · 3 · ~a

### In Progress

### Done

---

## Board 37 — Auth Migration (13 pts) ⛔ blocked by Board 33

### Ready
- {TOTP auth handler, add to, alumni-server.c} · 5 · ~a
- {session management, add to, alumni-server.c} · 5 · ~a
- {per-tenant user store, add to, alumni-server.c} · 3 · ~a

### In Progress

### Done

---

## Board 38 — Browser Rebrand (13 pts) ⛔ blocked by Board 33

### Ready
- {tenant-config loader, add to, alumni app JS} · 5 · ~a
- {hardcoded brand, remove from, all HTML/CSS} · 5 · ~d
- {app inner chrome, update with, dynamic brand variables} · 3 · ~u

### In Progress

### Done

---

## Board 39 — Operations (16 pts) ⛔ blocked by Board 34

### Ready
- {backup/export endpoint, add to, alumni-server.c} · 5 · ~a
- {trace stream + pulse monitoring, add to, alumni-server.c} · 3 · ~a
- {admin CLI, add to, alumni-server.c} · 5 · ~a
- {E2E multi-tenant test, add to, test suite} · 3 · ~a

### In Progress

### Done

---

## Board 40 — Firestore Mirror Module (18 pts) ⛔ blocked by Board 39

### Ready
- {firestore_mirror.c + JWT service account auth, add to, alumni-server} · 5 · ~a
- {subject-to-collection projector + batch writer, add to, firestore_mirror.c} · 5 · ~a
- {async ring buffer + background mirror thread, add to, firestore_mirror.c} · 5 · ~a
- {GCP service account + Firestore database, add to, GCP project} · 3 · ~a

### In Progress

### Done

---

## Board 41 — Dual-Write Integration (16 pts) ⛔ blocked by Board 40

### Ready
- {mirror_queue calls after every store insert/delete, update in, alumni-server.c} · 5 · ~u
- {batch flush after enrichment + import completion, add to, scheduler} · 3 · ~a
- {mirror_resync full re-project command, add to, admin CLI} · 5 · ~a
- {Firestore health + mirror queue depth, add to, pulse monitoring} · 3 · ~a

### In Progress

### Done

---

## Board 42 — Browser Firestore Migration (18 pts) ⛔ blocked by Board 41

### Ready
- {Firestore security rules + Firebase Auth custom token, add to, GCP + alumni-server} · 5 · ~a
- {Firebase SDK + Firestore real-time reads, add to, app.html} · 5 · ~a
- {/api/data + /api/seed + /api/refresh Workers + KV, remove from, functions/} · 5 · ~d
- {Firebase Auth sign-in after NOUS auth, add to, login flow} · 3 · ~a

### In Progress

### Done

---

## Board 43 — Provisioning Page + Admin Gate (16 pts) ⛔ blocked by Board 42

### Ready
- {provision.html page + tenant creation form, add to, alumni/admin/} · 5 · ~a
- {tenant create Worker endpoint, add to, functions/api/} · 5 · ~a
- {admin-only session guard + super-admin role check, add to, provision.html} · 3 · ~a
- {acmedev brand + Be style for admin pages, add to, admin/admin.css} · 3 · ~a

### In Progress

### Done

---

## Board 44 — Provisioning UX + Tenant Onboarding (13 pts) ⛔ blocked by Board 43

### Ready
- {live brand preview (color picker + logo preview), add to, provision.html} · 5 · ~a
- {tenant list + status dashboard, add to, admin/tenants.html} · 5 · ~a
- {first-user onboarding wizard, add to, app.html} · 3 · ~a

### In Progress

### Done
