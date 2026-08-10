/* ===== modules/location.js: City Search, GPS, Location History ===== */
'use strict';

(function() {
  const S = window.AppState;

  window.toggleLocationEditor = function() {
    document.querySelector('.location-settings-item').classList.toggle('open');
  };

  function saveLocationHistory(loc) {
    if (!loc || !loc.name) return;
    const previous = window.getConfig('location_history') || [];
    const unique = previous.filter(item => !(Number(item.lat) === Number(loc.lat) && Number(item.lon) === Number(loc.lon)));
    unique.unshift({ lat: loc.lat, lon: loc.lon, name: loc.name, timezone: loc.timezone || null });
    window.saveConfig('location_history', unique.slice(0, 6));
  }

  function selectCityFromResult(lat, lon, name) {
    document.querySelector('.location-settings-item')?.classList.remove('open');
    const elCitySearch = document.getElementById('citySearch');
    const elClearSearchBtn = document.getElementById('clearSearchBtn');
    const elSearchResults = document.getElementById('searchResults');
    elCitySearch.value = name;
    elClearSearchBtn.classList.add('visible');
    elSearchResults.classList.remove('show');
    window.executeSunriseUpdate(lat, lon, name);
  }

  function showSearchHistory() {
    const history = window.getConfig('location_history') || [];
    const elSearchResults = document.getElementById('searchResults');
    if (!history.length) { elSearchResults.classList.remove('show'); return; }
    const lang = window.i18n[S.currentLanguage];
    const heading = `<div class="search-result-item" style="cursor: default;"><span class="city-sub">${lang.searchHistory}</span></div>`;
    const rows = history.map(item => `<div class="search-result-item" data-history="true" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${item.name}"><span class="city-name">${item.name}</span></div>`).join('');
    elSearchResults.innerHTML = heading + rows;
    elSearchResults.classList.add('show');
    document.querySelectorAll('.search-result-item[data-history="true"]').forEach(elem => {
      elem.addEventListener('click', function() { selectCityFromResult(parseFloat(this.dataset.lat), parseFloat(this.dataset.lon), this.dataset.name); });
    });
  }

  // ----- City Search Engine (Nominatim) -----
  let debounceTimeout = null;
  function initCitySearch() {
    const elCitySearch = document.getElementById('citySearch');
    const elClearSearchBtn = document.getElementById('clearSearchBtn');
    const elSearchResults = document.getElementById('searchResults');

    elCitySearch.addEventListener('input', function() {
      clearTimeout(debounceTimeout);
      const query = this.value.trim();
      elClearSearchBtn.classList.toggle('visible', query.length > 0);
      if (query.length === 0) { showSearchHistory(); return; }
      if (query.length < 3) { elSearchResults.classList.remove('show'); return; }
      debounceTimeout = setTimeout(async () => {
        if (!S.isOnline) { window.showToast(window.i18n[S.currentLanguage].errNoInternet); return; }
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&accept-language=${S.currentLanguage}`);
          if (!response.ok) return;
          const matches = await response.json();
          if (!matches.length) {
            elSearchResults.innerHTML = `<div class="search-result-item"><span class="city-name">${window.i18n[S.currentLanguage].cityNotFound}</span></div>`;
            elSearchResults.classList.add('show'); return;
          }
          elSearchResults.innerHTML = matches.map(item => {
            const name = item.display_name.split(',')[0];
            const context = item.display_name;
            return `<div class="search-result-item" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${name}"><span class="city-name">${name}</span><span class="city-sub">${context}</span></div>`;
          }).join('');
          elSearchResults.classList.add('show');
          document.querySelectorAll('.search-result-item').forEach(elem => {
            elem.addEventListener('click', function() {
              selectCityFromResult(parseFloat(this.dataset.lat), parseFloat(this.dataset.lon), this.dataset.name);
            });
          });
        } catch (e) { }
      }, 500);
    });

    elClearSearchBtn.addEventListener('click', function() {
      elCitySearch.value = '';
      elClearSearchBtn.classList.remove('visible');
      elCitySearch.focus();
      showSearchHistory();
    });

    elCitySearch.addEventListener('focus', function() { if (!this.value.trim()) showSearchHistory(); });
    document.addEventListener('click', function(e) { if (!e.target.closest('.search-wrapper')) elSearchResults.classList.remove('show'); });

    // GPS button
    document.getElementById('gpsBtn').addEventListener('click', function() {
      document.querySelector('.location-settings-item')?.classList.remove('open');
      if (!navigator.geolocation) { window.showToast(window.i18n[S.currentLanguage].errGpsUnsupported); return; }
      document.getElementById('loadingOverlay').classList.add('active');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude, lon = pos.coords.longitude;
          let displayCity = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
          if (S.isOnline) {
            try {
              const geoResp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${S.currentLanguage}`);
              if (geoResp.ok) { const geoData = await geoResp.json(); if (geoData.address) displayCity = geoData.address.city || geoData.address.town || geoData.address.state || displayCity; }
            } catch (e) { }
          }
          await window.executeSunriseUpdate(lat, lon, displayCity);
        },
        (err) => { document.getElementById('loadingOverlay').classList.remove('active'); window.showToast(window.i18n[S.currentLanguage].errGpsDenied); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

    // Clear location
    document.getElementById('clearLocationBtn').addEventListener('click', function() {
      S.currentLocation = null; S.weatherCache = null;
      localStorage.removeItem('sunrisetracker_location');
      localStorage.removeItem('sunrisetracker_cached_sunrise');
      localStorage.removeItem('sunrisetracker_cached_temp');
      document.getElementById('locationDisplayContainer').style.display = 'none';
      document.getElementById('locationValue').textContent = window.i18n[S.currentLanguage].locationNotSelected;
      document.getElementById('resultsSection').style.display = 'none';
      if (S.countdownInterval) { clearInterval(S.countdownInterval); }
      elCitySearch.value = '';
      elClearSearchBtn.classList.remove('visible');
    });
  }

  window.initCitySearch = initCitySearch;

})();
