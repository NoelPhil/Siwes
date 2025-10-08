"use strict";

// =============================
// 🌤️ OpenWeather API
// =============================
const apiKey = "469288d3caf040a235f91de6bfe9f69c";

// =============================
// 🌍 DOM Elements
// =============================
const button = document.querySelector(".button");
const searchInput = document.querySelector(".search-input");
const cityEl = document.querySelector(".city");
const dateEl = document.querySelector(".date");
const currentTempEl = document.querySelector(".current-temperature");
const feelsLikeEl = document.querySelector(".feels-like-value");
const humidityEl = document.querySelector(".humidity-value");
const windValueEl = document.querySelector(".wind-value");
const precipitationEl = document.querySelector(".precipitation-value");

const settingsBtn = document.getElementById("settingsToggle");
const settingsPanel = document.querySelector(".settings-panel");
const paramBtn = document.getElementById("paramBtn");

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

// =============================
// ⚙️ Global State
// =============================
let temperatureUnit = "celsius"; // or 'fahrenheit'
let windUnit = "kmh"; // or 'mph'
let precipUnit = "mm"; // or 'in'
let currentCity = null;
let currentCoords = null;
let forecastData = null;
let selectedDayGlobal = null;

// Live-clock state
let liveClockInterval = null;
let currentTimezoneOffset = 0; // seconds

// =============================
// 🧭 Utility Functions
// =============================
function formatDate(dateObjAsCityLocal) {
  // dateObjAsCityLocal should be a Date created like: new Date((dt + timezoneOffset) * 1000)
  // Use UTC fields so that the UTC fields correspond to the city's local fields.
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  }).format(dateObjAsCityLocal);
}

// Start / restart the live clock for the given timezone offset (in seconds)
function startLiveClock(offsetSeconds) {
  clearInterval(liveClockInterval);
  currentTimezoneOffset = offsetSeconds || 0;

  function updateClock() {
    const nowUTC = new Date();
    const cityLocal = new Date(nowUTC.getTime() + currentTimezoneOffset * 1000);
    dateEl.textContent = formatDate(cityLocal);
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

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// =============================
// ⚙️ Settings Panel
// =============================
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!settingsPanel.contains(e.target) && e.target !== settingsBtn) {
    settingsPanel.classList.add("hidden");
  }
});

