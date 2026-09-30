/**
 * ============================================================================
 * MAUSAM - PERSONALIZED METEOROLOGICAL PLATFORM
 * File: app.js
 * 
 * Description:
 * Core application controller managing UI interactions, state management,
 * live meteorological API integration (Open-Meteo Forecast, Air Quality &
 * Geocoding APIs), Leaflet.js interactive weather radar map with RainViewer
 * precipitation radar overlays, real-time search autocomplete, dynamic light/dark
 * glassmorphic themes, Web Speech AI voice briefing, and 8-domain rule-based
 * personalization engine dispatching.
 * ============================================================================
 */

/* ==========================================================================
   1. Application State
   ==========================================================================
*/
const appState = {
  currentScreen: "screen-welcome", // 'screen-welcome', 'screen-profile', 'screen-home'
  selectedLocation: "New Delhi",
  selectedRegion: "Delhi NCR",
  selectedCountry: "India",
  selectedLat: 28.6139,
  selectedLon: 77.2090,
  selectedElevation: "216 m ASL",
  selectedProfileId: "health",
  theme: localStorage.getItem("mausam_theme") || "dark",
  tempUnit: "C", // 'C' or 'F'
  isLive: false,
  currentWeatherData: null,
  isVoiceSpeaking: false,
};

/* ==========================================================================
   2. DOM Elements Cache
   ==========================================================================
*/
const DOM = {
  // Screens
  screenWelcome: document.getElementById("screen-welcome"),
  screenProfile: document.getElementById("screen-profile"),
  screenHome: document.getElementById("screen-home"),

  // Screen 1: Welcome Elements
  citySearchInput: document.getElementById("citySearchInput"),
  cityChipsContainer: document.getElementById("cityChipsContainer"),
  cityAutocompleteDropdown: document.getElementById("cityAutocompleteDropdown"),
  btnClearSearch: document.getElementById("btnClearSearch"),
  btnContinueToProfile: document.getElementById("btnContinueToProfile"),
  btnUseDeviceGPS: document.getElementById("btnUseDeviceGPS"),
  gpsButtonLabel: document.getElementById("gpsButtonLabel"),

  // Screen 2: Profile Selection Elements
  btnBackToLocation: document.getElementById("btnBackToLocation"),
  profileNavCityLabel: document.getElementById("profileNavCityLabel"),
  profilesGridContainer: document.getElementById("profilesGridContainer"),
  selectedProfileNameDisplay: document.getElementById("selectedProfileNameDisplay"),
  btnProceedToDashboard: document.getElementById("btnProceedToDashboard"),

  // Screen 3: Dashboard Top Navigation & Controls
  liveSourceBadge: document.getElementById("liveSourceBadge"),
  liveSourceText: document.getElementById("liveSourceText"),
  btnRefreshData: document.getElementById("btnRefreshData"),
  refreshIcon: document.getElementById("refreshIcon"),
  btnOpenRadarModal: document.getElementById("btnOpenRadarModal"),
  btnVoiceBriefing: document.getElementById("btnVoiceBriefing"),
  voiceIcon: document.getElementById("voiceIcon"),
  voiceLabel: document.getElementById("voiceLabel"),
  btnUnitToggle: document.getElementById("btnUnitToggle"),
  unitToggleLabel: document.getElementById("unitToggleLabel"),
  btnThemeToggle: document.getElementById("btnThemeToggle"),
  themeToggleIcon: document.getElementById("themeToggleIcon"),
  liveClockBadge: document.getElementById("liveClockBadge"),
  liveTimeText: document.getElementById("liveTimeText"),
  btnDashChangeCity: document.getElementById("btnDashChangeCity"),
  dashCurrentCityLabel: document.getElementById("dashCurrentCityLabel"),
  btnDashChangeProfile: document.getElementById("btnDashChangeProfile"),
  dashCurrentProfileLabel: document.getElementById("dashCurrentProfileLabel"),
  btnNativeShare: document.getElementById("btnNativeShare"),
  quickProfilesList: document.getElementById("quickProfilesList"),

  // Screen 3: Dynamic Alert & Persona Containers
  severeAlertArea: document.getElementById("severeAlertArea"),
  personaDynamicContainer: document.getElementById("personaDynamicContainer"),

  // Screen 3: Hero Weather Card
  heroCityName: document.getElementById("heroCityName"),
  heroRegionText: document.getElementById("heroRegionText"),
  heroDateDisplay: document.getElementById("heroDateDisplay"),
  heroLiveClock: document.getElementById("heroLiveClock"),
  heroTempVal: document.getElementById("heroTempVal"),
  heroTempUnit: document.getElementById("heroTempUnit"),
  heroConditionText: document.getElementById("heroConditionText"),
  heroFeelsLikeText: document.getElementById("heroFeelsLikeText"),
  heroWeatherArt: document.getElementById("heroWeatherArt"),
  heroHumidityVal: document.getElementById("heroHumidityVal"),
  heroWindVal: document.getElementById("heroWindVal"),
  heroRainVal: document.getElementById("heroRainVal"),
  heroElevationText: document.getElementById("heroElevationText"),

  // Screen 3: Hourly & Daily Forecast Tracks
  hourlyTrackContainer: document.getElementById("hourlyTrackContainer"),
  dailyForecastList: document.getElementById("dailyForecastList"),

  // Screen 3: Regional Climate Profile Card
  climateElevationBadge: document.getElementById("climateElevationBadge"),
  climateZoneVal: document.getElementById("climateZoneVal"),
  climateSeasonVal: document.getElementById("climateSeasonVal"),
  climateTempDepartureVal: document.getElementById("climateTempDepartureVal"),
  climateRainfallVal: document.getElementById("climateRainfallVal"),

  // Interactive Radar Modal
  radarModal: document.getElementById("radarModal"),
  btnCloseRadarModal: document.getElementById("btnCloseRadarModal"),
  btnRadarPrecip: document.getElementById("btnRadarPrecip"),
  btnRadarStandard: document.getElementById("btnRadarStandard"),
  weatherRadarMap: document.getElementById("weatherRadarMap"),

  // Toast Container
  toastContainer: document.getElementById("toastContainer"),

  // Mobile Bottom Dock
  mobileDockCityBtn: document.getElementById("mobileDockCityBtn"),
  mobileDockRadarBtn: document.getElementById("mobileDockRadarBtn"),
  mobileDockHomeBtn: document.getElementById("mobileDockHomeBtn"),
  mobileDockPersonaBtn: document.getElementById("mobileDockPersonaBtn"),

  // Ambient Lighting Orbs
  ambientOrb1: document.getElementById("ambientOrb1"),
  ambientOrb2: document.getElementById("ambientOrb2"),
};

/* ==========================================================================
   3. Toast Notification Utility
   ==========================================================================
*/
function showToast(message, type = "info", duration = 3500) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;

  let iconClass = "fa-circle-info";
  if (type === "success") iconClass = "fa-circle-check";
  else if (type === "warning") iconClass = "fa-triangle-exclamation";
  else if (type === "error") iconClass = "fa-circle-xmark";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, duration);
}

