/* ===== modules/calculator.js: Manual Calculator, Formula, Copy Time ===== */
'use strict';

(function() {
  const S = window.AppState;

  window.resetManualCalculator = function() {
    const input = document.getElementById('manualSunrise');
    const results = document.getElementById('manualResult');
    const display = document.getElementById('timeDisplay');
    if (input) input.value = '';
    if (display) display.textContent = '--:--';
    if (results) results.style.display = 'none';
    if (document.getElementById('meridiemToggle')) document.getElementById('meridiemToggle').textContent = 'AM';
  };

  window.syncMeridiemToggle = function() {
    const value = document.getElementById('manualSunrise').value;
    const toggle = document.getElementById('meridiemToggle');
    const display = document.getElementById('timeDisplay');
    if (!value) { toggle.textContent = 'AM'; display.textContent = '--:--'; return; }
    toggle.textContent = Number(value.split(':')[0]) >= 12 ? 'PM' : 'AM';
    display.textContent = value;
  };

  window.toggleMeridiem = function() {
    const input = document.getElementById('manualSunrise');
    let [hour, minute] = (input.value || '06:00').split(':').map(Number);
    hour = hour >= 12 ? hour - 12 : hour + 12;
    input.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    window.syncMeridiemToggle();
  };

  window.applyTodaySunrise = function() {
    if (!S.weatherCache || !S.weatherCache.rawSunrise) {
      window.showToast(S.currentLanguage === 'fa' ? 'زمان طلوع هنوز در دسترس نیست.' : 'Sunrise time is not available yet.'); return;
    }
    const sunriseDate = new Date(S.weatherCache.rawSunrise);
    const hours = String(sunriseDate.getHours()).padStart(2, '0');
    const minutes = String(sunriseDate.getMinutes()).padStart(2, '0');
    document.getElementById('manualSunrise').value = `${hours}:${minutes}`;
    window.syncMeridiemToggle();
    window.calculateManual();
  };

  window.calculateManual = function() {
    const value = document.getElementById('manualSunrise').value;
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    const sunrise = new Date(); sunrise.setHours(h, m, 0, 0);
    const leave = new Date(sunrise - 30 * 60000), wake = new Date(sunrise - 55 * 60000);
    const locale = S.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    const opts = { hour:'2-digit', minute:'2-digit', hour12:false };
    const wakeText = wake.toLocaleTimeString(locale, opts);
    const leaveText = leave.toLocaleTimeString(locale, opts);
    const sunriseText = sunrise.toLocaleTimeString(locale, opts);
    document.getElementById('manualWake').textContent = wakeText;
    document.getElementById('manualLeave').textContent = leaveText;
    document.getElementById('timelineWake').textContent = wakeText;
    document.getElementById('timelineLeave').textContent = leaveText;
    document.getElementById('timelineSunrise').textContent = sunriseText;
    document.getElementById('manualResult').style.display = 'grid';
  };

  window.copyManualTime = async function(id) {
    const value = document.getElementById(id).textContent;
    const ok = await window.copyToClipboard(value);
    window.showToast(S.currentLanguage === 'fa' ? (ok ? 'زمان کپی شد.' : 'کپی کردن امکان‌پذیر نیست.') : (ok ? 'Time copied.' : 'Unable to copy time.'), 1800, 'info');
  };

})();
