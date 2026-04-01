/* auth-gate.js — NOUS wire protocol auth gate
 *
 * Login + register via wire triples through nous.js.
 * No JSON endpoints. Binary NTRP all the way.
 *
 * Depends: wire.js, nous.js (loaded before this script)
 * Vanilla JS. No frameworks.
 */
(function () {
  'use strict';

  var SESSION_TTL = 900;  /* 15 minutes, matches RELAY_SESSION_TTL */
  var WARN_AT = 120;      /* show warning with 2 min remaining */

  var gate        = document.getElementById('auth-gate');
  var content     = document.getElementById('protected-content');
  var formView    = document.getElementById('auth-form');
  var qrView      = document.getElementById('auth-qr-view');
  var userInput   = document.getElementById('auth-user');
  var totpInput   = document.getElementById('auth-totp');
  var loginBtn    = document.getElementById('auth-login-btn');
  var registerBtn = document.getElementById('auth-register-btn');
  var errorSpan   = document.getElementById('auth-error');
  var qrCanvas    = document.getElementById('auth-qr-canvas');
  var qrTotpInput = document.getElementById('auth-qr-totp');
  var qrVerifyBtn = document.getElementById('auth-qr-verify-btn');
  var qrErrorSpan = document.getElementById('auth-qr-error');
  var timerEl     = document.getElementById('auth-session-timer');

  var sessionStart = 0;
  var timerInterval = null;

  /* ── Dismiss gate, show content ── */

  function dismiss() {
    gate.classList.add('hidden');
    if (content) content.style.display = '';
    window.dispatchEvent(new CustomEvent('auth-gate-open'));
    startTimer();
  }

  /* ── Raise gate, hide content ── */

  function raise() {
    gate.classList.remove('hidden');
    if (content) content.style.display = 'none';
    formView.style.display = '';
    qrView.classList.add('hidden');
    errorSpan.textContent = '';
    totpInput.value = '';
    stopTimer();
    nous_session_clear();
    window.dispatchEvent(new CustomEvent('auth-gate-close'));
  }

  /* ── Session timer ── */

  function startTimer() {
    sessionStart = Date.now();
    stopTimer();
    if (!timerEl) return;
    timerEl.style.display = '';
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (timerEl) { timerEl.style.display = 'none'; timerEl.className = ''; }
  }

  function updateTimer() {
    var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    var remaining = SESSION_TTL - elapsed;

    if (remaining <= 0) {
      raise();
      return;
    }

    var min = Math.floor(remaining / 60);
    var sec = remaining % 60;
    timerEl.textContent = 'Session: ' + min + ':' + (sec < 10 ? '0' : '') + sec;

    if (remaining <= WARN_AT) {
      timerEl.className = remaining <= 60 ? 'critical' : 'warning';
    } else {
      timerEl.className = '';
    }
  }

  /* ── QR rendering on canvas ── */

  function renderQR(canvas, matrix, size) {
    var ctx = canvas.getContext('2d');
    var scale = Math.floor(canvas.width / (size + 8));
    var offset = Math.floor((canvas.width - size * scale) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    for (var r = 0; r < size; r++) {
      for (var c = 0; c < size; c++) {
        if (matrix[r * size + c]) {
          ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
        }
      }
    }
  }

  /* ── Check existing session on load ── */

  function checkSession() {
    nous_session_check().then(function (valid) {
      if (valid) dismiss();
    });
  }

  /* ── Login ── */

  loginBtn.addEventListener('click', function () {
    var user = userInput.value.trim();
    var totp = totpInput.value.trim();
    if (!user || !totp) { errorSpan.textContent = 'enter username and code'; return; }

    errorSpan.textContent = 'authenticating...';
    loginBtn.disabled = true;

    nous_auth(user, totp).then(function (triples) {
      loginBtn.disabled = false;
      var status = nous_status(triples);

      if (status === 'ok') {
        var token = nous_find(triples, 'signal');
        if (token) {
          nous_session_save(token);
          dismiss();
        } else {
          errorSpan.textContent = 'auth failed — no token';
        }
      } else if (status === 'rejected') {
        errorSpan.textContent = 'wrong code — try again';
      } else {
        var msg = nous_find(triples, 'message');
        errorSpan.textContent = msg || 'authentication failed';
      }
    }).catch(function () {
      loginBtn.disabled = false;
      errorSpan.textContent = 'network error';
    });
  });

  totpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') loginBtn.click();
  });

  /* ── Register ── */

  registerBtn.addEventListener('click', function () {
    var user = userInput.value.trim();
    if (!user) { errorSpan.textContent = 'enter a username first'; return; }

    errorSpan.textContent = 'registering...';
    registerBtn.disabled = true;

    nous_register(user).then(function (triples) {
      registerBtn.disabled = false;
      var status = nous_status(triples);

      if (status === 'ok') {
        formView.style.display = 'none';
        qrView.classList.remove('hidden');
        errorSpan.textContent = '';

        /* QR matrix comes from the server (C qr.c), base64-encoded */
        var qrB64  = nous_find(triples, 'qr_data');
        var qrSize = parseInt(nous_find(triples, 'qr_size'), 10);
        if (qrB64 && qrSize) {
          var raw = atob(qrB64);
          var matrix = new Uint8Array(raw.length);
          for (var j = 0; j < raw.length; j++) matrix[j] = raw.charCodeAt(j);
          renderQR(qrCanvas, matrix, qrSize);
        }
      } else {
        var msg = nous_find(triples, 'message');
        errorSpan.textContent = msg || 'registration failed';
      }
    }).catch(function () {
      registerBtn.disabled = false;
      errorSpan.textContent = 'network error';
    });
  });

  /* ── Verify (after QR scan) ── */

  qrVerifyBtn.addEventListener('click', function () {
    var user = userInput.value.trim();
    var totp = qrTotpInput.value.trim();
    if (!totp) { qrErrorSpan.textContent = 'enter the code from your app'; return; }

    qrErrorSpan.textContent = 'verifying...';
    qrVerifyBtn.disabled = true;

    nous_auth(user, totp).then(function (triples) {
      qrVerifyBtn.disabled = false;
      var status = nous_status(triples);

      if (status === 'ok') {
        var token = nous_find(triples, 'signal');
        if (token) {
          nous_session_save(token);
          dismiss();
        }
      } else {
        qrErrorSpan.textContent = 'wrong code — try again';
      }
    }).catch(function () {
      qrVerifyBtn.disabled = false;
      qrErrorSpan.textContent = 'network error';
    });
  });

  qrTotpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') qrVerifyBtn.click();
  });

  /* ── Init ── */

  checkSession();

})();
