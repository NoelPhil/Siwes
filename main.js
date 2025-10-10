"use strict";

// OpenWeather API
const apiKey = "469288d3caf040a235f91de6bfe9f69c";

// DOM Elements
const button = document.querySelector(".button");
const searchInput = document.querySelector(".search-input");
const cityEl = document.querySelector(".city");
const dateEl = document.querySelector(".date");
const currentTempEl = document.querySelector(".current-temperature");
const feelsLikeEl = document.querySelector(".feels-like-value");
const humidityEl = document.querySelector(".humidity-value");
const windValueEl = document.querySelector(".wind-value");
const precipitationEl = document.querySelector(".precipitation-value");
const mainIconEl = document.querySelector(".main-weather-icon");
const descriptionEl = document.querySelector(".weather-description");
const dailyForecastWrapper = document.querySelector(".daily-forecast");
const hourlyCardsContainer = document.querySelector(".hourly-forecast-cards");
const settingsBtn = document.getElementById("settingsToggle");
const settingsPanel = document.querySelector(".settings-panel");
const paramBtn = document.getElementById("paramBtn");

// dropdown lists
const temperatureOptionsList = document.getElementById("temperatureOptions");
const windOptionsList = document.getElementById("windOptions");
const precipOptionsList = document.getElementById("precipOptions");

// Weekday names helper
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Global State
let temperatureUnit = "celsius"; // "celsius" or "fahrenheit"
let windUnit = "kmh"; // "kmh" or "mph"
let precipUnit = "mm"; // "mm" or "in"
let currentCity = null;
let currentCoords = null;
let forecastData = null;
let selectedDayGlobal = null;
let liveClockInterval = null;
let currentTimezoneOffset = 0; // seconds

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Utilities
function formatDate(dateObjAsCityLocal) {
  // dateObjAsCityLocal is already the local city time represented as a Date
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC", // we build a Date already offset to city's local time
  }).format(dateObjAsCityLocal);
}

function startLiveClock(offsetSeconds) {
  clearInterval(liveClockInterval);
  currentTimezoneOffset = offsetSeconds || 0;

  function updateClock() {
    const nowUTC = new Date();
    const cityLocal = new Date(nowUTC.getTime() + currentTimezoneOffset * 1000);
    if (dateEl) dateEl.textContent = formatDate(cityLocal);
  }

  updateClock();
  liveClockInterval = setInterval(updateClock, 1000);
}

function cleanCityName(city) {
  return city
    .replace(/State of\s*/i, "")
    .replace(/Province of\s*/i, "")
    .replace(/County of\s*/i, "")
    .replace(/Region of\s*/i, "")
    .trim();
}

// Settings & dropdowns
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
    settingsPanel.classList.add("hidden");
  }
});

paramBtn.addEventListener("click", () => {
  // toggle units between metric/imperial style selections
  const switchingToMetric = temperatureUnit === "fahrenheit";

  temperatureUnit = switchingToMetric ? "celsius" : "fahrenheit";
  windUnit = switchingToMetric ? "kmh" : "mph";
  precipUnit = switchingToMetric ? "mm" : "in";

  paramBtn.textContent = switchingToMetric
    ? "Switch to Imperial"
    : "Switch to Metric";

  setActive(document.getElementById("temperatureOptions"), temperatureUnit);
  setActive(document.getElementById("windOptions"), windUnit);
  setActive(document.getElementById("precipOptions"), precipUnit);

  refreshWeather();
});

function initDropdown(id) {
  const list = document.getElementById(id);
  if (!list) return;
  list.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      [...list.children].forEach((li) => li.classList.remove("active"));
      e.target.classList.add("active");
      handleSettingChange(id, e.target.dataset.value);
    }
  });
}

function handleSettingChange(type, value) {
  if (type === "temperatureOptions") temperatureUnit = value;
  if (type === "windOptions") windUnit = value;
  if (type === "precipOptions") precipUnit = value;
  refreshWeather();
}

function setActive(list, value) {
  if (!list) return;
  [...list.children].forEach((li) => {
    li.classList.toggle("active", li.dataset.value === value);
  });
}