paramBtn.addEventListener("click", () => {
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

// =============================
// 🧩 Dropdown System
// =============================
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

// =============================
// 🌤️ Fetch Weather
// =============================
async function getWeatherByCity(city) {
  try {
    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();

    currentCity = city;
    currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
    updateUI(data);

    // Reset selection state
    selectedDayGlobal = null;

    // Fetch forecast (this sets forecastData)
    await getDailyForecast(city);

    // determine timezoneOffset (prefer forecastData city timezone, fallback to weather data timezone)
    const timezoneOffset = forecastData?.city?.timezone ?? data.timezone ?? 0;
    startLiveClock(timezoneOffset);

    const cityNow = new Date(Date.now() + timezoneOffset * 1000);

    populateHourlyDropdown(cityNow);
    const todayDay = WEEKDAYS[cityNow.getUTCDay()];
    selectedDayGlobal = todayDay;
    populateHourlyForSelectedDay(todayDay);
    scrollToCurrentHour();
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather. Try another city.");
  }
}

async function getWeatherByCoords(lat, lon) {
  try {
    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location not found");
    const data = await response.json();

    currentCity = data.name;
    currentCoords = { lat, lon };
    updateUI(data);

    selectedDayGlobal = null;

    await getDailyForecast(data.name);

    const timezoneOffset = forecastData?.city?.timezone ?? data.timezone ?? 0;
    startLiveClock(timezoneOffset);

    const cityNow = new Date(Date.now() + timezoneOffset * 1000);

    populateHourlyDropdown(cityNow);
    const todayDay = WEEKDAYS[cityNow.getUTCDay()];
    selectedDayGlobal = todayDay;
    populateHourlyForSelectedDay(todayDay);
    scrollToCurrentHour();
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather for your location.");
  }
}

// =============================
// 🖼️ Update UI
// =============================
function updateUI(data) {
  const fullCountry = regionNames.of(data.sys.country);
  const cleanCity = cleanCityName(data.name);

  // Build a Date representing the city's local time by adding timezone offset to dt
  const localDate = new Date((data.dt + (data.timezone || 0)) * 1000);

  cityEl.textContent = `${cleanCity}, ${fullCountry}`;
  // show a static format immediately; the live clock (startLiveClock) will replace this and start ticking
  dateEl.textContent = formatDate(localDate);

  currentTempEl.textContent = `${Math.round(data.main.temp)}°`;
  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;

  const windLabel = windUnit === "kmh" ? "km/h" : "mph";
  const precipLabel = precipUnit === "mm" ? "mm" : "in";

  windValueEl.innerHTML = `${Math.round(
    data.wind.speed
  )} <span class="wind-speed">${windLabel}</span>`;
  precipitationEl.textContent = `${Math.ceil(
    data.rain?.["1h"] || 0
  )} ${precipLabel}`;

  const iconEl = document.querySelector(".main-weather-icon");
  if (iconEl && data.weather && data.weather[0]) {
    const iconCode = data.weather[0].icon;
    iconEl.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    iconEl.alt = data.weather[0].description || "Weather icon";
  }

  const descriptionEl = document.querySelector(".weather-description");
  if (descriptionEl) {
    descriptionEl.textContent = data.weather[0].description;
  }
}

// =============================
// 📅 Forecast (daily & store)
// =============================
async function getDailyForecast(city) {
  try {
    const units = temperatureUnit === "celsius" ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
      city
    )}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Forecast not found");
    const data = await response.json();

    forecastData = data;
    updateDailyForecast(data);
  } catch (error) {
    console.error("Forecast fetch error:", error);
  }
}

