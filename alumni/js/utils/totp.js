/* totp.js — TOTP generator (RFC 6238)
 *
 * Uses Web Crypto HMAC-SHA1 to generate TOTP codes.
 * No dependencies. Vanilla JS.
 *
 * Usage:
 *   totp_generate('B7DVXIRZCE5ED2JTZNXHAZJJUW2PPQWT').then(code => ...)
 */
(function () {
  'use strict';

  var DIGITS = 6;
  var PERIOD = 30;

  /* Base32 decode (RFC 4648) */
  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Decode(str) {
    str = str.replace(/[=\s]/g, '').toUpperCase();
    var bits = '';
    for (var i = 0; i < str.length; i++) {
      var val = B32.indexOf(str[i]);
      if (val < 0) continue;
      bits += ('00000' + val.toString(2)).slice(-5);
    }
    var bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (var j = 0; j < bytes.length; j++) {
      bytes[j] = parseInt(bits.substr(j * 8, 8), 2);
    }
    return bytes;
  }

  /* Generate TOTP code from base32 secret */
  function totp_generate(secretB32, now) {
    var secret = base32Decode(secretB32);
    var time = now || Math.floor(Date.now() / 1000);
    var counter = Math.floor(time / PERIOD);

    /* Counter as 8-byte big-endian */
    var msg = new Uint8Array(8);
    for (var i = 7; i >= 0; i--) {
      msg[i] = counter & 0xFF;
      counter = Math.floor(counter / 256);
    }

    return crypto.subtle.importKey(
      'raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    ).then(function (key) {
      return crypto.subtle.sign('HMAC', key, msg);
    }).then(function (sig) {
      var h = new Uint8Array(sig);
      var offset = h[h.length - 1] & 0x0F;
      var code = ((h[offset] & 0x7F) << 24 |
                   h[offset + 1] << 16 |
                   h[offset + 2] << 8 |
                   h[offset + 3]) % 1000000;
      var str = String(code);
      while (str.length < DIGITS) str = '0' + str;
      return str;
    });
  }

  window.totp_generate = totp_generate;

})();