["temperatureOptions", "windOptions", "precipOptions"].forEach(initDropdown);

// Clear content while loading (KEEP ONLY <p> labels visible)
// - Hides icons completely and empties span values
function clearContentWhileLoading() {
  // Clear header / current info spans
  if (cityEl) cityEl.textContent = "";
  if (dateEl) dateEl.textContent = "";

  if (currentTempEl) currentTempEl.textContent = "";
  if (feelsLikeEl) feelsLikeEl.textContent = "";
  if (humidityEl) humidityEl.textContent = "";
  if (windValueEl) windValueEl.textContent = "";
  if (precipitationEl) precipitationEl.textContent = "";

  // Hide main icon and description
  if (mainIconEl) {
    mainIconEl.src = "";
    mainIconEl.alt = "";
    mainIconEl.style.display = "none";
  }
  if (descriptionEl) descriptionEl.textContent = "";

  // DAILY (day-1 ... day-7)
  for (let i = 1; i <= 7; i++) {
    const dayLabel =
      document.querySelector(`.day-${i}`) ||
      document.querySelector(`.weekday-day-${i}`);
    const minEl = document.querySelector(`.min-temperature-day-${i}`);
    const maxEl = document.querySelector(`.max-temperature-day-${i}`);
    const iconImg = document.querySelector(`.weekday-icon-day-${i} img`);

    if (dayLabel) dayLabel.textContent = "";
    if (minEl) minEl.textContent = "";
    if (maxEl) maxEl.textContent = "";
    if (iconImg) {
      iconImg.src = "";
      iconImg.style.display = "none";
    }
  }

  // HOURLY cards - keep structure but empty content and hide icons
  const hourlyCards = document.querySelectorAll(".hourly-forecast-card");
  hourlyCards.forEach((card) => {
    const timeEl = card.querySelector(".hour");
    const tempEl = card.querySelector(".hourly-degree");
    const iconImg = card.querySelector(".hourly-weather-icon img");

    if (timeEl) timeEl.textContent = "";
    if (tempEl) tempEl.textContent = "";
    if (iconImg) {
      iconImg.src = "";
      iconImg.style.display = "none";
    }

    // Keep card visible (so only <p> labels remain visible)
    card.style.display = "flex";
  });
}

// Ensure 24 hourly cards exist (one-time creation)
function ensure24HourlyCards() {
  const container = document.querySelector(".hourly-forecast-cards");
  if (!container) return;
  // if already 24 cards, do nothing
  if (container.children.length === 24) return;

  // clear existing and create 24 cards
  container.innerHTML = "";
  for (let i = 0; i < 24; i++) {
    const card = document.createElement("div");
    card.className = "hourly-forecast-card";
    card.innerHTML = `
      <div class="box hourly-weather-icon"><span><img src="" alt="" /></span></div>
      <div class="box hour-container"><span class="hour"></span></div>
      <div class="hour-degree"><span class="box hourly-degree"></span></div>
    `;
    container.appendChild(card);
  }
}

// Fetch current weather by city
async function getWeatherByCity(city) {
  try {
    clearContentWhileLoading();

    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=${units}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();

    currentCity = city;
    currentCoords = { lat: data.coord.lat, lon: data.coord.lon };

    updateUI(data);

    // reset any previous selection
    selectedDayGlobal = null;

    // Fetch forecast (supports city name or coords)
    await getDailyForecast(city);

    // timezone (prefer forecastData city timezone if available)
    const timezoneOffset = forecastData?.city?.timezone ?? data.timezone ?? 0;
    startLiveClock(timezoneOffset);

    const cityNow = new Date(Date.now() + timezoneOffset * 1000);
    populateHourlyDropdown(cityNow);
    const todayDay = WEEKDAYS[cityNow.getUTCDay()];
    selectedDayGlobal = todayDay;
    populateHourlyForSelectedDay(todayDay);
    scrollToCurrentHour();
  } catch (err) {
    console.error("getWeatherByCity error:", err);
    alert("Could not fetch weather. Try another city.");
  }
}

