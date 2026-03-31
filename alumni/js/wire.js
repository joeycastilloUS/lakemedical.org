/* wire.js — NTRP0001 pack/unpack for the browser
 *
 * Exact JS port of kASTIL/nous/comms/skill/wire/wire.c
 * Binary triple format: {subject, predicate, object}
 * Byte order: LITTLE-ENDIAN (matches wire.c w16/w32/r16/r32)
 *
 * Frame layout:
 *   [8B magic "NTRP0001"]
 *   [4B triple_count   LE]
 *   [4B payload_bytes   LE]
 *   [payload: packed triples]
 *
 * Each triple in payload:
 *   [2B subject_len LE][subject bytes]
 *   [2B predicate_len LE][predicate bytes]
 *   [2B object_len LE][object bytes]
 *
 * No frameworks. No dependencies. Vanilla JS.
 */
(function () {
  'use strict';

  var WIRE_MAGIC = 'NTRP0001';
  var WIRE_HEADER_SIZE = 16;
  var WIRE_MAX_FRAME = 131072; /* 128KB, matches WIRE_BUF_SIZE */

  var encoder = new TextEncoder();
  var decoder = new TextDecoder();

  /**
   * Pack array of {s, p, o} triples into NTRP0001 binary frame.
   * @param {Array<{s:string, p:string, o:string}>} triples
   * @returns {Uint8Array} NTRP frame
   */
  function wire_pack(triples) {
    if (!triples || !triples.length) return null;

    /* Encode all strings first to calculate payload size */
    var encoded = [];
    var payload_size = 0;
    for (var i = 0; i < triples.length; i++) {
      var t = triples[i];
      var s = encoder.encode(t.s);
      var p = encoder.encode(t.p);
      var o = encoder.encode(t.o);
      payload_size += 2 + s.length + 2 + p.length + 2 + o.length;
      encoded.push({ s: s, p: p, o: o });
    }

    if (WIRE_HEADER_SIZE + payload_size > WIRE_MAX_FRAME) return null;

    var buf = new Uint8Array(WIRE_HEADER_SIZE + payload_size);
    var view = new DataView(buf.buffer);

    /* Header: magic + count (LE) + payload_bytes (LE) */
    buf.set(encoder.encode(WIRE_MAGIC), 0);
    view.setUint32(8, triples.length, true);
    view.setUint32(12, payload_size, true);

    /* Payload: triples */
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

  /**
   * Unpack NTRP0001 binary frame into array of {s, p, o} triples.
   * @param {Uint8Array} buf
   * @returns {Array<{s:string, p:string, o:string}>|null}
   */
  function wire_unpack(buf) {
    if (!wire_is_ntrp(buf)) return null;

    var view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    var count = view.getUint32(8, true);
    var payload_len = view.getUint32(12, true);

    if (buf.length < WIRE_HEADER_SIZE + payload_len) return null;

    var triples = [];
    var pos = WIRE_HEADER_SIZE;
    var end = WIRE_HEADER_SIZE + payload_len;

    for (var i = 0; i < count; i++) {
      var fields = [];
      for (var f = 0; f < 3; f++) {
        if (pos + 2 > end) return null;
        var len = view.getUint16(pos, true);
        pos += 2;
        if (pos + len > end) return null;
        fields.push(decoder.decode(buf.slice(pos, pos + len)));
        pos += len;
      }
      triples.push({ s: fields[0], p: fields[1], o: fields[2] });
    }

    return triples;
  }

  /**
   * Check if buffer starts with NTRP0001 magic.
   * Matches wire.c wire_is_ntrp(): len >= 16 && magic matches.
   * @param {Uint8Array} buf
   * @returns {boolean}
   */
  function wire_is_ntrp(buf) {
    if (!buf || buf.length < WIRE_HEADER_SIZE) return false;
    return decoder.decode(buf.slice(0, 8)) === WIRE_MAGIC;
  }

  /**
   * Find first triple matching predicate, return its subject.
   * Matches wire.c wire_find() but returns subject (the "word").
   */
  function wire_find(triples, predicate) {
    for (var i = 0; i < triples.length; i++) {
      if (triples[i].p === predicate) return triples[i].s;
    }
    return null;
  }

  /**
   * Find triple by subject + predicate, return object.
   * Matches wire.c wire_find2().
   */
  function wire_find2(triples, subject, predicate) {
    for (var i = 0; i < triples.length; i++) {
      if (triples[i].s === subject && triples[i].p === predicate)
        return triples[i].o;
    }
    return null;
  }

  /**
   * Extract the action word (first triple with predicate="action").
   * Matches wire.c wire_action().
   */
  function wire_action(triples) {
    return wire_find(triples, 'action');
  }

  /**
   * Collect all entity words.
   * Matches wire.c wire_entities().
   */
  function wire_entities(triples) {
    var out = [];
    for (var i = 0; i < triples.length; i++) {
      if (triples[i].p === 'entity') out.push(triples[i].s);
    }
    return out;
  }

  /* Export to window */
  window.wire_pack = wire_pack;
  window.wire_unpack = wire_unpack;
  window.wire_is_ntrp = wire_is_ntrp;
  window.wire_find = wire_find;
  window.wire_find2 = wire_find2;
  window.wire_action = wire_action;
  window.wire_entities = wire_entities;

})();
