/* ===== utils.js: Toast, Touch Press, Clipboard, Keyboard/Copy Prevention ===== */
'use strict';

(function() {
  const S = window.AppState;

  // ----- Prevent selection, clipboard shortcuts, context menus and image dragging outside editable fields. -----
  const isEditableField = target => target && target.closest('input, textarea, [contenteditable="true"]');
  document.addEventListener('contextmenu', event => { if (!isEditableField(event.target)) event.preventDefault(); }, true);
  document.addEventListener('selectstart', event => { if (!isEditableField(event.target)) event.preventDefault(); }, true);
  document.addEventListener('copy', event => { if (!isEditableField(event.target)) event.preventDefault(); }, true);
  document.addEventListener('paste', event => { if (!isEditableField(event.target)) event.preventDefault(); }, true);
  document.addEventListener('dragstart', event => { if (event.target.closest('img')) event.preventDefault(); }, true);
  document.addEventListener('keydown', event => {
    if (!isEditableField(event.target) && (event.ctrlKey || event.metaKey) && ['c', 'x', 'v', 'a'].includes(event.key.toLowerCase())) event.preventDefault();
  }, true);

  // ----- Lightweight mobile press simulation -----
  const interactiveSelector = 'button, a, [role="button"], .home-feature-card, .settings-action-card, .more-hero, .search-result-item, .contact-card, .selector-btn, .modal-option, .btn-clear-loc';
  let pressedElement = null;
  const clearPressed = () => { if (pressedElement) pressedElement.classList.remove('is-pressed'); pressedElement = null; };
  document.addEventListener('touchstart', event => {
    clearPressed();
    pressedElement = event.target.closest(interactiveSelector);
    if (pressedElement) pressedElement.classList.add('is-pressed');
  }, { passive: true, capture: true });
  document.addEventListener('touchend', clearPressed, { passive: true, capture: true });
  document.addEventListener('touchcancel', clearPressed, { passive: true, capture: true });
  window.addEventListener('scroll', clearPressed, { passive: true });

  // ----- Toast Notification System -----
  let toastTimeout = null;
  window.showToast = function(message, duration, type) {
    duration = duration || 3500;
    type = type || 'error';
    const toast = document.getElementById('toast');
    // اگه toast قبلی هنوز نمایش داده می‌شه، اول cancel کن
    if (toastTimeout) {
      clearTimeout(toastTimeout);
      toastTimeout = null;
    }
    toast.textContent = message;
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    toastTimeout = setTimeout(() => { toast.classList.remove('show'); }, duration);
  };

  // ----- Clipboard fallback for Android WebView & older browsers -----
  window.copyToClipboard = async function(value) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      return true;
    } catch (e) { return false; }
  };

  // ----- LocalStorage helpers -----
  window.saveConfig = function(key, val) {
    try { localStorage.setItem('sunrisetracker_' + key, JSON.stringify(val)); } catch (e) { }
  };
  window.getConfig = function(key) {
    try { const raw = localStorage.getItem('sunrisetracker_' + key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  };
  window.localDeviceDateKey = function() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // ----- Connectivity Checker -----
  window.handleConnectivityChange = function() {
    S.isOnline = navigator.onLine;
    const elStatusDot = document.getElementById('statusDot');
    const elStatusText = document.getElementById('statusText');
    const lang = window.i18n[S.currentLanguage];
    if (S.isOnline) {
      elStatusDot.className = 'status-dot online';
      elStatusText.textContent = lang.statusOnline;
    } else {
      elStatusDot.className = 'status-dot offline';
      elStatusText.textContent = lang.statusOffline;
      window.showToast(lang.errNoInternet);
    }
  };
  window.addEventListener('online', window.handleConnectivityChange);
  window.addEventListener('offline', window.handleConnectivityChange);

})();