// =============================
// ✅ updateDailyForecast()
//    - first 4 cards use API data (starting from next day)
//    - cards 5–7 only update weekday labels to continue sequence
// =============================
function updateDailyForecast(data) {
  if (!data || !data.list || !data.city) return;

  const timezoneOffset = data.city.timezone || 0; // seconds

  // Group forecast data by city-local date, and keep one localDate instance per day
  const dailyData = {}; // key -> { items: [], localDate: Date }
  data.list.forEach((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000); // UTC fields = city-local fields
    const key = localDate.toISOString().split("T")[0]; // YYYY-MM-DD based on UTC fields which correspond to city-local date
    if (!dailyData[key]) dailyData[key] = { items: [], localDate };
    dailyData[key].items.push(item);
  });

  // Sorted keys (YYYY-MM-DD strings sort lexicographically)
  const keys = Object.keys(dailyData).sort();

  // Determine city "today" key (city-local)
  const cityNowKey = new Date(Date.now() + timezoneOffset * 1000)
    .toISOString()
    .split("T")[0];

  // START FROM NEXT DAY (if cityNowKey exists in keys)
  const startIndex =
    keys.indexOf(cityNowKey) >= 0 ? keys.indexOf(cityNowKey) + 1 : 0;

  // Grab up to 5 days starting from next day (API provides up to 5)
  const selectedKeys = keys.slice(startIndex, startIndex + 5);

  // --- Fill the FIRST 4 cards with API data (if available) ---
  for (let i = 0; i < 4; i++) {
    const key = selectedKeys[i];
    const dayLabelEl =
      document.querySelector(`.weekday-day-${i + 1}`) ||
      document.querySelector(`.day-${i + 1}`);
    const minEl = document.querySelector(`.min-temperature-day-${i + 1}`);
    const maxEl = document.querySelector(`.max-temperature-day-${i + 1}`);
    const iconEl = document.querySelector(`.weekday-icon-day-${i + 1} img`);

    if (!key || !dailyData[key]) {
      // If there's no API data for this card, clear label/temp/icon
      if (dayLabelEl) dayLabelEl.textContent = "";
      if (minEl) minEl.textContent = "";
      if (maxEl) maxEl.textContent = "";
      if (iconEl) iconEl.src = "";
      continue;
    }

    const entry = dailyData[key];
    const temps = entry.items.map((d) => d.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    // Choose most frequent icon for the day
    const icons = {};
    entry.items.forEach((d) => {
      const icon = d.weather[0].icon;
      icons[icon] = (icons[icon] || 0) + 1;
    });
    const mainIcon = Object.keys(icons).reduce((a, b) =>
      icons[a] > icons[b] ? a : b
    );

    // local weekday short name (e.g. "Wed")
    const dayName = WEEKDAYS[entry.localDate.getUTCDay()].slice(0, 3);

    if (dayLabelEl) dayLabelEl.textContent = dayName;
    if (minEl) minEl.textContent = `${min}°`;
    if (maxEl) maxEl.textContent = `${max}°`;
    if (iconEl)
      iconEl.src = `https://openweathermap.org/img/wn/${mainIcon}.png`;
  }

  // --- Update remaining 3 weekday labels (cards 5,6,7) to continue after card 4 ---
  const shortWeekdays = WEEKDAYS.map((d) => d.slice(0, 3)); // ["Sun","Mon",...]
  // Find last updated weekday from card 4 (prefer the DOM since that's what's shown)
  const lastUpdatedEl =
    document.querySelector(".weekday-day-4") ||
    document.querySelector(".day-4");
  let lastShort = null;

  if (lastUpdatedEl && lastUpdatedEl.textContent.trim()) {
    lastShort = lastUpdatedEl.textContent.trim();
  } else {
    // fallback: if card 4 wasn't filled, try last of selectedKeys (the last API day we had)
    if (selectedKeys.length > 0) {
      const lastKey = selectedKeys[Math.min(selectedKeys.length - 1, 3)];
      if (dailyData[lastKey] && dailyData[lastKey].localDate) {
        lastShort = WEEKDAYS[dailyData[lastKey].localDate.getUTCDay()].slice(
          0,
          3
        );
      }
    }
  }

  // If we still don't have a lastShort (edge-case), compute from city local date (use tomorrow)
  if (!lastShort) {
    const cityNow = new Date(Date.now() + timezoneOffset * 1000);
    const tomorrowIndex = (cityNow.getUTCDay() + 1) % 7;
    lastShort = WEEKDAYS[tomorrowIndex].slice(0, 3);
    // treat this as "the last shown day" so next will be tomorrow+1
  }

  const lastIndex = shortWeekdays.indexOf(lastShort);
  if (lastIndex !== -1) {
    let nextIndex = (lastIndex + 1) % 7;
    for (let i = 5; i <= 7; i++) {
      const dayLabelEl =
        document.querySelector(`.weekday-day-${i}`) ||
        document.querySelector(`.day-${i}`);
      if (dayLabelEl) {
        dayLabelEl.textContent = shortWeekdays[nextIndex];
        nextIndex = (nextIndex + 1) % 7;
      }
    }
  }
}

