/* nous.js — High-level NOUS wire client for the browser
 *
 * Wraps wire.js pack/unpack with fetch to /api/wire.
 * Auth helpers match relay_server.c handle_wire_auth() and
 * handle_wire_register() triple contracts.
 *
 * Flow: triples → wire_pack() → POST /api/wire (binary) →
 *       wire_unpack(response) → triples
 *
 * Session: stored in sessionStorage['nous-session'].
 * Token: 64 hex chars, 900s TTL, IP-bound on relay.
 *
 * No frameworks. No dependencies beyond wire.js.
 */
(function () {
  'use strict';

  var SESSION_KEY = 'nous-session';

  /* ── Core transport ── */

  /**
   * Send wire triples to NOUS via /api/wire Worker proxy.
   * Worker handles 0xCA envelope + TCP relay — browser never sees PSK.
   * @param {Array<{s:string, p:string, o:string}>} triples
   * @returns {Promise<Array<{s:string, p:string, o:string}>|null>}
   */
  function nous_send(triples) {
    var frame = wire_pack(triples);
    if (!frame) return Promise.reject(new Error('wire: pack failed'));

    return fetch('/api/wire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: frame
    }).then(function (resp) {
      if (!resp.ok) throw new Error('wire: ' + resp.status);
      return resp.arrayBuffer();
    }).then(function (ab) {
      return wire_unpack(new Uint8Array(ab));
    });
  }

  /* ── Auth helpers ── */

  /**
   * Login via wire triples.
   * Matches relay_server.c handle_wire_auth():
   *   {auth, action, none} + {user, entity, none} + {totp, signal, none}
   * @param {string} user
   * @param {string|number} totp
   * @returns {Promise<Array<{s:string, p:string, o:string}>|null>}
   */
  function nous_auth(user, totp) {
    return nous_send([
      { s: 'auth',       p: 'action', o: 'none' },
      { s: user,         p: 'entity', o: 'none' },
      { s: String(totp), p: 'signal', o: 'none' }
    ]);
  }

  /**
   * Register — returns otpauth:// URI in response signal triple.
   * Matches relay_server.c handle_wire_register():
   *   {register, action, none} + {user, entity, none}
   * @param {string} user
   * @returns {Promise<Array<{s:string, p:string, o:string}>|null>}
   */
  function nous_register(user) {
    return nous_send([
      { s: 'register', p: 'action', o: 'none' },
      { s: user,       p: 'entity', o: 'none' }
    ]);
  }

  /**
   * Authenticated request — prepends session meta triple.
   * Matches relay_server.c session validation:
   *   {token, meta, session} + [command triples...]
   * @param {string} token  64 hex chars
   * @param {Array<{s:string, p:string, o:string}>} triples
   * @returns {Promise<Array<{s:string, p:string, o:string}>|null>}
   */
  function nous_request(token, triples) {
    var all = [{ s: token, p: 'meta', o: 'session' }];
    for (var i = 0; i < triples.length; i++) all.push(triples[i]);
    return nous_send(all);
  }

  /**
   * Check if current session is still valid on relay.
   * Sends a status action with the stored token.
   * @returns {Promise<boolean>}
   */
  function nous_session_check() {
    var token = nous_session_get();
    if (!token) return Promise.resolve(false);

    return nous_request(token, [
      { s: 'status', p: 'action', o: 'none' }
    ]).then(function (triples) {
      return triples && nous_status(triples) === 'ok';
    }).catch(function () {
      return false;
    });
  }

  /* ── Session storage ── */

  function nous_session_save(token) {
    try { sessionStorage.setItem(SESSION_KEY, token); } catch (e) {}
  }

  function nous_session_get() {
    try { return sessionStorage.getItem(SESSION_KEY); } catch (e) { return null; }
  }

  function nous_session_clear() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* ── Response helpers ── */

  /**
   * Find first triple matching predicate, return its subject.
   * Convenience wrapper over wire_find for response parsing.
   */
  function nous_find(triples, predicate) {
    if (!triples) return null;
    for (var i = 0; i < triples.length; i++) {
      if (triples[i].p === predicate) return triples[i].s;
    }
    return null;
  }

  /**
   * Extract status from response: find {resp, status, <value>}.
   * Returns the object field (ok, error, not_found, etc).
   */
  function nous_status(triples) {
    if (!triples) return null;
    for (var i = 0; i < triples.length; i++) {
      if (triples[i].s === 'resp' && triples[i].p === 'status')
        return triples[i].o;
    }
    return null;
  }

  /* Export to window */
  window.nous_send          = nous_send;
  window.nous_auth          = nous_auth;
  window.nous_register      = nous_register;
  window.nous_request       = nous_request;
  window.nous_session_check = nous_session_check;
  window.nous_session_save  = nous_session_save;
  window.nous_session_get   = nous_session_get;
  window.nous_session_clear = nous_session_clear;
  window.nous_find          = nous_find;
  window.nous_status        = nous_status;

})();
