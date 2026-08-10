/* ===== app.js: Entry Point, Navigation, Theme, Calendar, Init ===== */
'use strict';

(function() {
  const S = window.AppState;

  // ----- DOM References -----
  const views = {
    home: document.getElementById('viewHome'),
    sunrise: document.getElementById('viewSunrise'),
    calculator: document.getElementById('viewCalculator'),
    formula: document.getElementById('viewFormula'),
    actions: document.getElementById('viewActions'),
    settings: document.getElementById('viewSettings'),
    about: document.getElementById('viewAbout')
  };
  const tabs = {
    home: document.getElementById('tabHome'),
    settings: document.getElementById('tabSettings')
  };

  // ----- Navigation -----
  function updateNavIcons(activeTab) {
    document.getElementById('navHomeIcon').className = `nav-item-icon ${activeTab === 'home' ? 'fa-solid fa-house' : 'fa-regular fa-house'}`;
    document.getElementById('navSettingsIcon').className = `nav-item-icon ${activeTab === 'settings' ? 'fa-solid fa-bars' : 'fa-regular fa-rectangle-list'}`;
  }

  window.switchView = function(viewKey) {
    Object.keys(views).forEach(key => views[key].classList.toggle('active', key === viewKey));
    const activeTab = viewKey === 'about' ? 'settings' : ['sunrise','calculator','formula','actions'].includes(viewKey) ? 'home' : viewKey;
    Object.keys(tabs).forEach(key => tabs[key].classList.toggle('active', key === activeTab));
    updateNavIcons(activeTab);
    const detailViews = ['about', 'sunrise', 'calculator', 'formula', 'actions'];
    document.querySelector('.bottom-nav').classList.toggle('hidden-for-detail', detailViews.includes(viewKey));
    if (viewKey !== 'settings') document.querySelector('.location-settings-item')?.classList.remove('open');
    if (viewKey !== 'calculator') window.resetManualCalculator();
  };

  window.navigateTab = function(view) {
    history.replaceState({ appView: view }, '', view === 'home' ? '#home' : '#more');
    window.switchView(view);
  };

  window.openAppPage = function(page) {
    history.replaceState({ appView: 'home' }, '', '#home');
    window.switchView(page);
    history.pushState({ appView: page }, '', '#' + page);
  };

  window.goHome = function() {
    if (history.state && ['sunrise','calculator','formula','actions'].includes(history.state.appView)) history.back();
    else window.navigateTab('home');
  };

  window.openAbout = function() {
    history.replaceState({ appView: 'settings' }, '', '#more');
    window.switchView('about');
    history.pushState({ appView: 'about' }, '', '#about');
  };

  window.goBackFromAbout = function() {
    if (history.state && history.state.appView === 'about') history.back();
    else window.switchView('settings');
  };

  window.addEventListener('popstate', function(event) {
    window.switchView(event.state && ['settings','about','sunrise','calculator','formula','actions'].includes(event.state.appView) ? event.state.appView : 'home');
  });

  // ----- Theme -----
  window.setTheme = function(theme) {
    window.saveConfig('theme', theme);
    const root = document.documentElement;
    if (theme === 'auto') {
      // Remove data-theme to let CSS @media (prefers-color-scheme) handle it
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    document.getElementById('themeValue').textContent = theme === 'light' ? window.i18n[S.currentLanguage].themeLight : theme === 'dark' ? window.i18n[S.currentLanguage].themeDark : window.i18n[S.currentLanguage].themeAuto;
  };

  // ----- Calendar -----
  window.setCalendar = function(calendar) {
    window.saveConfig('calendar', calendar);
    document.getElementById('calendarValue').textContent = calendar === 'jalali' ? window.i18n[S.currentLanguage].calendarJalali : window.i18n[S.currentLanguage].calendarGregorian;
    window.renderLocationDates();
  };

  // ----- Settings Modal -----
  window.openSettingModal = function(type) {
    const lang = window.i18n[S.currentLanguage];
    const modal = document.getElementById('settingsModal');
    const title = document.getElementById('settingsModalTitle');
    const options = document.getElementById('settingsModalOptions');
    const choices = type === 'calendar'
      ? [[lang.calendarJalali,'jalali'],[lang.calendarGregorian,'gregorian']]
      : type === 'theme'
        ? [[lang.themeLight,'light'],[lang.themeDark,'dark'],[lang.themeAuto,'auto']]
        : [[lang.langAuto,'auto'],['فارسی','fa'],['English','en']];
    title.textContent = type === 'calendar' ? lang.lblDateFormat : type === 'theme' ? lang.lblThemeSelect : lang.lblLangSelect;
    options.innerHTML = choices.map(c => `<button class="modal-option" type="button" data-value="${c[1]}">${c[0]}</button>`).join('');
    options.querySelectorAll('.modal-option').forEach(b => b.onclick = () => {
      if (type === 'calendar') window.setCalendar(b.dataset.value);
      else if (type === 'theme') window.setTheme(b.dataset.value);
      else window.setLanguage(b.dataset.value);
      modal.classList.remove('show');
    });
    modal.classList.add('show');
  };
  document.getElementById('settingsModal').addEventListener('click', function(e) { if (e.target === this) this.classList.remove('show'); });

  // ----- Language / i18n Sync -----

  // Detect device language
  function getDeviceLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (browserLang.startsWith('fa') || browserLang.startsWith('persian')) return 'fa';
    if (browserLang.startsWith('en')) return 'en';
    return 'en'; // Default to English for other languages
  }

  window.setLanguage = function(langCode) {
    
    // Handle automatic language detection
    const displayLangCode = langCode;
    if (langCode === 'auto') {
      langCode = getDeviceLanguage();
      window.saveConfig('language', 'auto');
    } else {
      window.saveConfig('language', langCode);
    }
    S.currentLanguage = langCode;
    const htmlNode = document.documentElement;
    if (langCode === 'fa') { htmlNode.setAttribute('dir', 'rtl'); htmlNode.setAttribute('lang', 'fa'); }
    else { htmlNode.setAttribute('dir', 'ltr'); htmlNode.setAttribute('lang', 'en'); }

    const langObj = window.i18n[langCode];
    document.getElementById('statusText').textContent = S.isOnline ? langObj.statusOnline : langObj.statusOffline;
    document.getElementById('lblLocationCard').textContent = langObj.lblLocationCard;
    document.getElementById('lblGpsBtn').textContent = langObj.lblGpsBtn;
    document.getElementById('lblSunriseTime').textContent = langObj.lblSunriseTime;
    document.getElementById('lblDatesCard').textContent = langObj.lblDatesCard;
    document.getElementById('lblToday').textContent = langObj.lblToday;
    document.getElementById('lblTomorrow').textContent = langObj.lblTomorrow;
    document.getElementById('lblDateFormat').textContent = langObj.lblDateFormat;
    document.getElementById('calendarValue').textContent = (window.getConfig('calendar') || 'jalali') === 'jalali' ? langObj.calendarJalali : langObj.calendarGregorian;
    document.getElementById('lblThemeSelect').textContent = langObj.lblThemeSelect;
    document.getElementById('lblSelectedCity').textContent = langObj.lblSelectedCity;
    document.getElementById('locationValue').textContent = S.currentLocation ? S.currentLocation.name : langObj.locationNotSelected;
    const savedTheme = window.getConfig('theme') || 'auto';
    document.getElementById('themeValue').textContent = savedTheme === 'light' ? langObj.themeLight : savedTheme === 'dark' ? langObj.themeDark : langObj.themeAuto;
    const langDisplay = displayLangCode === 'auto' ? langObj.langAuto : (langCode === 'fa' ? 'فارسی' : 'English');
    document.getElementById('languageValue').textContent = langDisplay;
    document.getElementById('lblWakeTime').textContent = langObj.lblWakeTime;
    document.getElementById('lblLeaveTime').textContent = langObj.lblLeaveTime;
    document.getElementById('lblActionsCard').textContent = langObj.lblActionsCard;
    document.getElementById('lblWeatherCard').textContent = langObj.lblWeatherCard;
    document.getElementById('lblSettingsTitle').textContent = langObj.lblSettingsTitle;
    document.getElementById('lblLangSelect').textContent = langObj.lblLangSelect;
    document.getElementById('lblAboutTitle').textContent = langObj.lblAboutTitle;
    document.getElementById('lblAboutMenu').textContent = langObj.lblAboutMenu;
    document.getElementById('aboutAppName').textContent = langObj.appTitle;
    document.getElementById('lblAboutText').textContent = langObj.lblAboutText;
    document.getElementById('aboutPrivacyText').textContent = langObj.aboutPrivacyText;
    document.getElementById('aboutGoalText').innerHTML = langObj.aboutGoalText;
    document.getElementById('aboutAuthorTitle').textContent = langObj.aboutAuthorTitle;
    ['aboutFeature1','aboutFeature2','aboutFeature3','aboutFeature4'].forEach(id => document.getElementById(id).textContent = langObj[id]);
    document.getElementById('tabHomeLabel').textContent = langObj.tabHomeLabel;
    document.getElementById('lblHomeTitle').textContent = langObj.homeTitle;
    document.getElementById('lblHomeSunrise').textContent = langObj.homeSunrise;
    document.getElementById('lblHomeCountdown').textContent = langObj.homeCountdown;
    document.getElementById('lblSunrisePage').textContent = langObj.sunriseDetails;
    document.getElementById('lblCalculatorPage').textContent = langObj.calculatorPage;
    document.getElementById('lblCalculatorSub').textContent = langObj.calculatorSub;
    document.getElementById('lblFormulaPage').textContent = langObj.formulaPage;
    document.getElementById('lblFormulaSub').textContent = langObj.formulaSub;
    document.getElementById('lblActionsPage').textContent = langObj.actionsPage;
    document.getElementById('lblActionsPageSub').textContent = langObj.actionsPageSub;
    document.getElementById('lblActionsPageHeader').textContent = langObj.actionsPage;
    document.getElementById('lblCalculatorPageHeader').textContent = langObj.calculatorPageHeader;
    document.getElementById('lblFormulaPageHeader').textContent = langObj.formulaPageHeader;
    document.getElementById('lblSunrisePageHeader').textContent = langObj.sunrisePageHeader;
    document.getElementById('lblManualInput').textContent = langObj.manualInput;
    document.getElementById('lblCalculate').textContent = langObj.calculate;
    document.getElementById('lblWakeTimeManual').textContent = langObj.wakeTimeManual;
    document.getElementById('lblLeaveTimeManual').textContent = langObj.leaveTimeManual;
    document.getElementById('lblUseTodaySunrise').textContent = langObj.useTodaySunrise;
    document.getElementById('lblCopy').textContent = langObj.copy;
    document.getElementById('lblCopySecond').textContent = langObj.copy;
    document.getElementById('lblTimeline').textContent = langObj.timeline;
    document.getElementById('lblTimelineWake').textContent = langObj.timelineWake;
    document.getElementById('lblTimelineLeave').textContent = langObj.timelineLeave;
    document.getElementById('lblTimelineSunrise').textContent = langObj.timelineSunrise;
    document.getElementById('lblParameters').textContent = langObj.parameters;
    document.getElementById('lblParametersText').textContent = langObj.parametersText;
    document.getElementById('lblChangeParameters').textContent = langObj.changeParameters;
    document.getElementById('lblActionsIntro').textContent = langObj.actionsIntro;
    document.getElementById('lblActionDuration').textContent = langObj.actionDuration;
    document.getElementById('lblCompleteActions').textContent = langObj.completeActions;
    document.getElementById('lblActionTipTitle').textContent = langObj.actionTipTitle;
    document.getElementById('lblActionTip').textContent = langObj.actionTip;
    document.getElementById('lblResetActions').textContent = langObj.resetActions;
    document.getElementById('tabSettingsLabel').textContent = langObj.tabSettingsLabel;
    document.getElementById('lblMorePageTitle').textContent = langObj.morePageTitle;
    document.getElementById('moreHeroTitle').textContent = langObj.moreHeroTitle;
    document.getElementById('moreHeroSubtitle').textContent = langObj.moreHeroSubtitle;
    document.getElementById('lblCountdown').textContent = langObj.lblCountdown;
    document.getElementById('lblFormulaIntro').textContent = langObj.formulaIntro;
    document.getElementById('lblFormulaStep1Title').textContent = langObj.formulaStep1Title;
    document.getElementById('lblFormulaStep2Title').textContent = langObj.formulaStep2Title;
    document.getElementById('formulaSunsetVar').textContent = langObj.formulaSunsetVar;
    document.getElementById('lblFormulaExample').textContent = langObj.formulaExample;
    document.getElementById('lblFormulaAssumption').textContent = langObj.formulaAssumption;
    document.getElementById('lblExampleLeave').textContent = langObj.exampleLeave;
    document.getElementById('lblExampleWake').textContent = langObj.exampleWake;
    document.getElementById('lblFormulaTimeline').textContent = langObj.formulaTimeline;
    document.getElementById('lblReverseWake').textContent = langObj.reverseWake;
    document.getElementById('lblReverseLeave').textContent = langObj.reverseLeave;
    document.getElementById('lblReverseSunrise').textContent = langObj.reverseSunrise;
    document.getElementById('lblFormulaWhy').textContent = langObj.formulaWhy;
    document.getElementById('lblFormulaWhyLeave').innerHTML = '<i class="fa-solid fa-car"></i> ' + langObj.formulaWhyLeave;
    document.getElementById('lblFormulaWhyWake').innerHTML = '<i class="fa-solid fa-mug-hot"></i> ' + langObj.formulaWhyWake;
    document.getElementById('lblFormulaCta').textContent = langObj.formulaCta;
    // Formula page dynamic text
    document.getElementById('formulaStep1Time').textContent = langObj.formulaStep1Time;
    document.getElementById('formulaStep1Result').textContent = langObj.formulaStep1Result;
    document.getElementById('formulaStep2Start').textContent = langObj.formulaStep2Start;
    document.getElementById('formulaStep2Time').textContent = langObj.formulaStep2Time;
    document.getElementById('formulaStep2Result').textContent = langObj.formulaStep2Result;
    document.getElementById('exampleLeaveStart').textContent = langObj.exampleLeaveStart;
    document.getElementById('exampleLeaveTime').textContent = langObj.exampleLeaveTime;
    document.getElementById('exampleLeaveResult').textContent = langObj.exampleLeaveResult;
    document.getElementById('exampleWakeStart').textContent = langObj.exampleWakeStart;
    document.getElementById('exampleWakeTime').textContent = langObj.exampleWakeTime;
    document.getElementById('exampleWakeResult').textContent = langObj.exampleWakeResult;
    document.getElementById('reverseTimelineWake').textContent = langObj.reverseTimelineWake;
    document.getElementById('reverseTimelineLeave').textContent = langObj.reverseTimelineLeave;
    document.getElementById('reverseTimelineSunrise').textContent = langObj.reverseTimelineSunrise;
    document.getElementById('citySearch').placeholder = langObj.placeholderSearch;

    window.renderLocationDates();
    window.renderActionsChecklist();

    if (S.currentLocation && S.weatherCache) {
      window.displayResults(S.currentLocation, S.weatherCache.rawSunrise, S.weatherCache.temp);
    }
  };

  // ----- Initialization -----
  function initApp() {
    const savedLang = window.getConfig('language') || 'auto';
    window.initializeActionsChecklist();
    window.setLanguage(savedLang);
    window.setTheme(window.getConfig('theme') || 'auto');
    window.setCalendar(window.getConfig('calendar') || 'jalali');
    window.initCitySearch();

    const savedLoc = window.getConfig('location');
    const savedSunrise = window.getConfig('cached_sunrise');
    const savedTemp = window.getConfig('cached_temp');

    if (savedLoc && savedSunrise) {
      window.displayResults(savedLoc, savedSunrise, savedTemp || 22);
      if (S.isOnline) window.executeSunriseUpdate(savedLoc.lat, savedLoc.lon, savedLoc.name).catch(() => { });
    } else {
      const defaultLocation = { lat: 35.6892, lon: 51.3890, name: savedLang === 'fa' ? "تهران" : "Tehran", timezone: "Asia/Tehran" };
      const mockupDate = new Date();
      mockupDate.setDate(mockupDate.getDate() + 1);
      mockupDate.setHours(5, 45, 0, 0);
      window.displayResults(defaultLocation, mockupDate.toISOString(), 24);
    }

    window.handleConnectivityChange();
  }

  // ----- WebView Detection & External Link Handling -----
  function isWebView() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    // Check for common WebView indicators
    return /wv/.test(ua) || /WebView/.test(ua) || /Android.*Version\/[\d.]+ Chrome\/[\d.]+ Mobile Safari/.test(ua) || /iPhone.*Version\/[\d.]+.*Mobile/.test(ua);
  }

  // Intercept all external links to open in browser when in WebView
  if (isWebView()) {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      // Only intercept external links (http/https)
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        e.preventDefault();
        // Use Intent or window.open to open in external browser
        if (typeof Android !== 'undefined' && Android.openExternalLink) {
          Android.openExternalLink(href);
        } else {
          window.open(href, '_system');
        }
      }
    });
  }

  // ----- Navigation Mode Detection (via Android Interface) -----
  function detectNavigationMode() {
    document.body.classList.remove('button-nav', 'gesture-nav');
    let mode = 'gesture'; // پیش‌فرض: gesture navigation
    
    // دریافت حالت navigation از Android Interface
    if (typeof Android !== 'undefined' && Android.getNavigationMode) {
      mode = Android.getNavigationMode();
    }
    
    document.body.classList.add(mode + '-nav');
  }
  detectNavigationMode();

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