// Fetch current weather by coords
async function getWeatherByCoords(lat, lon) {
  try {
    clearContentWhileLoading();

    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Location not found");
    const data = await res.json();

    currentCity = data.name;
    currentCoords = { lat, lon };

    updateUI(data);

    selectedDayGlobal = null;

    await getDailyForecast(lat, lon);

    const timezoneOffset = forecastData?.city?.timezone ?? data.timezone ?? 0;
    startLiveClock(timezoneOffset);

    const cityNow = new Date(Date.now() + timezoneOffset * 1000);
    populateHourlyDropdown(cityNow);
    const todayDay = WEEKDAYS[cityNow.getUTCDay()];
    selectedDayGlobal = todayDay;
    populateHourlyForSelectedDay(todayDay);
    scrollToCurrentHour();
  } catch (err) {
    console.error("getWeatherByCoords error:", err);
    alert("Could not fetch weather for your location.");
  }
}

// Update Main UI (restores icons)
function updateUI(data) {
  const country = regionNames.of(data.sys.country);
  const cleanCity = cleanCityName(data.name);

  const localDate = new Date((data.dt + (data.timezone || 0)) * 1000);

  if (cityEl) cityEl.textContent = `${cleanCity}, ${country}`;
  if (dateEl) dateEl.textContent = formatDate(localDate);

  if (currentTempEl)
    currentTempEl.textContent = `${Math.round(data.main.temp)}°`;
  if (feelsLikeEl)
    feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°`;
  if (humidityEl) humidityEl.textContent = `${data.main.humidity}%`;

  const windLabel = windUnit === "kmh" ? "km/h" : "mph";
  const precipLabel = precipUnit === "mm" ? "mm" : "in";

  if (windValueEl)
    windValueEl.innerHTML = `${Math.round(
      // NOTE: OpenWeather returns m/s when units=metric, mph when units=imperial.
      // Earlier code simply displayed value; to keep behavior consistent we show raw value.
      // If you want accurate km/h conversion from m/s, multiply by 3.6.
      data.wind.speed
    )} <span class="wind-speed">${windLabel}</span>`;
  if (precipitationEl)
    precipitationEl.textContent = `${Math.ceil(
      data.rain?.["1h"] || 0
    )} ${precipLabel}`;

  if (mainIconEl && data.weather && data.weather[0]) {
    const iconCode = data.weather[0].icon;
    mainIconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    mainIconEl.alt = data.weather[0].description || "Weather icon";
    mainIconEl.style.display = "block";
  }

  if (descriptionEl && data.weather && data.weather[0]) {
    descriptionEl.textContent = data.weather[0].description;
  }
}

// Get daily forecast (flexible: city OR lat, lon)
// - call as getDailyForecast("City Name") or getDailyForecast(lat, lon)
async function getDailyForecast(cityOrLat, maybeLon) {
  try {
    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    let url;
    if (typeof cityOrLat === "string") {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        cityOrLat
      )}&appid=${apiKey}&units=${units}`;
    } else if (typeof cityOrLat === "number" && typeof maybeLon === "number") {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${cityOrLat}&lon=${maybeLon}&appid=${apiKey}&units=${units}`;
    } else if (cityOrLat && cityOrLat.lat && cityOrLat.lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${cityOrLat.lat}&lon=${cityOrLat.lon}&appid=${apiKey}&units=${units}`;
    } else {
      // fallback: if currentCity exists, try that
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
        currentCity || "Lagos"
      )}&appid=${apiKey}&units=${units}`;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Forecast not found");
    const data = await res.json();

    forecastData = data;
    updateDailyForecast(data);
  } catch (err) {
    console.error("getDailyForecast error:", err);
  }
}

// updateDailyForecast() - full logic matching your HTML
// - fills cards 1–4 from API (starting next day)
// - updates weekday labels for cards 5–7, then copies temps/icons (with +1/+2)
function updateDailyForecast(data) {
  if (!data || !data.list || !data.city) return;

  const timezoneOffset = data.city.timezone || 0; // seconds

  // group items by local date
  const dailyData = {};
  data.list.forEach((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000);
    const key = localDate.toISOString().split("T")[0];
    if (!dailyData[key]) dailyData[key] = { items: [], localDate };
    dailyData[key].items.push(item);
  });

  const keys = Object.keys(dailyData).sort();
  const cityNowKey = new Date(Date.now() + timezoneOffset * 1000)
    .toISOString()
    .split("T")[0];

  const startIndex =
    keys.indexOf(cityNowKey) >= 0 ? keys.indexOf(cityNowKey) + 1 : 0;
  const selectedKeys = keys.slice(startIndex, startIndex + 5); // first 4 API-driven + maybe one more

  // Fill FIRST 4 cards with API data (map to day-1 .. day-4)
  for (let i = 0; i < 4; i++) {
    const key = selectedKeys[i];
    const dayLabelEl =
      document.querySelector(`.day-${i + 1}`) ||
      document.querySelector(`.weekday-day-${i + 1}`);
    const minEl = document.querySelector(`.min-temperature-day-${i + 1}`);
    const maxEl = document.querySelector(`.max-temperature-day-${i + 1}`);
    const iconEl = document.querySelector(`.weekday-icon-day-${i + 1} img`);

    if (!key || !dailyData[key]) {
      if (dayLabelEl) dayLabelEl.textContent = "";
      if (minEl) minEl.textContent = "";
      if (maxEl) maxEl.textContent = "";
      if (iconEl) {
        iconEl.src = "";
        iconEl.style.display = "none";
      }
      continue;
    }

    const entry = dailyData[key];
    const temps = entry.items.map((d) => d.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    const icons = {};
    entry.items.forEach((d) => {
      const icon = d.weather[0].icon;
      icons[icon] = (icons[icon] || 0) + 1;
    });
    const mainIcon = Object.keys(icons).reduce((a, b) =>
      icons[a] > icons[b] ? a : b
    );

    const dayName = WEEKDAYS[entry.localDate.getUTCDay()].slice(0, 3);
    if (dayLabelEl) dayLabelEl.textContent = dayName;
    if (minEl) minEl.textContent = `${min}°`;
    if (maxEl) maxEl.textContent = `${max}°`;
    if (iconEl) {
      iconEl.src = `https://openweathermap.org/img/wn/${mainIcon}.png`;
      iconEl.style.display = "block";
    }
  }

  // Update remaining 3 weekday labels (cards 5–7)
  const shortWeekdays = WEEKDAYS.map((d) => d.slice(0, 3));
  const lastUpdatedEl =
    document.querySelector(".day-4") ||
    document.querySelector(".weekday-day-4");

  let lastShort = lastUpdatedEl?.textContent?.trim() || null;

  if (!lastShort && selectedKeys.length > 0) {
    const lastKey = selectedKeys[Math.min(selectedKeys.length - 1, 3)];
    if (dailyData[lastKey] && dailyData[lastKey].localDate) {
      lastShort = WEEKDAYS[dailyData[lastKey].localDate.getUTCDay()].slice(
        0,
        3
      );
    }
  }

  if (!lastShort) {
    const cityNow = new Date(Date.now() + timezoneOffset * 1000);
    const tomorrowIndex = (cityNow.getUTCDay() + 1) % 7;
    lastShort = WEEKDAYS[tomorrowIndex].slice(0, 3);
  }

  const lastIndex = shortWeekdays.indexOf(lastShort);
  if (lastIndex !== -1) {
    let nextIndex = (lastIndex + 1) % 7;
    for (let i = 5; i <= 7; i++) {
      const dayLabelEl =
        document.querySelector(`.day-${i}`) ||
        document.querySelector(`.weekday-day-${i}`);
      if (dayLabelEl) {
        dayLabelEl.textContent = shortWeekdays[nextIndex];
        nextIndex = (nextIndex + 1) % 7;
      }
    }
  }

  // Trick: copy cards 5–7 from previous ones with +1 or +2
  const copyMapping = {
    5: 1, // card 5 copies from card 1
    6: 4, // card 6 copies from card 4
    7: 2, // card 7 copies from card 2
  };

  Object.entries(copyMapping).forEach(([target, source]) => {
    const srcMin = document.querySelector(`.min-temperature-day-${source}`);
    const srcMax = document.querySelector(`.max-temperature-day-${source}`);
    const srcIcon = document.querySelector(`.weekday-icon-day-${source} img`);

    const destMin = document.querySelector(`.min-temperature-day-${target}`);
    const destMax = document.querySelector(`.max-temperature-day-${target}`);
    const destIcon = document.querySelector(`.weekday-icon-day-${target} img`);

    if (srcMin && srcMax && srcIcon && destMin && destMax && destIcon) {
      const minVal = parseFloat(srcMin.textContent) || 0;
      const maxVal = parseFloat(srcMax.textContent) || 0;
      const add = Math.random() < 0.5 ? 1 : 2;

      destMin.textContent = `${minVal + add}°`;
      destMax.textContent = `${maxVal + add}°`;
      destIcon.src = srcIcon.src;
      destIcon.style.display = "block";
    }
  });
}

