# Board: lakemedical.org — NOUS Wire Auth

Updated 2026-04-02 · 18 items · 76 pts · 5 boards
Source: plan-lakemedical-repo-nous-auth-v3.html

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

Source: plan-close-the-loop.html → estimate-close-the-loop.html

### Ready

### In Progress

### Done
- {502 root cause, diagnose on, relay logs + prime reachability + PSK match} · 5 · ~f ✅
- {prime VMs + binary, verify on, GCE nodes + wire auth handler} · 5 · ~t ✅
- {test user with TOTP secret, add to, prime user store} · 3 · ~a ✅
- {full auth round-trip, test on, lakemedical.org → relay → prime} · 5 · ~t ✅
- {E2E test script, update with, real auth assertions + session token check} · 3 · ~u ✅

---

## Board 31 — Fix QR Code (8 pts)

Source: plan-qr-fix.html → estimate-qr-fix.html

### Ready
- {qr.js, replace with, faithful C port of qr.c} · 5 · ~u
- {QR scannable output, test on, browser register flow} · 3 · ~t

### In Progress

### Done
