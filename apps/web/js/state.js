/* ===== state.js: Global State Management ===== */
'use strict';

// Expose state on a global app object so all modules can share it.
window.AppState = {
  currentLanguage: 'fa',
  currentLocation: null,
  weatherCache: null,
  countdownInterval: null,
  isOnline: navigator.onLine,
  completedActions: new Set()
};