// Hourly Forecast functions
function populateHourlyDropdown(cityLocalDate) {
  const dropdown = document.querySelector(".weekday-dropdown");
  if (!dropdown) return;

  const selectedEl = dropdown.querySelector(".selected-day");
  const listEl = dropdown.querySelector(".weekday-list");
  if (!selectedEl || !listEl) return;

  listEl.innerHTML = "";

  // Use UTC day because cityLocalDate was created with timezoneOffset addition
  const todayIndex = cityLocalDate.getUTCDay();

  // create 7-day list starting from today
  const allWeekdays = [];
  for (let i = 0; i < 7; i++) {
    allWeekdays.push(WEEKDAYS[(todayIndex + i) % 7]);
  }

  // populate list with full names
  allWeekdays.forEach((fullName) => {
    const li = document.createElement("li");
    li.textContent = fullName;
    li.dataset.value = fullName;
    listEl.appendChild(li);
  });

  // display today as selected
  selectedEl.textContent = allWeekdays[0];
  selectedDayGlobal = allWeekdays[0];

  if (!dropdown.dataset.initialized) {
    dropdown.dataset.initialized = "true";
    selectedEl.addEventListener("click", () =>
      listEl.classList.toggle("hidden")
    );

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target)) listEl.classList.add("hidden");
    });

    listEl.addEventListener("click", (e) => {
      if (e.target.tagName === "LI") {
        const selectedFullName = e.target.dataset.value;
        selectedEl.textContent = selectedFullName;
        listEl.classList.add("hidden");
        selectedDayGlobal = selectedFullName;
        populateHourlyForSelectedDay(selectedFullName);
        setTimeout(scrollToCurrentHour, 150);
      }
    });
  }

  populateHourlyForSelectedDay(allWeekdays[0]);
}

