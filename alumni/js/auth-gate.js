/* auth-gate.js — Be standard auth gate controller
 *
 * Handles registration, login, session management.
 * Talks to the C auth gate server (/register, /auth, /session).
 *
 * Pattern from kastil-systems/nous desktop.js.
 * Vanilla JS. No frameworks.
 */
(function () {
  'use strict';

  var API_BASE = '';  /* same origin — gate server serves this file */

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

  /* ── Session token storage ── */

  function saveSession(token) {
    try { sessionStorage.setItem('be-auth-session', token); } catch (e) {}
  }

  function getSession() {
    try { return sessionStorage.getItem('be-auth-session'); } catch (e) { return null; }
  }

  function clearSession() {
    try { sessionStorage.removeItem('be-auth-session'); } catch (e) {}
  }

  /* ── API calls ── */

  function post(path, body, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + path, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function () {
      try { cb(null, JSON.parse(xhr.responseText)); }
      catch (e) { cb('parse error'); }
    };
    xhr.onerror = function () { cb('network error'); };
    xhr.send(JSON.stringify(body));
  }

  /* ── Dismiss gate, show content ── */

  function dismiss() {
    gate.classList.add('hidden');
    if (content) content.style.display = '';
    /* Dispatch event for the host page */
    window.dispatchEvent(new CustomEvent('auth-gate-open'));
  }

  /* ── QR rendering on canvas ── */

  function renderQR(canvas, qrData, qrSize) {
    var ctx = canvas.getContext('2d');
    var scale = Math.floor(canvas.width / (qrSize + 8));
    var offset = Math.floor((canvas.width - qrSize * scale) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    for (var r = 0; r < qrSize; r++) {
      for (var c = 0; c < qrSize; c++) {
        if (qrData[r * qrSize + c]) {
          ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
        }
      }
    }
  }

  /* ── Check existing session on load ── */

  function checkSession() {
    var token = getSession();
    if (!token) return;

    post('/session', { session: token }, function (err, res) {
      if (!err && res && res.status === 'ok') {
        dismiss();
      } else {
        clearSession();
      }
    });
  }

  /* ── Login ── */

  loginBtn.addEventListener('click', function () {
    var user = userInput.value.trim();
    var totp = totpInput.value.trim();
    if (!user || !totp) { errorSpan.textContent = 'enter username and code'; return; }

    errorSpan.textContent = 'authenticating...';
    loginBtn.disabled = true;

    post('/auth', { user: user, totp: parseInt(totp, 10) }, function (err, res) {
      loginBtn.disabled = false;
      if (err) { errorSpan.textContent = 'network error'; return; }

      if (res.status === 'ok') {
        saveSession(res.session);
        dismiss();
      } else if (res.status === 'not_found') {
        errorSpan.textContent = 'user not found — register below';
      } else {
        errorSpan.textContent = 'wrong code — try again';
      }
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

    post('/register', { user: user }, function (err, res) {
      registerBtn.disabled = false;
      if (err) { errorSpan.textContent = 'network error'; return; }

      if (res.status === 'ok') {
        /* Show QR view */
        formView.style.display = 'none';
        qrView.classList.remove('hidden');
        errorSpan.textContent = '';

        if (res.qr_data && res.qr_size) {
          renderQR(qrCanvas, res.qr_data, res.qr_size);
        }
      } else if (res.error === 'user already registered') {
        errorSpan.textContent = 'already registered — log in above';
      } else {
        errorSpan.textContent = res.error || 'registration failed';
      }
    });
  });

  /* ── Verify (after QR scan) ── */

  qrVerifyBtn.addEventListener('click', function () {
    var user = userInput.value.trim();
    var totp = qrTotpInput.value.trim();
    if (!totp) { qrErrorSpan.textContent = 'enter the code from your app'; return; }

    qrErrorSpan.textContent = 'verifying...';
    qrVerifyBtn.disabled = true;

    post('/auth', { user: user, totp: parseInt(totp, 10) }, function (err, res) {
      qrVerifyBtn.disabled = false;
      if (err) { qrErrorSpan.textContent = 'network error'; return; }

      if (res.status === 'ok') {
        saveSession(res.session);
        dismiss();
      } else {
        qrErrorSpan.textContent = 'wrong code — try again';
      }
    });
  });

  qrTotpInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') qrVerifyBtn.click();
  });

  /* ── Init ── */

  checkSession();

})();
