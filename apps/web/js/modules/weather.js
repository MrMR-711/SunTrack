/* ===== modules/weather.js: Fetch Solar/Weather Data, Display Results, Countdown ===== */
'use strict';

(function() {
  const S = window.AppState;

  async function fetchSolarAndWeather(lat, lon) {
    if (!S.isOnline) throw new Error('OFFLINE');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=sunrise&current_weather=true&timezone=auto&forecast_days=3`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('API_ERR');
    const parsed = await resp.json();
    const wakeLeadMs = 55 * 60 * 1000;
    const sunriseEpochInLocation = (sunrise) => {
      const [date, time] = sunrise.split('T');
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      const utcOffsetMs = (parsed.utc_offset_seconds || 0) * 1000;
      const epoch = Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMs;
      console.log('Parsing sunrise:', sunrise, '| UTC offset (hours):', parsed.utc_offset_seconds / 3600, '| Epoch:', epoch, '| As UTC:', new Date(epoch).toISOString());
      return epoch;
    };
    const sunriseEpochMs = (() => {
      const now = Date.now();
      for (const sunrise of parsed.daily.sunrise) {
        const epoch = sunriseEpochInLocation(sunrise);
        // Use this sunrise if wake time (55 min before sunrise) is still in the future
        if (epoch - wakeLeadMs > now) {
          console.log('Selected sunrise:', sunrise, '-> epoch:', epoch, '-> date:', new Date(epoch).toISOString());
          return epoch;
        }
      }
      // Fallback: use tomorrow's sunrise
      const fallback = parsed.daily.sunrise[1] ?? parsed.daily.sunrise[0];
      const fallbackEpoch = sunriseEpochInLocation(fallback);
      console.log('Fallback sunrise:', fallback, '-> epoch:', fallbackEpoch);
      return fallbackEpoch;
    })();
    const temperature = parsed.current_weather.temperature;
    return { sunriseEpochMs, temperature, timezone: parsed.timezone };
  }

  function processChronology(sunriseEpochMs) {
    const sunriseDate = new Date(sunriseEpochMs);
    const departureDate = new Date(sunriseDate.getTime() - 30 * 60 * 1000);
    const wakeDate = new Date(departureDate.getTime() - 25 * 60 * 1000);
    const tz = S.currentLocation?.timezone || 'UTC';
    const formatOptions = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz };
    const displayLocale = S.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    return {
      wakeStr: wakeDate.toLocaleTimeString(displayLocale, formatOptions),
      leaveStr: departureDate.toLocaleTimeString(displayLocale, formatOptions),
      wakeDate, departureDate, sunriseDate
    };
  }

  function renderLocationDates() {
    const calendar = window.getConfig('calendar') || 'jalali';
    const tz = (S.currentLocation && S.currentLocation.timezone) || 'Asia/Tehran';
    const locale = S.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    const options = { timeZone: tz, dateStyle: 'full', calendar: calendar === 'jalali' ? 'persian' : 'gregory' };
    const now = new Date();
    try {
      document.getElementById('todayDate').textContent = new Intl.DateTimeFormat(locale, options).format(now);
      document.getElementById('tomorrowDate').textContent = new Intl.DateTimeFormat(locale, options).format(new Date(now.getTime() + 86400000));
    } catch (e) {
      document.getElementById('todayDate').textContent = '—';
      document.getElementById('tomorrowDate').textContent = '—';
    }
  }

  function commenceCountdown(wakeDate) {
    if (S.countdownInterval) clearInterval(S.countdownInterval);
    const elTimerContainer = document.getElementById('timerContainer');
    const elCountdown = document.getElementById('countdown');
    const elTimerLabel = document.getElementById('lblCountdown');
    const elHomeCountdown = document.getElementById('homeCountdown');
    const elHomeCountdownLabel = document.getElementById('lblHomeCountdown');
    function run() {
      const now = new Date();
      const distance = wakeDate.getTime() - now.getTime();
      if (distance <= 0) {
        clearInterval(S.countdownInterval);
        // Check if we're offline and using stale cached data (more than 24h old)
        const cachedSunrise = S.weatherCache?.rawSunrise;
        const isStaleCache = !S.isOnline && cachedSunrise && (now - cachedSunrise > 24 * 60 * 60 * 1000);
        if (isStaleCache) {
          // Show offline message instead of hiding
          const offlineMsg = S.currentLanguage === 'fa'
            ? 'لطفاً به اینترنت متصل شوید تا زمان طلوع جدید بارگیری شود'
            : 'Please connect to the internet to reload sunrise time';
          elTimerContainer.style.display = 'flex';
          elTimerLabel.textContent = S.currentLanguage === 'fa' ? '️ نیاز به اتصال اینترنت' : '⚠️ Internet connection needed';
          elCountdown.textContent = offlineMsg;
          elCountdown.style.fontSize = '13px';
          elHomeCountdown.textContent = offlineMsg;
          elHomeCountdown.style.fontSize = '13px';
          if (elHomeCountdownLabel) elHomeCountdownLabel.textContent = '';
          return;
        }
        // Normal case: wake time has passed today
        elTimerContainer.style.display = 'none';
        elHomeCountdown.textContent = '--:--:--';
        elHomeCountdown.style.fontSize = '';
        if (elHomeCountdownLabel) elHomeCountdownLabel.textContent = S.currentLanguage === 'fa' ? 'مانده تا بیداری' : 'Until Wake-up';
        return;
      }
      elTimerContainer.style.display = 'flex';
      elCountdown.style.fontSize = '';
      elHomeCountdown.style.fontSize = '';
      if (elHomeCountdownLabel) elHomeCountdownLabel.textContent = S.currentLanguage === 'fa' ? 'مانده تا بیداری' : 'Until Wake-up';
      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      if (S.currentLanguage === 'fa') {
        const fa = v => Number(v).toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false });
        elCountdown.textContent = `${fa(hours)}:${fa(minutes)}:${fa(seconds)}`;
        elHomeCountdown.textContent = elCountdown.textContent;
      } else {
        const out = `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
        elCountdown.textContent = out;
        elHomeCountdown.textContent = out;
      }
    }
    run();
    S.countdownInterval = setInterval(run, 1000);
  }

  function displayResults(loc, sunriseEpochMs, currentTemp) {
    S.currentLocation = loc;
    S.weatherCache = { rawSunrise: sunriseEpochMs, temp: currentTemp };
    renderLocationDates();
    window.saveConfig('location', loc);
    window.saveConfig('cached_sunrise', sunriseEpochMs);
    window.saveConfig('cached_temp', currentTemp);
    // Save location history
    if (loc && loc.name) {
      const previous = window.getConfig('location_history') || [];
      const unique = previous.filter(item => !(Number(item.lat) === Number(loc.lat) && Number(item.lon) === Number(loc.lon)));
      unique.unshift({ lat: loc.lat, lon: loc.lon, name: loc.name, timezone: loc.timezone || null });
      window.saveConfig('location_history', unique.slice(0, 6));
    }
    const chronology = processChronology(sunriseEpochMs);
    document.getElementById('wakeTime').textContent = chronology.wakeStr;
    document.getElementById('leaveTime').textContent = chronology.leaveStr;
    const displayLocale = S.currentLanguage === 'fa' ? 'fa-IR' : 'en-US';
    const tz = loc.timezone || 'UTC';
    const sunriseDisplay = chronology.sunriseDate.toLocaleTimeString(displayLocale, { hour:'2-digit', minute:'2-digit', hour12:false, timeZone: tz });
    document.getElementById('sunriseTime').textContent = sunriseDisplay;
    document.getElementById('homeSunriseTime').textContent = sunriseDisplay;
    const formattedTemp = S.currentLanguage === 'fa' ? currentTemp.toLocaleString('fa-IR') : currentTemp;
    document.getElementById('weatherDisplay').innerHTML = `${formattedTemp}°C`;
    const elTempWarning = document.getElementById('tempWarning');
    if (currentTemp > 26) {
      elTempWarning.style.display = 'flex';
      elTempWarning.textContent = window.i18n[S.currentLanguage].weatherHotWarning.replace('%TEMP%', formattedTemp);
    } else { elTempWarning.style.display = 'none'; }
    commenceCountdown(chronology.wakeDate);
    document.getElementById('locationDisplay').textContent = loc.name;
    document.getElementById('locationValue').textContent = loc.name;
    document.getElementById('locationDisplayContainer').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'flex';
  }

  window.executeSunriseUpdate = async function(lat, lon, cityName) {
    document.getElementById('loadingOverlay').classList.add('active');
    if (!S.isOnline) {
      const savedLoc = window.getConfig('location');
      const cachedSunrise = window.getConfig('cached_sunrise');
      const cachedTemp = window.getConfig('cached_temp');
      if (savedLoc && cachedSunrise) {
        displayResults(savedLoc, Number(cachedSunrise), cachedTemp || 20);
        window.showToast(window.i18n[S.currentLanguage].fallbackCachedShow, 3500, 'info');
      } else { window.showToast(window.i18n[S.currentLanguage].errNoInternet); }
      document.getElementById('loadingOverlay').classList.remove('active');
      return;
    }
    try {
      const result = await fetchSolarAndWeather(lat, lon);
      displayResults({ lat, lon, name: cityName, timezone: result.timezone }, result.sunriseEpochMs, result.temperature);
    } catch (e) {
      window.showToast(window.i18n[S.currentLanguage].errFetchFailed);
      const cachedSunrise = window.getConfig('cached_sunrise');
      const cachedTemp = window.getConfig('cached_temp');
      if (cachedSunrise) displayResults({ lat, lon, name: cityName }, Number(cachedSunrise), cachedTemp || 20);
    } finally {
      document.getElementById('loadingOverlay').classList.remove('active');
    }
  };

  window.displayResults = displayResults;
  window.renderLocationDates = renderLocationDates;

})();