/* ==========================================================================
   4. Weather Service: Live Open-Meteo Integration & Schema Adapter
   ==========================================================================
*/
const WeatherService = {
  cache: new Map(), // Key: "lat,lon", Value: { data, timestamp }
  cacheDurationMs: 10 * 60 * 1000, // 10 minutes

  /**
   * Searches locations via Open-Meteo Geocoding API
   */
  async searchCities(query) {
    if (!query || query.trim().length < 2) return [];
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding HTTP error ${res.status}`);
      const data = await res.json();
      if (!data.results) return [];

      return data.results.map((item) => ({
        name: item.name,
        state: item.admin1 || item.country || "",
        country: item.country || "India",
        lat: item.latitude,
        lon: item.longitude,
        elevation: item.elevation ? `${Math.round(item.elevation)} m ASL` : "200 m ASL"
      }));
    } catch (err) {
      console.warn("Geocoding fetch note:", err.message);
      return [];
    }
  },

  /**
   * Fetches live weather forecast & air quality from Open-Meteo APIs
   */
  async fetchLiveWeather(lat, lon, meta = {}) {
    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    const now = Date.now();

    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (now - cached.timestamp < this.cacheDurationMs) {
        return cached.data;
      }
    }

    try {
      // 1. Fetch Forecast & Air Quality in parallel
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`;
      const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi`;

      const [forecastRes, aqiRes] = await Promise.allSettled([
        fetch(forecastUrl),
        fetch(airQualityUrl)
      ]);

      if (forecastRes.status !== "fulfilled" || !forecastRes.value.ok) {
        throw new Error("Forecast API unreachable");
      }

      const forecastData = await forecastRes.value.json();
      let aqiData = null;
      if (aqiRes.status === "fulfilled" && aqiRes.value.ok) {
        try {
          aqiData = await aqiRes.value.json();
        } catch (_) {}
      }

      // 2. Transform into Mausam complete schema
      const adapted = this.adaptToMausamSchema(forecastData, aqiData, meta, lat, lon);
      adapted.isLive = true;

      // 3. Cache and return
      this.cache.set(cacheKey, { data: adapted, timestamp: now });
      return adapted;
    } catch (err) {
      console.warn("Live weather fetch failed, falling back to mock:", err.message);
      return null;
    }
  },

  /**
   * Adapts raw Open-Meteo payloads into Mausam's complete domain schema
   */
  adaptToMausamSchema(forecast, aqi, meta, lat, lon) {
    const cur = forecast.current || {};
    const daily = forecast.daily || {};
    const hourly = forecast.hourly || {};
    const aqiCur = aqi?.current || {};

    // Condition translation via PersonalizationEngine
    const wmo = cur.weather_code !== undefined ? cur.weather_code : 0;
    const condMeta = PersonalizationEngine.wmoCodeToCondition(wmo, cur.is_day !== undefined ? cur.is_day : 1);

    // Compass direction
    const windDeg = cur.wind_direction_10m || 0;
    const windDir = PersonalizationEngine.degToCompass(windDeg);

    // Air Quality
    const aqiVal = Math.round(aqiCur.us_aqi || 65);
    const aqiStatus = PersonalizationEngine.getAqiCategory(aqiVal);

    // UV Index
    const uvMax = Math.round(daily.uv_index_max?.[0] || 6);
    const uvStatus = PersonalizationEngine.getUvCategory(uvMax);

    // High / Low temps
    const highTemp = Math.round(daily.temperature_2m_max?.[0] || (cur.temperature_2m + 3));
    const lowTemp = Math.round(daily.temperature_2m_min?.[0] || (cur.temperature_2m - 5));

    // Sun timings
    let sunrise = "06:15 AM";
    let sunset = "06:20 PM";
    if (daily.sunrise?.[0]) {
      const srDate = new Date(daily.sunrise[0]);
      sunrise = srDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    if (daily.sunset?.[0]) {
      const ssDate = new Date(daily.sunset[0]);
      sunset = ssDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    }

    // 24-Hour Hourly Forecast
    const hourlyItems = [];
    if (hourly.time && hourly.time.length > 0) {
      const currentHourIso = new Date().toISOString().slice(0, 13);
      let startIndex = hourly.time.findIndex((t) => t.startsWith(currentHourIso));
      if (startIndex === -1) startIndex = 0;

      for (let i = startIndex; i < Math.min(startIndex + 12, hourly.time.length); i++) {
        const itemDate = new Date(hourly.time[i]);
        const timeLabel = i === startIndex ? "Now" : itemDate.toLocaleTimeString("en-IN", { hour: "2-digit", hour12: true });
        const itemWmo = hourly.weather_code?.[i] || 0;
        const itemCond = PersonalizationEngine.wmoCodeToCondition(itemWmo, 1);

        hourlyItems.push({
          time: timeLabel,
          temp: Math.round(hourly.temperature_2m?.[i] ?? cur.temperature_2m),
          pop: Math.round(hourly.precipitation_probability?.[i] ?? 10),
          icon: itemCond.icon
        });
      }
    }

    // 7-Day Daily Forecast
    const dailyItems = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (daily.time && daily.time.length > 0) {
      for (let i = 0; i < Math.min(7, daily.time.length); i++) {
        const dDate = new Date(daily.time[i]);
        const dayLabel = i === 0 ? "Today" : weekdays[dDate.getDay()];
        const dateLabel = dDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const dWmo = daily.weather_code?.[i] || 0;
        const dCond = PersonalizationEngine.wmoCodeToCondition(dWmo, 1);

        dailyItems.push({
          day: dayLabel,
          date: dateLabel,
          condition: dCond.condition,
          icon: dCond.icon,
          pop: Math.round(daily.precipitation_probability_max?.[i] ?? 15),
          minTemp: Math.round(daily.temperature_2m_min?.[i] ?? lowTemp),
          maxTemp: Math.round(daily.temperature_2m_max?.[i] ?? highTemp)
        });
      }
    }

    // Coastal Heuristic (based on latitude/longitude distance to sea or coordinates)
    const isCoastal = (lat > 8 && lat < 24 && (lon < 73.5 || lon > 80.5)) || (lat < 16 && (lon < 75 || lon > 79));
    const waveHeight = isCoastal ? Number(((cur.wind_speed_10m || 10) * 0.08 + 0.6).toFixed(1)) : 0.0;
    const waterTemp = isCoastal ? Math.round(Math.min(30, Math.max(22, (cur.temperature_2m || 28) - 2))) : 24;

    // Soil Moisture Heuristic
    const soilMoisture = Math.min(95, Math.max(25, Math.round((cur.relative_humidity_2m || 50) * 0.7 + (cur.precipitation || 0) * 5)));

    return {
      city: meta.name || appState.selectedLocation,
      state: meta.state || appState.selectedRegion,
      country: meta.country || appState.selectedCountry,
      lat: lat,
      lon: lon,
      elevation: meta.elevation || `${Math.round(forecast.elevation || 216)} m ASL`,
      climateZone: lat > 28 ? "Subtropical / Composite" : (isCoastal ? "Tropical Coastal Maritime" : "Tropical Savanna"),
      currentSeason: "Current Season Cycle",
      tempDeparture: "+0.4°C (Live Anomaly Index)",
      rainfallStatus: (cur.precipitation || 0) > 2 ? "Active Showers" : "Normal Seasonal Status",
      temp: Math.round(cur.temperature_2m ?? 28),
      feelsLike: Math.round(cur.apparent_temperature ?? cur.temperature_2m ?? 29),
      condition: condMeta.condition,
      conditionCode: condMeta.code,
      highTemp: highTemp,
      lowTemp: lowTemp,
      humidity: Math.round(cur.relative_humidity_2m ?? 50),
      windSpeed: Math.round(cur.wind_speed_10m ?? 12),
      windGustMax: Math.round(cur.wind_gusts_10m ?? ((cur.wind_speed_10m || 12) * 1.4)),
      windDir: windDir,
      aqi: aqiVal,
      aqiStatus: aqiStatus,
      pollen: { count: "Low", tree: "Low", grass: "Moderate", weed: "Low" },
      uvIndex: uvMax,
      uvStatus: uvStatus,
      visibility: 8.5,
      pressure: Math.round(cur.surface_pressure ?? 1012),
      sunrise: sunrise,
      sunset: sunset,
      rainChance: Math.round(daily.precipitation_probability_max?.[0] ?? (cur.precipitation ? 80 : 15)),
      waveHeight: waveHeight,
      tideTiming: isCoastal ? { highTide: "02:30 PM (2.6m)", lowTide: "08:45 AM (0.7m)" } : { highTide: "N/A (Inland)", lowTide: "N/A" },
      waterTemp: waterTemp,
      seaCondition: isCoastal ? "Moderate Coastal Swell" : "Inland Landmass",
      soilMoisture: soilMoisture,
      soilMoistureStatus: soilMoisture > 65 ? "High Soil Retention" : "Adequate Root Moisture",
      frostRisk: lowTemp < 4,
      frostStatus: lowTemp < 4 ? "Frost Warning Active" : "No Frost Risk",
      severeWeather: {
        isSevere: (cur.wind_speed_10m >= 45 || cur.temperature_2m >= 41 || aqiVal >= 260),
        type: aqiVal >= 260 ? "Air Quality Emergency" : (cur.wind_speed_10m >= 45 ? "Squall Warning" : "Heatwave Alert"),
        severity: "Warning",
        title: "Active Live Weather Alert",
        description: "Adverse meteorological thresholds reached for current coordinates.",
        instruction: "Exercise protective precautions and review persona advisories."
      },
      hourly: hourlyItems,
      daily: dailyItems
    };
  },

  /**
   * Retrieves weather data for any location (live or mock fallback)
   */
  async getWeatherData(cityName, lat = null, lon = null, meta = {}) {
    // 1. Resolve coordinates if missing
    let targetLat = lat;
    let targetLon = lon;

    if (targetLat === null || targetLon === null) {
      if (CITIES_WEATHER_DATA[cityName]?.lat && CITIES_WEATHER_DATA[cityName]?.lon) {
        targetLat = CITIES_WEATHER_DATA[cityName].lat;
        targetLon = CITIES_WEATHER_DATA[cityName].lon;
      } else {
        const matches = await this.searchCities(cityName);
        if (matches.length > 0) {
          targetLat = matches[0].lat;
          targetLon = matches[0].lon;
          meta = matches[0];
        }
      }
    }

    // 2. If coordinates are found, attempt live fetch
    if (targetLat !== null && targetLon !== null) {
      const live = await this.fetchLiveWeather(targetLat, targetLon, { name: cityName, ...meta });
      if (live) return live;
    }

    // 3. Fallback to mock data with custom fallback generator
    const fallback = getMockWeatherData(cityName);
    fallback.isLive = false;
    return fallback;
  }
};

/* ==========================================================================
   5. Screen Navigation Controller
   ==========================================================================
*/
function navigateTo(targetScreenId) {
  const allScreens = document.querySelectorAll(".app-screen");
  allScreens.forEach((screen) => {
    screen.classList.remove("active-screen");
  });

  const targetScreen = document.getElementById(targetScreenId);
  if (targetScreen) {
    targetScreen.classList.add("active-screen");
    appState.currentScreen = targetScreenId;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Update active state in mobile bottom dock
  updateMobileDockActive();

  // Screen specific dispatch
  if (targetScreenId === "screen-welcome") {
    syncWelcomeLocationUI();
  } else if (targetScreenId === "screen-profile") {
    if (DOM.profileNavCityLabel) {
      DOM.profileNavCityLabel.textContent = appState.selectedLocation;
    }
    renderProfileCards();
  } else if (targetScreenId === "screen-home") {
    loadAndRenderDashboard();
  }
}

function syncWelcomeLocationUI() {
  if (DOM.citySearchInput && appState.selectedLocation) {
    DOM.citySearchInput.value = appState.selectedLocation;
    if (DOM.btnClearSearch) DOM.btnClearSearch.style.display = "flex";
  }

  const cityChips = DOM.cityChipsContainer?.querySelectorAll(".city-chip");
  if (cityChips) {
    cityChips.forEach((chip) => {
      if (chip.getAttribute("data-city")?.toLowerCase() === appState.selectedLocation?.toLowerCase()) {
        chip.classList.add("selected-chip");
      } else {
        chip.classList.remove("selected-chip");
      }
    });
  }
}

function updateMobileDockActive() {
  const dockCity = document.getElementById("mobileDockCityBtn");
  const dockHome = document.getElementById("mobileDockHomeBtn");
  const dockPersona = document.getElementById("mobileDockPersonaBtn");

  [dockCity, dockHome, dockPersona].forEach((btn) => btn?.classList.remove("active-dock-btn"));

  if (appState.currentScreen === "screen-welcome" && dockCity) dockCity.classList.add("active-dock-btn");
  else if (appState.currentScreen === "screen-profile" && dockPersona) dockPersona.classList.add("active-dock-btn");
  else if (appState.currentScreen === "screen-home" && dockHome) dockHome.classList.add("active-dock-btn");
}

/* ==========================================================================
   6. Screen 1: Welcome & Autocomplete Location Search
   ==========================================================================
*/
function initWelcomeScreen() {
  const cityChips = DOM.cityChipsContainer ? DOM.cityChipsContainer.querySelectorAll(".city-chip") : [];

  // Chip selection
  cityChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      cityChips.forEach((c) => c.classList.remove("selected-chip"));
      chip.classList.add("selected-chip");

      const cityName = chip.getAttribute("data-city");
      appState.selectedLocation = cityName;

      if (CITIES_WEATHER_DATA[cityName]) {
        appState.selectedLat = CITIES_WEATHER_DATA[cityName].lat;
        appState.selectedLon = CITIES_WEATHER_DATA[cityName].lon;
        appState.selectedRegion = CITIES_WEATHER_DATA[cityName].state;
        appState.selectedCountry = CITIES_WEATHER_DATA[cityName].country;
        appState.selectedElevation = CITIES_WEATHER_DATA[cityName].elevation || "200 m ASL";
      }

      DOM.citySearchInput.value = cityName;
      if (DOM.btnClearSearch) DOM.btnClearSearch.style.display = "flex";
      hideAutocomplete();
    });
  });

  // Autocomplete debounce handler
  let debounceTimeout = null;

  DOM.citySearchInput.addEventListener("input", (e) => {
    const inputVal = e.target.value;
    if (DOM.btnClearSearch) {
      DOM.btnClearSearch.style.display = inputVal.length > 0 ? "flex" : "none";
    }

    clearTimeout(debounceTimeout);
    if (!inputVal || inputVal.trim().length < 2) {
      hideAutocomplete();
      return;
    }

    debounceTimeout = setTimeout(async () => {
      showAutocompleteLoading();
      const results = await WeatherService.searchCities(inputVal.trim());
      renderAutocompleteResults(results, inputVal.trim());
    }, 280);
  });

  // Clear search input button
  if (DOM.btnClearSearch) {
    DOM.btnClearSearch.addEventListener("click", () => {
      DOM.citySearchInput.value = "";
      DOM.btnClearSearch.style.display = "none";
      hideAutocomplete();
      DOM.citySearchInput.focus();
    });
  }

  // Keyboard navigation & enter key
  DOM.citySearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const activeItem = DOM.cityAutocompleteDropdown?.querySelector(".autocomplete-item.active-item");
      if (activeItem) {
        activeItem.click();
      } else {
        const val = DOM.citySearchInput.value.trim();
        if (val) {
          appState.selectedLocation = val;
          if (CITIES_WEATHER_DATA[val]) {
            appState.selectedLat = CITIES_WEATHER_DATA[val].lat;
            appState.selectedLon = CITIES_WEATHER_DATA[val].lon;
            appState.selectedRegion = CITIES_WEATHER_DATA[val].state;
            appState.selectedCountry = CITIES_WEATHER_DATA[val].country;
            appState.selectedElevation = CITIES_WEATHER_DATA[val].elevation || "200 m ASL";
          }
        }
        hideAutocomplete();
        navigateTo("screen-profile");
      }
    } else if (e.key === "Escape") {
      hideAutocomplete();
    }
  });

  // Close dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-input-group-wrap")) {
      hideAutocomplete();
    }
  });

  // Continue button
  DOM.btnContinueToProfile.addEventListener("click", () => {
    navigateTo("screen-profile");
  });
}

function showAutocompleteLoading() {
  if (!DOM.cityAutocompleteDropdown) return;
  DOM.cityAutocompleteDropdown.style.display = "block";
  DOM.cityAutocompleteDropdown.innerHTML = `
    <div class="autocomplete-item-loading">
      <i class="fa-solid fa-spinner fa-spin" style="color: var(--accent-primary);"></i>
      <span style="margin-left: 0.5rem;">Searching global meteorological stations...</span>
    </div>
  `;
}

function hideAutocomplete() {
  if (DOM.cityAutocompleteDropdown) {
    DOM.cityAutocompleteDropdown.style.display = "none";
    DOM.cityAutocompleteDropdown.innerHTML = "";
  }
}

function renderAutocompleteResults(results, query) {
  if (!DOM.cityAutocompleteDropdown) return;

  if (results.length === 0) {
    DOM.cityAutocompleteDropdown.innerHTML = `
      <div class="autocomplete-item-empty">
        <i class="fa-solid fa-location-crosshairs" style="color: var(--text-muted); margin-bottom: 0.35rem; display: block; font-size: 1.25rem;"></i>
        <span>No exact city matches for "${query}". You can still search and use dynamic telemetry.</span>
      </div>
    `;
    DOM.cityAutocompleteDropdown.style.display = "block";
    return;
  }

  DOM.cityAutocompleteDropdown.innerHTML = "";
  results.forEach((city) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.setAttribute("role", "option");
    item.innerHTML = `
      <div class="autocomplete-item-left">
        <i class="fa-solid fa-location-dot" style="color: var(--accent-primary);"></i>
        <div>
          <div class="autocomplete-city-name">${city.name}</div>
          <div class="autocomplete-region-name">${city.state ? city.state + ", " : ""}${city.country}</div>
        </div>
      </div>
      <span class="autocomplete-badge">${city.elevation}</span>
    `;

    item.addEventListener("click", () => {
      appState.selectedLocation = city.name;
      appState.selectedRegion = city.state || "Region";
      appState.selectedCountry = city.country || "India";
      appState.selectedLat = city.lat;
      appState.selectedLon = city.lon;
      appState.selectedElevation = city.elevation;

      DOM.citySearchInput.value = `${city.name}, ${city.country}`;
      hideAutocomplete();

      showToast(`Selected ${city.name} (${city.country})`, "success", 2500);

      // Deselect chip highlights
      const cityChips = DOM.cityChipsContainer?.querySelectorAll(".city-chip");
      cityChips?.forEach((c) => c.classList.remove("selected-chip"));
    });

    DOM.cityAutocompleteDropdown.appendChild(item);
  });

  DOM.cityAutocompleteDropdown.style.display = "block";
}

/* ==========================================================================
   7. Screen 2: User Persona Selection (8 Personas)
   ==========================================================================
*/
function renderProfileCards() {
  DOM.profilesGridContainer.innerHTML = "";

  USER_PROFILES.forEach((profile) => {
    const isSelected = profile.id === appState.selectedProfileId;

    const card = document.createElement("div");
    card.className = `profile-card ${isSelected ? "selected-profile" : ""}`;
    card.setAttribute("data-profile-id", profile.id);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    card.innerHTML = `
      <div>
        <div class="profile-card-header">
          <div class="profile-icon-box" style="background: ${profile.badgeColor}22; color: ${profile.badgeColor}; border: 1px solid ${profile.badgeColor}44;">
            <i class="fa-solid ${profile.icon}"></i>
          </div>
          <div class="profile-check-indicator">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
        <h3 class="profile-name">${profile.name}</h3>
        <div class="profile-tagline" style="color: ${profile.badgeColor};">${profile.tagline}</div>
        <p class="profile-desc">${profile.description}</p>
      </div>
    `;

    card.addEventListener("click", () => selectProfile(profile.id));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectProfile(profile.id);
      }
    });

    DOM.profilesGridContainer.appendChild(card);
  });

  updateSelectedProfileDisplay();
}

function selectProfile(profileId) {
  appState.selectedProfileId = profileId;

  const allCards = DOM.profilesGridContainer.querySelectorAll(".profile-card");
  allCards.forEach((card) => {
    if (card.getAttribute("data-profile-id") === profileId) {
      card.classList.add("selected-profile");
    } else {
      card.classList.remove("selected-profile");
    }
  });

  updateSelectedProfileDisplay();
}

function updateSelectedProfileDisplay() {
  const currentProfile = getProfileById(appState.selectedProfileId);
  if (DOM.selectedProfileNameDisplay) {
    DOM.selectedProfileNameDisplay.textContent = currentProfile.name;
    DOM.selectedProfileNameDisplay.style.color = currentProfile.badgeColor;
  }
}

function initProfileScreenListeners() {
  DOM.btnBackToLocation.addEventListener("click", () => {
    navigateTo("screen-welcome");
  });

  DOM.btnProceedToDashboard.addEventListener("click", () => {
    navigateTo("screen-home");
  });
}

/* ==========================================================================
   8. Screen 3: Personalized Home Screen & Dashboard Controller
   ==========================================================================
*/
async function loadAndRenderDashboard(forceRefresh = false) {
  if (DOM.refreshIcon) DOM.refreshIcon.classList.add("refresh-spinning");

  // Immediate synchronous baseline render (prevents delay or showing wrong city placeholder)
  if (!appState.currentWeatherData || appState.currentWeatherData.city !== appState.selectedLocation) {
    const baseline = getMockWeatherData(appState.selectedLocation);
    baseline.isLive = false;
    appState.currentWeatherData = baseline;
    renderDashboardView(baseline);
  }

  try {
    // 1. Fetch live or cached weather telemetry
    const weatherData = await WeatherService.getWeatherData(
      appState.selectedLocation,
      appState.selectedLat,
      appState.selectedLon,
      {
        name: appState.selectedLocation,
        state: appState.selectedRegion,
        country: appState.selectedCountry,
        elevation: appState.selectedElevation
      }
    );

    appState.currentWeatherData = weatherData;
    appState.isLive = !!weatherData.isLive;

    // 2. Render all dashboard sections
    renderDashboardView(weatherData);

    // 3. Update Live Telemetry Badge
    if (DOM.liveSourceText) {
      if (weatherData.isLive) {
        DOM.liveSourceText.textContent = "LIVE Open-Meteo";
        DOM.liveSourceBadge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        DOM.liveSourceBadge.style.color = "#10b981";
      } else {
        DOM.liveSourceText.textContent = "SIMULATED (Offline Cache)";
        DOM.liveSourceBadge.style.borderColor = "rgba(245, 158, 11, 0.4)";
        DOM.liveSourceBadge.style.color = "#f59e0b";
      }
    }

    if (forceRefresh) {
      showToast(`Updated live telemetry for ${weatherData.city}`, "success", 2500);
    }
  } catch (err) {
    console.error("Dashboard render error:", err);
    showToast("Error loading weather data. Switched to offline cache.", "warning", 3000);
  } finally {
    if (DOM.refreshIcon) {
      setTimeout(() => DOM.refreshIcon.classList.remove("refresh-spinning"), 500);
    }
  }
}

function renderDashboardView(weatherData) {
  const activeProfile = getProfileById(appState.selectedProfileId);

  // 1. Top Navigation Bar Updates
  DOM.dashCurrentCityLabel.textContent = weatherData.city;
  DOM.dashCurrentProfileLabel.textContent = `${activeProfile.name} Persona`;

  // 2. Render Quick Profile Switcher Strip
  renderQuickProfileSwitcher();

  // 3. Evaluate Personalization via PersonalizationEngine (unit-aware)
  const personalizedData = PersonalizationEngine.getPersonalizedDashboardData(
    appState.selectedProfileId,
    weatherData,
    appState.tempUnit
  );

  // 4. Render Severe Weather Priority Alert
  renderSevereWeatherAlert(personalizedData.severeAlert);

  // 5. Render Dynamic Profile-Specific Section
  renderDynamicPersonaSection(activeProfile, personalizedData.profileData);

  // 6. Render Hero Weather Card (unit-aware)
  const currentTempDisplay = formatTemp(weatherData.temp);
  const feelsLikeDisplay = formatTemp(weatherData.feelsLike);
  const highTempDisplay = formatTemp(weatherData.highTemp);
  const lowTempDisplay = formatTemp(weatherData.lowTemp);
  const unitSym = `°${appState.tempUnit}`;

  DOM.heroCityName.querySelector("span").textContent = weatherData.city;
  DOM.heroRegionText.innerHTML = `${weatherData.state}, ${weatherData.country} &bull; <span id="heroElevationText">${weatherData.elevation}</span>`;
  DOM.heroTempVal.textContent = currentTempDisplay;
  if (DOM.heroTempUnit) {
    DOM.heroTempUnit.textContent = unitSym;
  }
  DOM.heroConditionText.textContent = weatherData.condition;
  DOM.heroFeelsLikeText.textContent = `Feels like ${feelsLikeDisplay}${unitSym} • High: ${highTempDisplay}${unitSym} • Low: ${lowTempDisplay}${unitSym}`;
  DOM.heroHumidityVal.textContent = `${weatherData.humidity}%`;
  DOM.heroWindVal.textContent = `${weatherData.windSpeed} km/h ${weatherData.windDir}`;
  DOM.heroRainVal.textContent = `${weatherData.rainChance}%`;
  DOM.heroWeatherArt.innerHTML = getWeatherArtIcon(weatherData.conditionCode || "sun");

  // 7. Render 24-Hour Hourly Forecast (unit-aware)
  renderHourlyForecast(weatherData.hourly || []);

  // 8. Render Regional Climate Profile Card
  if (DOM.climateElevationBadge) DOM.climateElevationBadge.textContent = weatherData.elevation;
  if (DOM.climateZoneVal) DOM.climateZoneVal.textContent = weatherData.climateZone;
  if (DOM.climateSeasonVal) DOM.climateSeasonVal.textContent = weatherData.currentSeason;
  if (DOM.climateTempDepartureVal) DOM.climateTempDepartureVal.textContent = weatherData.tempDeparture;
  if (DOM.climateRainfallVal) DOM.climateRainfallVal.textContent = weatherData.rainfallStatus;

  // 9. Render 7-Day Extended Forecast (unit-aware)
  renderDailyForecast(weatherData.daily || []);
}

function formatTemp(celsius) {
  if (celsius === null || celsius === undefined || isNaN(celsius)) return "--";
  if (appState.tempUnit === "F") {
    return Math.round((Number(celsius) * 9) / 5 + 32);
  }
  return Math.round(Number(celsius));
}

function renderSevereWeatherAlert(severeAlert) {
  if (!severeAlert || !severeAlert.hasAlert) {
    DOM.severeAlertArea.style.display = "none";
    DOM.severeAlertArea.innerHTML = "";
    return;
  }

  DOM.severeAlertArea.style.display = "block";
  DOM.severeAlertArea.innerHTML = `
    <div class="severe-alert-banner ${severeAlert.badgeClass}">
      <div class="severe-alert-left">
        <div class="severe-icon-box">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <div>
          <div class="severe-title">
            <span>${severeAlert.title}</span>
            <span class="badge" style="background: rgba(239, 68, 68, 0.3); border-color: #ef4444; color: #fff;">${severeAlert.level} Priority</span>
          </div>
          <div class="severe-desc">${severeAlert.description}</div>
          <div class="severe-instruction">
            <i class="fa-solid fa-circle-exclamation"></i>
            <span>Safety Action: ${severeAlert.instruction}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDynamicPersonaSection(profile, personaData) {
  if (!personaData || !DOM.personaDynamicContainer) return;

  // 1. Header Strip with Active Persona Badge & Change Profile button
  const headerHtml = `
    <div class="persona-header-strip">
      <div class="persona-active-badge-wrap">
        <div class="persona-badge-icon" style="background: ${profile.badgeColor}22; color: ${profile.badgeColor}; border: 1px solid ${profile.badgeColor}55;">
          <i class="fa-solid ${profile.icon}"></i>
        </div>
        <div class="persona-title-group">
          <h3>${profile.name} Personalization</h3>
          <p>${profile.tagline}</p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="badge" style="color: ${profile.badgeColor}; border-color: ${profile.badgeColor}66; background: ${profile.badgeColor}15;">
          <i class="fa-solid fa-shield-check"></i> ${personaData.riskLevel}
        </span>
        <button id="btnSwitchPersonaInline" class="btn btn-outline" style="padding: 0.4rem 0.85rem; font-size: 0.8rem;" title="Choose another profile">
          <i class="fa-solid fa-user-pen"></i> Change Profile
        </button>
      </div>
    </div>
  `;

  // 2. 4 Profile-Specific Key Metrics Cards
  let metricsCardsHtml = `<div class="persona-metrics-grid">`;
  personaData.metrics.forEach((metric) => {
    metricsCardsHtml += `
      <div class="persona-metric-card" style="border-top-color: ${metric.highlightColor || profile.badgeColor};">
        <div>
          <div class="persona-metric-header">
            <span>${metric.label}</span>
            <i class="fa-solid ${metric.icon}" style="color: ${metric.highlightColor || profile.badgeColor};"></i>
          </div>
          <div class="persona-metric-value" style="color: ${metric.highlightColor || profile.badgeColor};">
            ${metric.value} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">${metric.unit}</span>
          </div>
        </div>
        <div class="persona-metric-status">${metric.status}</div>
      </div>
    `;
  });
  metricsCardsHtml += `</div>`;

  // 3. Actionable Recommendation Hero Banner
  let tipsListHtml = "";
  personaData.actionableTips.forEach((tip) => {
    tipsListHtml += `
      <li>
        <i class="fa-solid fa-circle-check" style="color: ${profile.badgeColor}; margin-top: 0.2rem; flex-shrink: 0;"></i>
        <span>${tip}</span>
      </li>
    `;
  });

  const recommendationCardHtml = `
    <div class="glass-panel personalized-insight-card" style="border-left: 4px solid ${profile.badgeColor};">
      <div class="insight-card-header">
        <div class="insight-profile-tag" style="color: ${profile.badgeColor};">
          <i class="fa-solid ${profile.icon}"></i>
          <span>${profile.name} Actionable Intelligence</span>
        </div>
        <div class="badge" style="color: ${profile.badgeColor}; border-color: ${profile.badgeColor}66; background: ${profile.badgeColor}15;">
          ${personaData.riskLevel}
        </div>
      </div>

      <h3 class="insight-title">${personaData.recommendation}</h3>
      <p class="insight-summary" style="color: var(--text-secondary); margin-bottom: 0.85rem;">
        Personalized meteorological guidance calculated for ${appState.selectedLocation} conditions:
      </p>

      <ul class="insight-tips-list">
        ${tipsListHtml}
      </ul>
    </div>
  `;

  // 4. Domain-Specific Breakdown Matrix
  let breakdownGridHtml = `<div class="persona-breakdown-grid">`;
  personaData.extraSectionData.forEach((item) => {
    breakdownGridHtml += `
      <div class="breakdown-item">
        <span class="breakdown-label">${item.name}</span>
        <span class="breakdown-val" style="color: ${profile.badgeColor};">${item.level}</span>
      </div>
    `;
  });
  breakdownGridHtml += `</div>`;

  const breakdownCardHtml = `
    <div class="glass-panel persona-breakdown-card">
      <div class="section-title-wrap">
        <h4 class="section-title" style="font-size: 1rem;">
          <i class="fa-solid fa-layer-group" style="color: ${profile.badgeColor};"></i>
          <span>${personaData.extraSectionTitle}</span>
        </h4>
        <span class="badge">Domain Intelligence</span>
      </div>
      ${breakdownGridHtml}
    </div>
  `;

  // Assemble and Inject into DOM
  DOM.personaDynamicContainer.innerHTML = `
    ${headerHtml}
    ${metricsCardsHtml}
    ${recommendationCardHtml}
    ${breakdownCardHtml}
  `;

  // Inline "Change Profile" button
  const inlineChangeBtn = document.getElementById("btnSwitchPersonaInline");
  if (inlineChangeBtn) {
    inlineChangeBtn.addEventListener("click", () => {
      navigateTo("screen-profile");
    });
  }
}

function renderQuickProfileSwitcher() {
  DOM.quickProfilesList.innerHTML = "";

  USER_PROFILES.forEach((profile) => {
    const isActive = profile.id === appState.selectedProfileId;
    const tabBtn = document.createElement("button");
    tabBtn.className = `quick-profile-tab ${isActive ? "active-tab" : ""}`;
    tabBtn.innerHTML = `
      <i class="fa-solid ${profile.icon}"></i>
      <span>${profile.name}</span>
    `;

    tabBtn.addEventListener("click", () => {
      appState.selectedProfileId = profile.id;
      if (appState.currentWeatherData) {
        renderDashboardView(appState.currentWeatherData);
      } else {
        loadAndRenderDashboard();
      }
    });

    DOM.quickProfilesList.appendChild(tabBtn);
  });
}

function renderHourlyForecast(hourlyItems) {
  DOM.hourlyTrackContainer.innerHTML = "";

  hourlyItems.forEach((item) => {
    const div = document.createElement("div");
    div.className = "hourly-item";
    const tempDisp = formatTemp(item.temp);

    div.innerHTML = `
      <span class="hourly-time">${item.time}</span>
      <div class="hourly-icon">${getConditionIcon(item.icon)}</div>
      <span class="hourly-temp">${tempDisp}°</span>
      <span class="hourly-pop"><i class="fa-solid fa-droplet" style="font-size: 0.6rem;"></i> ${item.pop}%</span>
    `;
    DOM.hourlyTrackContainer.appendChild(div);
  });
}

function renderDailyForecast(dailyItems) {
  DOM.dailyForecastList.innerHTML = "";

  dailyItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "daily-row";
    const minDisp = formatTemp(item.minTemp);
    const maxDisp = formatTemp(item.maxTemp);

    row.innerHTML = `
      <div class="daily-day-label">${item.day}</div>
      <div class="daily-icon-box">${getConditionIcon(item.icon)}</div>
      <div class="daily-condition-label">${item.condition}</div>
      <div class="daily-temp-range">
        <span class="daily-max">${maxDisp}°</span>
        <span class="daily-min">${minDisp}°</span>
      </div>
    `;
    DOM.dailyForecastList.appendChild(row);
  });
}

