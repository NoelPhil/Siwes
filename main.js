"use strict";

// OPenweatherAPI
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

const settingsBtn = document.getElementById("settingsToggle");
const settingsPanel = document.querySelector(".settings-panel");
const paramBtn = document.getElementById("paramBtn");

// Global State
let isMetric = true;
let currentCity = null;
let currentCoords = null;
let forecastData = null;
let selectedDayGlobal = null;

// Utility Functions
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

// Settings Panel
settingsBtn.addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});

// Close settings panel when clicking outside
document.addEventListener("click", (e) => {
  if (
    !settingsPanel.contains(e.target) &&
    e.target !== settingsBtn &&
    !settingsPanel.classList.contains("hidden")
  ) {
    settingsPanel.classList.add("hidden");
  }
});

paramBtn.addEventListener("click", () => {
  isMetric = !isMetric;
  paramBtn.textContent = isMetric ? "Switch to Imperial" : "Switch to Metric";

  const tempOptions = document.getElementById("temperatureOptions");
  const windOptions = document.getElementById("windOptions");
  const precipOptions = document.getElementById("precipOptions");

  if (!isMetric) {
    setActive(tempOptions, "fahrenheit");
    setActive(windOptions, "mph");
    setActive(precipOptions, "in");
  } else {
    setActive(tempOptions, "celsius");
    setActive(windOptions, "kmh");
    setActive(precipOptions, "mm");
  }

  if (currentCity) {
    getWeatherByCity(currentCity);
  } else if (currentCoords) {
    getWeatherByCoords(currentCoords.lat, currentCoords.lon);
  }
});

function initDropdown(id) {
  const list = document.getElementById(id);
  if (!list) return;
  list.addEventListener("click", (e) => {
    if (e.target.tagName === "LI") {
      [...list.children].forEach((li) => li.classList.remove("active"));
      e.target.classList.add("active");
    }
  });
}

function setActive(list, value) {
  if (!list) return;
  [...list.children].forEach((li) => {
    if (li.dataset.value === value) li.classList.add("active");
    else li.classList.remove("active");
  });
}

["temperatureOptions", "windOptions", "precipOptions"].forEach(initDropdown);

// Fetch Weather
async function getWeatherByCity(city) {
  try {
    const units = isMetric ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();

    currentCity = city;
    currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
    updateUI(data);
    getDailyForecast(city);
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather. Try another city.");
  }
}

async function getWeatherByCoords(lat, lon) {
  try {
    const units = isMetric ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location not found");
    const data = await response.json();

    currentCity = data.name;
    currentCoords = { lat, lon };
    updateUI(data);
    getDailyForecast(data.name);
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather for your location.");
  }
}

// Update UI
function updateUI(data) {
  const fullCountry = regionNames.of(data.sys.country);
  const cleanCity = cleanCityName(data.name);

  const localDate = new Date((data.dt + data.timezone) * 1000);
  cityEl.textContent = `${cleanCity}, ${fullCountry}`;
  dateEl.textContent = formatDate(localDate);

  currentTempEl.textContent = `${Math.round(data.main.temp)}°`;
  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;

  const windUnit = isMetric ? "km/h" : "mph";
  const precipUnit = isMetric ? "mm" : "in";

  windValueEl.innerHTML = `${Math.round(
    data.wind.speed
  )} <span class="wind-speed">${windUnit}</span>`;
  precipitationEl.textContent = `${Math.ceil(
    data.rain?.["1h"] || 0
  )} ${precipUnit}`;

  populateHourlyDropdown(localDate);
}

// Forecast
async function getDailyForecast(city) {
  try {
    const units = isMetric ? "metric" : "imperial";
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${units}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Forecast not found");
    const data = await response.json();

    forecastData = data;
    updateDailyForecast(data);
    populateHourlyDropdown(new Date());
  } catch (error) {
    console.error("Forecast fetch error:", error);
  }
}