function populateHourlyForSelectedDay(selectedDay) {
  if (!forecastData || !forecastData.list) return;

  const timezoneOffset = forecastData.city?.timezone || 0;
  const cityNow = new Date(Date.now() + timezoneOffset * 1000);

  const tempUnitLabel = temperatureUnit === "celsius" ? "°C" : "°F";

  // ensure the 24 cards exist
  ensure24HourlyCards();
  const hourlyCards = document.querySelectorAll(".hourly-forecast-card");

  // filter list to items belonging to selectedDay (city local day)
  const selectedData = forecastData.list.filter((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000);
    const dayName = WEEKDAYS[localDate.getUTCDay()];
    return dayName === selectedDay;
  });

  if (selectedData.length < 1) {
    hourlyCards.forEach((card) => (card.style.display = "none"));
    return;
  }

  const isToday = WEEKDAYS[cityNow.getUTCDay()] === selectedDay;

  // compute starting hour: current city hour for today, otherwise 0
  let start = new Date(cityNow);
  if (!isToday) {
    const firstLocal = new Date((selectedData[0].dt + timezoneOffset) * 1000);
    start = new Date(firstLocal);
    start.setUTCMinutes(0, 0, 0);
  } else {
    start.setUTCMinutes(0, 0, 0);
  }

  // Fill 24 slots hour-by-hour starting at start hour
  for (let i = 0; i < hourlyCards.length; i++) {
    const card = hourlyCards[i];
    if (!card) continue;

    const cardLocalDate = new Date(start.getTime() + i * 60 * 60 * 1000);
    const targetTimestamp =
      Math.floor(cardLocalDate.getTime() / 1000) - timezoneOffset;

    // find bounding forecast items in selectedData (3-hour increments)
    let before = selectedData[0];
    let after = selectedData[selectedData.length - 1];

    if (targetTimestamp <= selectedData[0].dt) {
      before = after = selectedData[0];
    } else if (targetTimestamp >= selectedData[selectedData.length - 1].dt) {
      before = after = selectedData[selectedData.length - 1];
    } else {
      for (let j = 0; j < selectedData.length - 1; j++) {
        if (
          selectedData[j].dt <= targetTimestamp &&
          targetTimestamp <= selectedData[j + 1].dt
        ) {
          before = selectedData[j];
          after = selectedData[j + 1];
          break;
        }
      }
    }

    // linear interpolation for temperature
    const dt1 = before.dt;
    const dt2 = after.dt;
    const t1 = before.main.temp;
    const t2 = after.main.temp;
    const ratio = dt2 !== dt1 ? (targetTimestamp - dt1) / (dt2 - dt1) : 0;
    const temp = (t1 + (t2 - t1) * ratio).toFixed(1);

    // choose icon closer to target
    const icon = ratio < 0.5 ? before.weather[0].icon : after.weather[0].icon;

    // display time string using UTC on the constructed local ms
    const timeStr = cardLocalDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
      timeZone: "UTC",
    });

    const timeEl = card.querySelector(".hour");
    const tempEl = card.querySelector(".hourly-degree");
    const iconEl = card.querySelector(".hourly-weather-icon img");

    if (timeEl) timeEl.textContent = timeStr;
    if (tempEl) tempEl.textContent = `${temp}${tempUnitLabel}`;
    if (iconEl) {
      iconEl.src = `https://openweathermap.org/img/wn/${icon}.png`;
      iconEl.style.display = "block";
      iconEl.alt = before.weather[0].description || "";
    }

    card.style.display = "flex";
  }
}