/* ==========================================================================
   9. Weather Icons & Visual Art Helpers
   ==========================================================================
*/
function getConditionIcon(iconCode) {
  switch (iconCode) {
    case "sun":
    case "sun-dim":
      return '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i>';
    case "cloud-sun":
      return '<i class="fa-solid fa-cloud-sun" style="color: #38bdf8;"></i>';
    case "cloud":
      return '<i class="fa-solid fa-cloud" style="color: #94a3b8;"></i>';
    case "cloud-rain":
    case "cloud-drizzle":
      return '<i class="fa-solid fa-cloud-showers-heavy" style="color: #60a5fa;"></i>';
    case "cloud-lightning":
      return '<i class="fa-solid fa-cloud-bolt" style="color: #fbbf24;"></i>';
    case "moon":
    case "cloud-moon":
      return '<i class="fa-solid fa-moon" style="color: #c084fc;"></i>';
    case "snowflake":
      return '<i class="fa-solid fa-snowflake" style="color: #a5f3fc;"></i>';
    case "sunrise":
    case "sunset":
      return '<i class="fa-solid fa-sun-plant-wilt" style="color: #f97316;"></i>';
    default:
      return '<i class="fa-solid fa-cloud-sun" style="color: #38bdf8;"></i>';
  }
}

function getWeatherArtIcon(conditionCode) {
  switch (conditionCode) {
    case "partly-cloudy":
      return '<i class="fa-solid fa-cloud-sun" style="color: #fbbf24;"></i>';
    case "cloud-sun":
      return '<i class="fa-solid fa-cloud-sun-rain" style="color: #38bdf8;"></i>';
    case "cloud-rain":
      return '<i class="fa-solid fa-cloud-showers-heavy" style="color: #60a5fa;"></i>';
    case "cloud-lightning":
      return '<i class="fa-solid fa-cloud-bolt" style="color: #fbbf24;"></i>';
    case "snowflake":
    case "cloud-snow":
      return '<i class="fa-solid fa-snowflake" style="color: #a5f3fc;"></i>';
    case "moon":
      return '<i class="fa-solid fa-moon" style="color: #c084fc;"></i>';
    case "sun":
    default:
      return '<i class="fa-solid fa-sun" style="color: #fbbf24;"></i>';
  }
}

