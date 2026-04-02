/* app-guard.js — session check for app.html
 *
 * If no valid session, redirect to login.html.
 * Handles session timer + auto-expire.
 *
 * Depends: wire.js, nous.js (loaded before this script)
 * Vanilla JS. No frameworks.
 */
(function () {
  'use strict';

  var LOGIN_URL = './login.html';
  var SESSION_TTL = 900;  /* 15 minutes */
  var WARN_AT = 120;

  var timerEl = document.getElementById('auth-session-timer');
  var sessionStart = 0;
  var timerInterval = null;

  function goToLogin() {
    nous_session_clear();
    window.location.href = LOGIN_URL;
  }

  /* ── Session timer ── */

  function startTimer() {
    sessionStart = Date.now();
    if (!timerEl) return;
    timerEl.style.display = '';
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
  }

  function updateTimer() {
    var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
    var remaining = SESSION_TTL - elapsed;

    if (remaining <= 0) {
      goToLogin();
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

  /* ── Init: check session, redirect if invalid ── */

  nous_session_check().then(function (valid) {
    if (!valid) {
      goToLogin();
    } else {
      startTimer();
    }
  });

})();