// =============================
// 🕒 Hourly Forecast
// =============================
// (unchanged from your original — kept as-is)
function populateHourlyDropdown(cityLocalDate) {
  const dropdown = document.querySelector(".weekday-dropdown");
  if (!dropdown) return;

  const selectedEl = dropdown.querySelector(".selected-day");
  const listEl = dropdown.querySelector(".weekday-list");
  if (!selectedEl || !listEl) return;

  listEl.innerHTML = "";

  // Use UTC day because cityLocalDate was created with timezoneOffset addition
  const todayIndex = cityLocalDate.getUTCDay();

  // 🟢 Create list of all 7 weekdays starting from today
  const allWeekdays = [];
  for (let i = 0; i < 7; i++) {
    allWeekdays.push(WEEKDAYS[(todayIndex + i) % 7]);
  }

  // 🟢 Populate dropdown with full names
  allWeekdays.forEach((fullName) => {
    const li = document.createElement("li");
    li.textContent = fullName; // full weekday name in UI
    li.dataset.value = fullName;
    listEl.appendChild(li);
  });

  // 🟢 Display today as selected
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
        selectedEl.textContent = selectedFullName; // full name
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
  const hourlyCards = document.querySelectorAll(".hourly-forecast-card");

  // filter forecastData for items that belong to selectedDay (using city local date)
  const selectedData = forecastData.list.filter((item) => {
    const localDate = new Date((item.dt + timezoneOffset) * 1000);
    const dayName = WEEKDAYS[localDate.getUTCDay()]; // full weekday
    return dayName === selectedDay;
  });

  if (selectedData.length < 1) {
    hourlyCards.forEach((card) => (card.style.display = "none"));
    return;
  }

  const isToday = WEEKDAYS[cityNow.getUTCDay()] === selectedDay;

  let start = new Date(cityNow);
  if (!isToday) {
    const firstLocal = new Date((selectedData[0].dt + timezoneOffset) * 1000);
    start = new Date(firstLocal);
    start.setUTCMinutes(0, 0, 0);
  } else {
    // zero minutes/seconds but keep the city's current hour (UTC fields correspond to city local)
    start.setUTCMinutes(0, 0, 0);
  }

  for (let i = 0; i < hourlyCards.length; i++) {
    const card = hourlyCards[i];
    const cardLocalDate = new Date(start.getTime() + i * 60 * 60 * 1000);
    const targetTimestamp =
      Math.floor(cardLocalDate.getTime() / 1000) - timezoneOffset;

    let before = selectedData[0];
    let after = selectedData[selectedData.length - 1];

    for (let j = 0; j < selectedData.length - 1; j++) {
      if (
        selectedData[j].dt <= targetTimestamp &&
        targetTimestamp < selectedData[j + 1].dt
      ) {
        before = selectedData[j];
        after = selectedData[j + 1];
        break;
      }
    }

    const dt1 = before.dt;
    const dt2 = after.dt;
    const t1 = before.main.temp;
    const t2 = after.main.temp;
    const ratio = dt2 !== dt1 ? (targetTimestamp - dt1) / (dt2 - dt1) : 0;
    const temp = (t1 + (t2 - t1) * ratio).toFixed(1);
    const icon = ratio < 0.5 ? before.weather[0].icon : after.weather[0].icon;

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
    if (iconEl) iconEl.src = `https://openweathermap.org/img/wn/${icon}.png`;

    card.style.display = "flex";
  }
}

// =============================
// 🌀 Scroll to current hour
// =============================
function scrollToCurrentHour() {
  const hourlyContainer = document.querySelector(".hourly-forecast-container");
  if (!hourlyContainer) return;

  const cards = hourlyContainer.querySelectorAll(".hourly-forecast-card");
  if (!cards.length) return;

  const timezoneOffset = forecastData?.city?.timezone || 0;
  const cityNow = new Date(Date.now() + timezoneOffset * 1000);
  const currentHour = cityNow.getUTCHours(); // since card times are formatted using UTC fields

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
    hourlyContainer.scrollTo({ left: 0, behavior: "smooth" });
  }
}

// =============================
// 🔍 Search
// =============================
button.addEventListener("click", (e) => {
  e.preventDefault();
  const city = searchInput.value.trim();
  if (city) getWeatherByCity(city);
  else alert("Please enter a city name!");
});

// =============================
// 🚀 Load Current Location
// =============================
window.addEventListener("load", () => {
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

// =============================
// 🔄 Refresh Helper
// =============================
function refreshWeather() {
  if (currentCity) getWeatherByCity(currentCity);
  else if (currentCoords)
    getWeatherByCoords(currentCoords.lat, currentCoords.lon);
}