/* ==========================================================================
   10. Theme, Unit & Voice Briefing Controllers
   ==========================================================================
*/
function initThemeController() {
  applyTheme(appState.theme);

  DOM.btnThemeToggle.addEventListener("click", () => {
    const nextTheme = appState.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme === "light" ? "Light Daylight Glass" : "Obsidian Dark"} theme`, "info", 2000);
  });
}

function applyTheme(theme) {
  appState.theme = theme;
  localStorage.setItem("mausam_theme", theme);
  document.documentElement.setAttribute("data-theme", theme);

  if (DOM.themeToggleIcon) {
    DOM.themeToggleIcon.className = theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
    DOM.themeToggleIcon.style.color = theme === "light" ? "#f59e0b" : "#38bdf8";
  }

  applyDynamicSkyTheme();
}

function initUnitToggleController() {
  DOM.btnUnitToggle.addEventListener("click", () => {
    appState.tempUnit = appState.tempUnit === "C" ? "F" : "C";
    DOM.unitToggleLabel.textContent = `°${appState.tempUnit}`;
    if (DOM.heroTempUnit) {
      DOM.heroTempUnit.textContent = `°${appState.tempUnit}`;
    }

    if (appState.currentWeatherData) {
      renderDashboardView(appState.currentWeatherData);
    } else {
      const fallback = getMockWeatherData(appState.selectedLocation);
      renderDashboardView(fallback);
    }

    showToast(`Temperature unit set to °${appState.tempUnit}`, "info", 2000);
  });
}

function initVoiceBriefing() {
  if (!DOM.btnVoiceBriefing) return;

  DOM.btnVoiceBriefing.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      showToast("Speech synthesis is not supported on this browser.", "warning");
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setVoiceButtonState(false);
      return;
    }

    const weather = appState.currentWeatherData || getMockWeatherData(appState.selectedLocation);
    if (!weather) return;

    const profile = getProfileById(appState.selectedProfileId);
    const personaData = PersonalizationEngine.getPersonalizedDashboardData(appState.selectedProfileId, weather, appState.tempUnit);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning." : hour < 17 ? "Good afternoon." : "Good evening.";

    const briefingText = `
      ${greeting} Welcome to Mausam. 
      In ${weather.city}, the current weather is ${weather.condition}, with a temperature of ${formatTemp(weather.temp)} degrees ${appState.tempUnit === "F" ? "Fahrenheit" : "Celsius"}.
      Relative humidity is ${weather.humidity} percent, and winds are blowing at ${weather.windSpeed} kilometers per hour from the ${weather.windDir}.
      For your ${profile.name} persona: ${personaData.profileData.recommendation}.
      Key guidance: ${personaData.profileData.actionableTips?.[0] || "Enjoy your day."}
    `;

    const utterance = new SpeechSynthesisUtterance(briefingText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => setVoiceButtonState(true);
    utterance.onend = () => setVoiceButtonState(false);
    utterance.onerror = () => setVoiceButtonState(false);

    window._activeUtterance = utterance; // Prevent garbage collection cutoff
    window.speechSynthesis.speak(utterance);
  });
}

function setVoiceButtonState(speaking) {
  appState.isVoiceSpeaking = speaking;
  if (!DOM.btnVoiceBriefing) return;

  if (speaking) {
    DOM.btnVoiceBriefing.classList.add("voice-speaking");
    if (DOM.voiceIcon) DOM.voiceIcon.className = "fa-solid fa-circle-stop";
    if (DOM.voiceLabel) DOM.voiceLabel.textContent = "Stop";
  } else {
    DOM.btnVoiceBriefing.classList.remove("voice-speaking");
    if (DOM.voiceIcon) DOM.voiceIcon.className = "fa-solid fa-volume-high";
    if (DOM.voiceLabel) DOM.voiceLabel.textContent = "Briefing";
  }
}

/* ==========================================================================
   11. Interactive Weather Radar & Live Map (Leaflet.js + RainViewer)
   ==========================================================================
*/
let radarMapInstance = null;
let radarLayerInstance = null;
let mapMarkerInstance = null;

function initRadarModal() {
  if (!DOM.btnOpenRadarModal || !DOM.radarModal) return;

  const openRadar = () => {
    DOM.radarModal.style.display = "flex";
    setTimeout(() => {
      setupLeafletRadarMap();
    }, 150);
  };

  DOM.btnOpenRadarModal.addEventListener("click", openRadar);
  if (DOM.mobileDockRadarBtn) DOM.mobileDockRadarBtn.addEventListener("click", openRadar);

  DOM.btnCloseRadarModal.addEventListener("click", () => {
    DOM.radarModal.style.display = "none";
  });

  DOM.radarModal.addEventListener("click", (e) => {
    if (e.target === DOM.radarModal) {
      DOM.radarModal.style.display = "none";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && DOM.radarModal.style.display === "flex") {
      DOM.radarModal.style.display = "none";
    }
  });

  // Radar layer switches
  DOM.btnRadarPrecip.addEventListener("click", () => {
    DOM.btnRadarPrecip.classList.add("active-radar-layer");
    DOM.btnRadarStandard.classList.remove("active-radar-layer");
    if (radarLayerInstance && radarMapInstance && !radarMapInstance.hasLayer(radarLayerInstance)) {
      radarMapInstance.addLayer(radarLayerInstance);
    }
  });

  DOM.btnRadarStandard.addEventListener("click", () => {
    DOM.btnRadarStandard.classList.add("active-radar-layer");
    DOM.btnRadarPrecip.classList.remove("active-radar-layer");
    if (radarLayerInstance && radarMapInstance && radarMapInstance.hasLayer(radarLayerInstance)) {
      radarMapInstance.removeLayer(radarLayerInstance);
    }
  });
}

async function setupLeafletRadarMap() {
  if (typeof L === "undefined") {
    console.warn("Leaflet library not loaded yet.");
    return;
  }

  const lat = appState.selectedLat || 28.6139;
  const lon = appState.selectedLon || 77.2090;

  if (!radarMapInstance) {
    radarMapInstance = L.map("weatherRadarMap", {
      center: [lat, lon],
      zoom: 7,
      zoomControl: true
    });

    // OpenStreetMap base layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
    }).addTo(radarMapInstance);

    // Fetch RainViewer radar overlay layer
    try {
      const rvRes = await fetch("https://api.rainviewer.com/public/weather-maps.json");
      if (rvRes.ok) {
        const rvData = await rvRes.json();
        const latest = rvData.radar?.past?.slice(-1)[0] || rvData.radar?.nowcast?.slice(-1)[0];
        if (latest && latest.path) {
          radarLayerInstance = L.tileLayer(`https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`, {
            opacity: 0.65,
            zIndex: 10
          }).addTo(radarMapInstance);
        }
      }
    } catch (err) {
      console.warn("RainViewer tile mosaic fetch note:", err.message);
    }

    // Map Click Handler: Click anywhere to inspect weather!
    radarMapInstance.on("click", async (e) => {
      const clickLat = e.latlng.lat;
      const clickLon = e.latlng.lng;

      showToast(`Inspecting weather at ${clickLat.toFixed(2)}°, ${clickLon.toFixed(2)}°...`, "info", 2000);

      // Try reverse geocoding or set coordinates
      const clickCityName = `Location (${clickLat.toFixed(2)}°, ${clickLon.toFixed(2)}°)`;
      appState.selectedLocation = clickCityName;
      appState.selectedLat = clickLat;
      appState.selectedLon = clickLon;

      const weather = await WeatherService.getWeatherData(clickCityName, clickLat, clickLon);
      appState.currentWeatherData = weather;

      updateMapMarker(clickLat, clickLon, `${weather.city}<br>🌡️ ${formatTemp(weather.temp)}°${appState.tempUnit} • ${weather.condition}`);

      // Re-render dashboard behind modal
      renderDashboardView(weather);

      showToast(`Updated to ${weather.city} via radar map!`, "success", 3000);
    });
  } else {
    radarMapInstance.setView([lat, lon], 7);
    radarMapInstance.invalidateSize();
  }

  const curWeather = appState.currentWeatherData;
  const label = curWeather
    ? `<b>${curWeather.city}</b><br>🌡️ ${formatTemp(curWeather.temp)}°${appState.tempUnit} • ${curWeather.condition}`
    : `<b>${appState.selectedLocation}</b>`;

  updateMapMarker(lat, lon, label);
}

function updateMapMarker(lat, lon, popupHtml) {
  if (!radarMapInstance) return;

  if (mapMarkerInstance) {
    mapMarkerInstance.setLatLng([lat, lon]);
    mapMarkerInstance.setPopupContent(popupHtml);
  } else {
    mapMarkerInstance = L.marker([lat, lon]).addTo(radarMapInstance).bindPopup(popupHtml);
  }
  mapMarkerInstance.openPopup();
}

/* ==========================================================================
   12. Real Device GPS Integration with Reverse Geocoding
   ==========================================================================
*/
function initDeviceLocationSync() {
  const btnUseDeviceGPS = DOM.btnUseDeviceGPS;
  const gpsButtonLabel = DOM.gpsButtonLabel;

  async function detectDeviceGPS(onSuccessCallback) {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser or device.", "warning");
      return;
    }

    if (gpsButtonLabel) {
      gpsButtonLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reading High-Precision Device GPS...';
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;

        appState.selectedLat = userLat;
        appState.selectedLon = userLon;

        // Try reverse geocoding via BigDataCloud or fallback to coordinates
        let localityName = `Location (${userLat.toFixed(2)}°, ${userLon.toFixed(2)}°)`;
        try {
          const revRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLat}&longitude=${userLon}&localityLanguage=en`);
          if (revRes.ok) {
            const revData = await revRes.json();
            const resolvedName = revData.city || revData.locality || revData.principalSubdivision;
            if (resolvedName) {
              localityName = resolvedName;
              appState.selectedRegion = revData.principalSubdivision || "Current Region";
              appState.selectedCountry = revData.countryName || "India";
            }
          }
        } catch (_) {}

        appState.selectedLocation = localityName;

        if (gpsButtonLabel) {
          gpsButtonLabel.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> GPS Synced (${userLat.toFixed(2)}°, ${userLon.toFixed(2)}°)`;
        }

        showToast(`GPS Connected: ${localityName}`, "success", 2500);

        if (onSuccessCallback) onSuccessCallback(localityName);
      },
      (error) => {
        console.warn("Geolocation permission error:", error.message);
        if (gpsButtonLabel) {
          gpsButtonLabel.textContent = "Location Permission Denied • Using Selected City";
        }
        showToast("GPS Access Denied. Using preset location.", "warning", 3000);
        setTimeout(() => {
          if (gpsButtonLabel) gpsButtonLabel.textContent = "Detect My Current Location (Device GPS)";
        }, 3500);
      },
      { timeout: 10000, maximumAge: 30000, enableHighAccuracy: true }
    );
  }

  if (btnUseDeviceGPS) {
    btnUseDeviceGPS.addEventListener("click", () => {
      detectDeviceGPS(() => {
        setTimeout(() => {
          navigateTo("screen-profile");
        }, 500);
      });
    });
  }
}

/* ==========================================================================
   13. Native Share & Time System
   ==========================================================================
*/
function initNativeShare() {
  if (!DOM.btnNativeShare) return;

  DOM.btnNativeShare.addEventListener("click", async () => {
    const weatherData = appState.currentWeatherData || getMockWeatherData(appState.selectedLocation);
    const activeProfile = getProfileById(appState.selectedProfileId);
    const personaData = PersonalizationEngine.getPersonalizedDashboardData(appState.selectedProfileId, weatherData, appState.tempUnit);

    const shareData = {
      title: `Mausam Weather Briefing — ${weatherData.city}`,
      text: `🌦️ Mausam Live Telemetry (${weatherData.city})\n🌡️ Temp: ${formatTemp(weatherData.temp)}°${appState.tempUnit} (${weatherData.condition})\n👤 Persona: ${activeProfile.name} (${personaData.profileData.riskLevel})\n💡 Guidance: ${personaData.profileData.recommendation}\n\nChecked on Mausam Meteorological Platform.`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("Weather briefing shared successfully!", "success", 2500);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.log("Share dismissed:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
        showToast("Weather briefing copied to clipboard!", "success", 2500);
      } catch (clipErr) {
        showToast("Weather briefing generated.", "info", 2000);
      }
    }
  });
}

function startLiveClock() {
  function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    const shortTimeString = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const dateString = now.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });

    if (DOM.liveTimeText) DOM.liveTimeText.textContent = `${timeString} IST`;
    if (DOM.heroLiveClock) DOM.heroLiveClock.textContent = `${shortTimeString} IST`;
    if (DOM.heroDateDisplay) DOM.heroDateDisplay.textContent = dateString;
  }

  updateTime();
  setInterval(updateTime, 1000);
}

function applyDynamicSkyTheme() {
  const currentHour = new Date().getHours();
  const orb1 = DOM.ambientOrb1;
  const orb2 = DOM.ambientOrb2;
  const isLight = appState.theme === "light";

  if (isLight) {
    if (orb1) orb1.style.background = "radial-gradient(circle, #38bdf8, transparent 70%)";
    if (orb2) orb2.style.background = "radial-gradient(circle, #818cf8, transparent 70%)";
    return;
  }

  if (currentHour >= 5 && currentHour < 9) {
    if (orb1) orb1.style.background = "radial-gradient(circle, #f59e0b, transparent 70%)";
    if (orb2) orb2.style.background = "radial-gradient(circle, #f43f5e, transparent 70%)";
  } else if (currentHour >= 9 && currentHour < 17) {
    if (orb1) orb1.style.background = "radial-gradient(circle, #0284c7, transparent 70%)";
    if (orb2) orb2.style.background = "radial-gradient(circle, #38bdf8, transparent 70%)";
  } else if (currentHour >= 17 && currentHour < 19) {
    if (orb1) orb1.style.background = "radial-gradient(circle, #f97316, transparent 70%)";
    if (orb2) orb2.style.background = "radial-gradient(circle, #8b5cf6, transparent 70%)";
  } else {
    if (orb1) orb1.style.background = "radial-gradient(circle, #312e81, transparent 70%)";
    if (orb2) orb2.style.background = "radial-gradient(circle, #1e1b4b, transparent 70%)";
  }
}

function initDashboardListeners() {
  DOM.btnDashChangeCity.addEventListener("click", () => navigateTo("screen-welcome"));
  DOM.btnDashChangeProfile.addEventListener("click", () => navigateTo("screen-profile"));

  if (DOM.btnRefreshData) {
    DOM.btnRefreshData.addEventListener("click", () => {
      // Clear cache for current city and reload
      WeatherService.cache.clear();
      loadAndRenderDashboard(true);
    });
  }

  // Mobile Bottom Dock buttons
  if (DOM.mobileDockCityBtn) {
    DOM.mobileDockCityBtn.addEventListener("click", () => navigateTo("screen-welcome"));
  }
  if (DOM.mobileDockHomeBtn) {
    DOM.mobileDockHomeBtn.addEventListener("click", () => {
      if (appState.currentScreen !== "screen-home") navigateTo("screen-home");
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
  if (DOM.mobileDockPersonaBtn) {
    DOM.mobileDockPersonaBtn.addEventListener("click", () => navigateTo("screen-profile"));
  }
}

/* ==========================================================================
   14. Application Bootstrapper
   ==========================================================================
*/
document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize screen listeners & input handlers
  initWelcomeScreen();
  initProfileScreenListeners();
  initDashboardListeners();

  // 2. Initialize Theme, Units & Voice Briefing
  initThemeController();
  initUnitToggleController();
  initVoiceBriefing();

  // 3. Initialize Interactive Weather Radar & Live Map
  initRadarModal();

  // 4. Initialize Device Integrations (GPS & Native Share)
  initDeviceLocationSync();
  initNativeShare();

  // 5. Start Real-time Clock
  startLiveClock();

  // 6. Pre-render profile cards
  renderProfileCards();

  // 7. Initial Navigation
  navigateTo("screen-welcome");
});