function updateDailyForecast(data) {
  const dailyData = {};

  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const key = date.toISOString().split("T")[0];
    if (!dailyData[key]) dailyData[key] = [];
    dailyData[key].push(item);
  });

  const keys = Object.keys(dailyData).slice(1, 6);
  keys.forEach((key, i) => {
    const items = dailyData[key];
    const temps = items.map((d) => d.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));

    const icons = {};
    items.forEach((d) => {
      const icon = d.weather[0].icon;
      icons[icon] = (icons[icon] || 0) + 1;
    });
    const mainIcon = Object.keys(icons).reduce((a, b) =>
      icons[a] > icons[b] ? a : b
    );

    const minEl = document.querySelector(`.min-temperature-day-${i + 1}`);
    const maxEl = document.querySelector(`.max-temperature-day-${i + 1}`);
    const iconEl = document.querySelector(`.weekday-icon-day-${i + 1} img`);

    if (minEl) minEl.textContent = `${min}°`;
    if (maxEl) maxEl.textContent = `${max}°`;
    if (iconEl)
      iconEl.src = `https://openweathermap.org/img/wn/${mainIcon}.png`;
  });
}

// Hourly Forecast
function populateHourlyDropdown(currentDate) {
  const dropdown = document.querySelector(".hourly-forecast-dropdown select");
  if (!dropdown) return;

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  dropdown.innerHTML = "";

  const todayIndex = currentDate.getDay();
  for (let i = 0; i < 5; i++) {
    const dayIndex = (todayIndex + i) % 7;
    const option = document.createElement("option");
    option.value = days[dayIndex];
    option.textContent = days[dayIndex];
    dropdown.appendChild(option);
  }

  dropdown.addEventListener("change", (e) => {
    selectedDayGlobal = e.target.value;
    populateHourlyForSelectedDay(e.target.value);
  });

  selectedDayGlobal = days[todayIndex];
  populateHourlyForSelectedDay(days[todayIndex]);
}

function populateHourlyForSelectedDay(selectedDay) {
  if (!forecastData) return;

  const timezoneOffset = forecastData.city?.timezone || 0;
  const units = isMetric ? "°C" : "°F";
  const hourlyCards = document.querySelectorAll(".hourly-forecast-card");

  const now = new Date();
  const isToday =
    now.toLocaleDateString("en-US", { weekday: "long" }) === selectedDay;

  let selectedData = forecastData.list.filter((item) => {
    const date = new Date((item.dt + timezoneOffset) * 1000);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    return day === selectedDay;
  });

  // Filter to start from current hour if today
  if (isToday) {
    const currentHour = now.getUTCHours() + timezoneOffset / 3600;
    selectedData = selectedData.filter((item) => {
      const itemHour = new Date(
        (item.dt + timezoneOffset) * 1000
      ).getUTCHours();
      return itemHour >= currentHour;
    });
  }

  // Sort selectedData by time just in case
  selectedData.sort((a, b) => a.dt - b.dt);

  hourlyCards.forEach((card, i) => {
    const item = selectedData[i];
    if (!item) {
      card.style.display = "none";
      return;
    }

    card.style.display = "flex";

    const localTime = new Date((item.dt + timezoneOffset) * 1000);
    const time = localTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });
    const temp = Math.round(item.main.temp);
    const icon = item.weather[0].icon;

    const timeEl = card.querySelector(".hour");
    const tempEl = card.querySelector(".hourly-degree");
    const iconEl = card.querySelector(".hourly-weather-icon img");

    if (timeEl) timeEl.textContent = time;
    if (tempEl) tempEl.textContent = `${temp}${units}`;
    if (iconEl) iconEl.src = `https://openweathermap.org/img/wn/${icon}.png`;
  });
}

// Search
button.addEventListener("click", (e) => {
  e.preventDefault();
  const city = searchInput.value.trim();
  if (city) getWeatherByCity(city);
  else alert("Please enter a city name!");
});

// Load Current Location on Startup
window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        getWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        console.warn("Geolocation denied, defaulting to Lagos");
        getWeatherByCity("Lagos");
      }
    );
  } else {
    getWeatherByCity("Lagos");
  }
});