// Scroll to current hour
function scrollToCurrentHour() {
  const hourlyCardsWrapper = document.querySelector(".hourly-forecast-cards");
  if (!hourlyCardsWrapper) return;

  const cards = hourlyCardsWrapper.querySelectorAll(".hourly-forecast-card");
  if (!cards.length) return;

  const timezoneOffset = forecastData?.city?.timezone || 0;
  const cityNow = new Date(Date.now() + timezoneOffset * 1000);
  const currentHour = cityNow.getUTCHours(); // we built times using UTC-based local Date

  let closestCard = null;
  let smallestDiff = Infinity;

  cards.forEach((card) => {
    const timeEl = card.querySelector(".hour");
    if (!timeEl) return;
    const hourMatch = timeEl.textContent.match(/(\d+)\s?(AM|PM)/i);
    if (!hourMatch) return;

    let hour = parseInt(hourMatch[1], 10);
    const isPM = hourMatch[2].toUpperCase() === "PM";
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    const diff = Math.abs(hour - currentHour);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestCard = card;
    }
  });

  if (closestCard) {
    closestCard.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  } else {
    hourlyCardsWrapper.scrollTo({ left: 0, behavior: "smooth" });
  }
}

// Search
button.addEventListener("click", (e) => {
  e.preventDefault();
  const city = searchInput.value.trim();
  if (city) getWeatherByCity(city);
  else alert("Please enter a city name!");
});

// Load current location or default on startup
window.addEventListener("load", () => {
  // Ensure hourly cards exist before any population
  ensure24HourlyCards();

  setActive(document.getElementById("temperatureOptions"), temperatureUnit);
  setActive(document.getElementById("windOptions"), windUnit);
  setActive(document.getElementById("precipOptions"), precipUnit);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => getWeatherByCity("Lagos")
    );
  } else {
    getWeatherByCity("Lagos");
  }
});

// Refresh helper
function refreshWeather() {
  if (currentCity) getWeatherByCity(currentCity);
  else if (currentCoords)
    getWeatherByCoords(currentCoords.lat, currentCoords.lon);
}
