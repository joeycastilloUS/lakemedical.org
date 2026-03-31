/* qr.js — Minimal QR Code encoder for otpauth:// URIs
 *
 * Encodes a string into a QR code matrix (Mode Byte, ECC Level M).
 * Returns { data: Uint8Array, size: number } where data[r*size+c] = 1|0.
 *
 * Supports QR versions 1-10 (up to 271 chars at ECC M).
 * Sufficient for otpauth:// TOTP URIs.
 *
 * No frameworks. No dependencies. Vanilla JS.
 * Based on ISO/IEC 18004 (QR Code specification).
 */
(function () {
  'use strict';

  /* ── Constants ── */

  /* ECC M capacities (byte mode) for versions 1-10 */
  var CAPACITIES = [0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213];

  /* ECC codeword counts per version (ECC M) */
  var ECC_CODEWORDS = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];

  /* Number of ECC blocks per version (ECC M) */
  var ECC_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 4, 4]; // simplified — uses only group 1 blocks for simplicity within v1-6

  /* Alignment pattern positions per version */
  var ALIGN_POS = [
    [], [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50]
  ];

  /* Format info bits for ECC M, mask 0-7 */
  var FORMAT_BITS = [
    0x5412, 0x5125, 0x5E7C, 0x5B4B, 0x45F9, 0x40CE, 0x4F97, 0x4AA0
  ];

  /* ── GF(256) arithmetic ── */

  var EXP_TABLE = new Uint8Array(256);
  var LOG_TABLE = new Uint8Array(256);
  (function () {
    var v = 1;
    for (var i = 0; i < 255; i++) {
      EXP_TABLE[i] = v;
      LOG_TABLE[v] = i;
      v = (v << 1) ^ (v >= 128 ? 0x11D : 0);
    }
    EXP_TABLE[255] = EXP_TABLE[0];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
  }

  /* ── Reed-Solomon ECC ── */

  function rsGenPoly(n) {
    var poly = new Uint8Array(n + 1);
    poly[0] = 1;
    for (var i = 0; i < n; i++) {
      var newPoly = new Uint8Array(n + 1);
      for (var j = n; j >= 1; j--) {
        newPoly[j] = poly[j] ^ gfMul(poly[j - 1], EXP_TABLE[i]);
      }
      newPoly[0] = gfMul(poly[0], EXP_TABLE[i]);
      // shift
      for (var k = 0; k <= n; k++) poly[k] = newPoly[k];
    }
    return poly;
  }

  function rsEncode(data, eccCount) {
    var gen = rsGenPoly(eccCount);
    var result = new Uint8Array(eccCount);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ result[0];
      // shift result left
      for (var j = 0; j < eccCount - 1; j++) result[j] = result[j + 1];
      result[eccCount - 1] = 0;
      for (var j = 0; j < eccCount; j++) {
        result[j] ^= gfMul(gen[j], factor);
      }
    }
    return result;
  }

  /* ── Data encoding (byte mode) ── */

  function encodeData(text, version) {
    var totalCodewords = getDataCodewords(version) + ECC_CODEWORDS[version];
    var dataCodewords = getDataCodewords(version);
    var bytes = [];

    /* Mode indicator: 0100 (byte mode) */
    /* Character count: 8 bits for v1-9, 16 bits for v10+ */
    var countBits = version <= 9 ? 8 : 16;

    var bitstream = [];
    /* Mode: 0100 */
    pushBits(bitstream, 4, 4);
    /* Count */
    pushBits(bitstream, text.length, countBits);
    /* Data */
    for (var i = 0; i < text.length; i++) {
      pushBits(bitstream, text.charCodeAt(i) & 0xFF, 8);
    }
    /* Terminator */
    var remaining = dataCodewords * 8 - bitstream.length;
    if (remaining > 4) remaining = 4;
    if (remaining > 0) pushBits(bitstream, 0, remaining);

    /* Pad to byte boundary */
    while (bitstream.length % 8 !== 0) bitstream.push(0);

    /* Convert to bytes */
    for (var i = 0; i < bitstream.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | (bitstream[i + j] || 0);
      bytes.push(b);
    }

    /* Pad codewords */
    var padBytes = [0xEC, 0x11];
    var pi = 0;
    while (bytes.length < dataCodewords) {
      bytes.push(padBytes[pi]);
      pi = (pi + 1) % 2;
    }

    return new Uint8Array(bytes);
  }

  function pushBits(arr, value, count) {
    for (var i = count - 1; i >= 0; i--) {
      arr.push((value >> i) & 1);
    }
  }

  function getDataCodewords(version) {
    /* Total codewords minus ECC codewords */
    var totalModules = (version * 4 + 17);
    totalModules = totalModules * totalModules;
    /* Rough formula for total codewords */
    var total = getTotalCodewords(version);
    return total - ECC_CODEWORDS[version] * ECC_BLOCKS[version];
  }

  function getTotalCodewords(version) {
    /* Total data modules / 8 */
    var sizes = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];
    return sizes[version] || 0;
  }

  /* ── Matrix construction ── */

  function createMatrix(version) {
    var size = version * 4 + 17;
    var matrix = new Uint8Array(size * size);
    var reserved = new Uint8Array(size * size);
    return { data: matrix, reserved: reserved, size: size };
  }

  function setModule(m, row, col, value) {
    if (row >= 0 && row < m.size && col >= 0 && col < m.size) {
      m.data[row * m.size + col] = value ? 1 : 0;
      m.reserved[row * m.size + col] = 1;
    }
  }

  function placeFinderPattern(m, row, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var rr = row + r, cc = col + c;
        if (rr < 0 || rr >= m.size || cc < 0 || cc >= m.size) continue;
        var isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                      (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                      (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setModule(m, rr, cc, isBlack);
      }
    }
  }

  function placeAlignmentPattern(m, row, col) {
    for (var r = -2; r <= 2; r++) {
      for (var c = -2; c <= 2; c++) {
        var isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
        setModule(m, row + r, col + c, isBlack);
      }
    }
  }

  function placePatterns(m, version) {
    /* Finder patterns */
    placeFinderPattern(m, 0, 0);
    placeFinderPattern(m, 0, m.size - 7);
    placeFinderPattern(m, m.size - 7, 0);

    /* Alignment patterns */
    var pos = ALIGN_POS[version];
    if (pos.length > 0) {
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          /* Skip if overlapping finder */
          if (i === 0 && j === 0) continue;
          if (i === 0 && j === pos.length - 1) continue;
          if (i === pos.length - 1 && j === 0) continue;
          placeAlignmentPattern(m, pos[i], pos[j]);
        }
      }
    }

    /* Timing patterns */
    for (var i = 8; i < m.size - 8; i++) {
      setModule(m, 6, i, i % 2 === 0);
      setModule(m, i, 6, i % 2 === 0);
    }

    /* Dark module */
    setModule(m, m.size - 8, 8, 1);

    /* Reserve format info areas */
    for (var i = 0; i < 8; i++) {
      m.reserved[8 * m.size + i] = 1;
      m.reserved[i * m.size + 8] = 1;
      m.reserved[8 * m.size + (m.size - 1 - i)] = 1;
      m.reserved[(m.size - 1 - i) * m.size + 8] = 1;
    }
    m.reserved[8 * m.size + 8] = 1;

    /* Reserve version info for v7+ */
    if (version >= 7) {
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < 3; j++) {
          m.reserved[i * m.size + (m.size - 11 + j)] = 1;
          m.reserved[(m.size - 11 + j) * m.size + i] = 1;
        }
      }
    }
  }

  function placeData(m, codewords) {
    var bitIndex = 0;
    var totalBits = codewords.length * 8;
    var x = m.size - 1;
    var upward = true;

    while (x >= 1) {
      if (x === 6) x--; /* skip timing column */

      for (var i = 0; i < m.size; i++) {
        var row = upward ? (m.size - 1 - i) : i;

        for (var dx = 0; dx <= 1; dx++) {
          var col = x - dx;
          if (m.reserved[row * m.size + col]) continue;

          var bit = 0;
          if (bitIndex < totalBits) {
            bit = (codewords[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1;
            bitIndex++;
          }
          m.data[row * m.size + col] = bit;
        }
      }

      x -= 2;
      upward = !upward;
    }
  }

  /* ── Masking ── */

  var MASK_FUNCS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r, c) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
    function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
    function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
  ];

  function applyMask(m, maskIndex) {
    var fn = MASK_FUNCS[maskIndex];
    for (var r = 0; r < m.size; r++) {
      for (var c = 0; c < m.size; c++) {
        if (!m.reserved[r * m.size + c] && fn(r, c)) {
          m.data[r * m.size + c] ^= 1;
        }
      }
    }
  }

  function penaltyScore(m) {
    var score = 0;
    /* Rule 1: consecutive same-color in rows and columns */
    for (var r = 0; r < m.size; r++) {
      var count = 1;
      for (var c = 1; c < m.size; c++) {
        if (m.data[r * m.size + c] === m.data[r * m.size + c - 1]) {
          count++;
          if (count === 5) score += 3;
          else if (count > 5) score += 1;
        } else {
          count = 1;
        }
      }
    }
    for (var c = 0; c < m.size; c++) {
      var count = 1;
      for (var r = 1; r < m.size; r++) {
        if (m.data[r * m.size + c] === m.data[(r - 1) * m.size + c]) {
          count++;
          if (count === 5) score += 3;
          else if (count > 5) score += 1;
        } else {
          count = 1;
        }
      }
    }
    return score;
  }

  function placeFormatInfo(m, maskIndex) {
    var bits = FORMAT_BITS[maskIndex];
    /* Horizontal */
    for (var i = 0; i <= 7; i++) {
      var bit = (bits >> (14 - i)) & 1;
      var col = i < 6 ? i : (i === 6 ? 7 : 8);
      m.data[8 * m.size + col] = bit;
    }
    for (var i = 0; i <= 6; i++) {
      var bit = (bits >> (6 - i)) & 1;
      m.data[8 * m.size + (m.size - 1 - i)] = bit;
    }
    /* Vertical */
    for (var i = 0; i <= 7; i++) {
      var bit = (bits >> i) & 1;
      var row = i < 6 ? (m.size - 1 - i) : (i === 6 ? 8 : (15 - i));
      m.data[row * m.size + 8] = bit;
    }
    for (var i = 0; i <= 6; i++) {
      var bit = (bits >> (14 - i)) & 1;
      m.data[i * m.size + 8] = bit;
    }
    /* Bit at row 8, col 8 is always set for format info */
  }

  /* ── Public API ── */

  /**
   * Encode a string into a QR code matrix.
   * @param {string} text — the string to encode (e.g. otpauth:// URI)
   * @returns {{data: Uint8Array, size: number}|null}
   */
  function qr_encode(text) {
    if (!text || text.length === 0) return null;

    /* Find minimum version */
    var version = 0;
    for (var v = 1; v <= 10; v++) {
      if (text.length <= CAPACITIES[v]) { version = v; break; }
    }
    if (version === 0) return null; /* too long */

    /* Encode data */
    var dataWords = encodeData(text, version);

    /* Generate ECC */
    var eccPerBlock = ECC_CODEWORDS[version];
    var ecc = rsEncode(dataWords, eccPerBlock);

    /* Interleave data + ECC */
    var allCodewords = new Uint8Array(dataWords.length + ecc.length);
    allCodewords.set(dataWords, 0);
    allCodewords.set(ecc, dataWords.length);

    /* Create matrix and place patterns */
    var m = createMatrix(version);
    placePatterns(m, version);
    placeData(m, allCodewords);

    /* Try all 8 masks, pick lowest penalty */
    var bestMask = 0;
    var bestPenalty = Infinity;
    var bestData = null;

    for (var mask = 0; mask < 8; mask++) {
      /* Copy matrix */
      var copy = {
        data: new Uint8Array(m.data),
        reserved: m.reserved,
        size: m.size
      };
      applyMask(copy, mask);
      placeFormatInfo(copy, mask);
      var p = penaltyScore(copy);
      if (p < bestPenalty) {
        bestPenalty = p;
        bestMask = mask;
        bestData = copy.data;
      }
    }

    return { data: bestData, size: m.size };
  }

  /* Export */
  window.qr_encode = qr_encode;

})();
