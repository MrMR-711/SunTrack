/* ===== modules/actions.js: Pre-departure Checklist, ProgressBar, Save State ===== */
'use strict';

(function() {
  const S = window.AppState;

  function saveActionsChecklist() {
    window.saveConfig('actions_checklist', { date: window.localDeviceDateKey(), completed: [...S.completedActions] });
  }

  function initializeActionsChecklist() {
    const today = window.localDeviceDateKey();
    const saved = window.getConfig('actions_checklist');
    if (saved && saved.date === today && Array.isArray(saved.completed)) {
      S.completedActions = new Set(saved.completed.filter(index => Number.isInteger(index) && index >= 0 && index < 4));
    } else {
      S.completedActions = new Set();
      window.saveConfig('actions_checklist', { date: today, completed: [] });
    }
  }

  function renderActionsProgress() {
    const total = window.i18n[S.currentLanguage].actions.length;
    const done = S.completedActions.size;
    document.getElementById('actionsProgressText').textContent = S.currentLanguage === 'fa'
      ? `${done.toLocaleString('fa-IR')} از ${total.toLocaleString('fa-IR')} انجام شده`
      : `${done} of ${total} completed`;
    document.getElementById('actionsProgressBar').style.width = `${(done / total) * 100}%`;
    document.getElementById('completeActionsBtn').classList.toggle('ready', done === total);
    document.getElementById('completeActionsBtn').disabled = done !== total;
  }

  window.renderActionsChecklist = function() {
    const actionIcons = ['fa-glass-water', 'fa-person-walking', 'fa-lungs', 'fa-key'];
    const elActionList = document.getElementById('actionList');
    const langObj = window.i18n[S.currentLanguage];
    elActionList.innerHTML = '';
    langObj.actions.forEach((action, index) => {
      const li = document.createElement('li');
      li.className = S.completedActions.has(index) ? 'checked' : '';
      li.innerHTML = `<span class="action-icon"><i class="fa-solid ${actionIcons[index]}"></i></span><span class="action-name">${action}</span><span class="action-description">${langObj.actionDescriptions[index]}</span><span class="action-check"><i class="fa-solid fa-check"></i></span>`;
      li.addEventListener('click', () => {
        S.completedActions.has(index) ? S.completedActions.delete(index) : S.completedActions.add(index);
        saveActionsChecklist();
        window.setLanguage(S.currentLanguage);
      });
      elActionList.appendChild(li);
    });
    renderActionsProgress();
  };

  window.resetActionsChecklist = function() {
    S.completedActions = new Set();
    saveActionsChecklist();
    window.setLanguage(S.currentLanguage);
  };

  // Event listeners for actions buttons
  document.getElementById('completeActionsBtn').addEventListener('click', () => {
    window.showToast(S.currentLanguage === 'fa' ? 'روتین صبحگاهی ثبت شد. روز خوبی داشته باشید!' : 'Morning routine saved. Have a great day!', 3500, 'info');
  });
  document.getElementById('resetActionsBtn').addEventListener('click', window.resetActionsChecklist);
  document.getElementById('changeParametersBtn').addEventListener('click', () => {
    window.showToast(S.currentLanguage === 'fa' ? 'امکان تغییر بازه‌ها در نسخه بعدی اضافه می‌شود.' : 'Time-range editing will be available in a future update.', 3000, 'info');
  });

  // Daily reset check
  setInterval(() => {
    const saved = window.getConfig('actions_checklist');
    if (!saved || saved.date !== window.localDeviceDateKey()) window.resetActionsChecklist();
  }, 60000);

  window.initializeActionsChecklist = initializeActionsChecklist;

})();
