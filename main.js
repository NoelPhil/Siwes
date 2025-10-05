"use strict";

// ///Elements
// const LabelCurrentDate = document.querySelector(".date");
// const LabelCurrentDay = document.querySelector(".day");
// // const LabelCurrentCity = document.querySelector(".city");

// const currentCity = document.querySelector(".city");

// // const weatherContainer = document.querySelector(" ");
// const units = "metric"; //can be imperial or metric

// let temperatureSymbol = units == "metric" ? "°C" : "°F";

// ///Functions

// /// Create current date
// const now = new Date();
// const day = now.getDate();
// const month = now.getMonth();
// const year = now.getFullYear();
// // labelDate.textContent =

// // const button = document.querySelector(".button");
// // button.addEventListener("click", function () {
// //   const city = document.querySelector(".search-input").value;
// //   const apiKey = "469288d3caf040a235f91de6bfe9f69c";
// //   const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

// //   fetch(url)
// //     .then((response) => response.json())
// //     .then((data) => console.log(data))
// //     .catch((err) => alert("Wrong city name!"));
// // });

// /// Search bar
// // async function getWeather() {
// //   const city = document.querySelector(".search-input").value;
// //   const apiKey = "469288d3caf040a235f91de6bfe9f69c";
// //   const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

// //   try {
// //     const cnt = 10;
// //     // const city = document.querySelector(".search-input").value;

// //     const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=${units}&cnt=${cnt}`;

// //     //Display error if user types invalid city or no city
// //     // if (data.cod == "400" || data.cod == "404") {
// //     //   error.innerHTML = `Not valid city. Please input another city`;
// //     //   return;
// //     // }

// //     const response = await fetch(apiUrl);

// //     //   if (!response.ok) throw new Error("City not found");

// //     const data = await response.json();

// //     //   document.getElementById("search").innerHTML = `
// //     //     <h3>${data.name}, ${data.sys.country}</h3>
// //     //     <p>🌡️ ${data.main.temp}°C</p>
// //     //     <p>☁️ ${data.weather[0].description}</p>
// //     //     <p>💧 Humidity: ${data.main.humidity}%</p>
// //     //   `;
// //   } catch (error) {
// //     document.querySelector(
// //       ".search-input"
// //     ).innerHTML = `<p style="color: red;">${error.message}</p>`;
// //   }

// //   console.log(data);

// //   document.querySelector(".city").innerHTML = data.name;
// //   document.querySelector(".current-temperature").innerHTML = data.temp;
// // }

// // getWeather();

// // Trigger search when user presses "Enter"
// // function handleKeyPress(event) {
// //   if (event.key === "Enter") {
// //     const city = document.querySelector(".search-input").value;
// //     if (city) {
// //       getWeather(city);
// //     }
// //   }
// // }

// const button = document.querySelector(".button");

// button.addEventListener("click", async function () {
//   const city = document.querySelector(".search-input").value.trim();
//   const apiKey = "469288d3caf040a235f91de6bfe9f69c";

//   if (!city) {
//     alert("Please enter a city name!");
//     return;
//   }

//   try {
//     const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

//     // Await pauses until fetch finishes
//     const response = await fetch(url);

//     // Throw an error if server says "not ok"
//     if (!response.ok) {
//       throw new Error("City not found or API error");
//     }

//     // Await the JSON parsing too
//     const data = await response.json();

//     console.log("Weather data:", data);
//     alert(`Weather in ${data.name}: ${data.main.temp}°C`);
//   } catch (error) {
//     // If fetch fails or we throw manually, this runs
//     console.error("Error fetching weather:", error);
//     alert(error.message);
//   }
// });

// OPenweatherAPI
const apiKey = "469288d3caf040a235f91de6bfe9f69c";
const button = document.querySelector(".button");
const searchInput = document.querySelector(".search-input");

// Elements to update
const cityEl = document.querySelector(".city");
const dateEl = document.querySelector(".date");
const currentTempEl = document.querySelector(".current-temperature");
const feelsLikeEl = document.querySelector(".feels-like-value");
const humidityEl = document.querySelector(".humidity-value");
const windValueEl = document.querySelector(".wind-value");
const precipitationEl = document.querySelector(".precipitation-value");

// Format date
function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Intl API for converting country codes → full names
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

// Clean city name
function cleanCityName(city) {
  return city
    .replace(/State of\s*/i, "")
    .replace(/Province of\s*/i, "")
    .replace(/County of\s*/i, "")
    .replace(/Region of\s*/i, "")
    .trim();
}

// --- Get next 7 weekdays ---
function getNext7Days(startDate) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let result = [];
  for (let i = 1; i <= 7; i++) {
    const nextDay = new Date(startDate);
    nextDay.setDate(startDate.getDate() + i);
    result.push(days[nextDay.getDay()]);
  }
  return result;
}

// Fetch current weather by city
async function getWeatherByCity(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("City not found");
    const data = await response.json();
    updateUI(data);
    getDailyForecast(city); // fetch 5-day forecast
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather. Try another city.");
  }
}

// Fetch weather by coordinates
async function getWeatherByCoords(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Location not found");
    const data = await response.json();
    updateUI(data);
    getDailyForecast(data.name);
  } catch (error) {
    console.error("Weather fetch error:", error);
    alert("Could not fetch weather for your location.");
  }
}

// Update main UI
function updateUI(data) {
  const fullCountry = regionNames.of(data.sys.country);
  const cleanCity = cleanCityName(data.name);

  const localDate = new Date((data.dt + data.timezone) * 1000);
  const currentHour = localDate.getHours(); // exact current hour in the city

  cityEl.textContent = `${cleanCity}, ${fullCountry}`;
  dateEl.textContent = formatDate(localDate);
  currentTempEl.textContent = `${Math.round(data.main.temp)}°`;
  feelsLikeEl.textContent = `${Math.round(data.main.feels_like)}°`;
  humidityEl.textContent = `${data.main.humidity}%`;
  windValueEl.innerHTML = `${Math.round(
    data.wind.speed
  )} <span class="wind-speed">km/h</span>`;
  precipitationEl.textContent = `${Math.ceil(data.rain?.["1h"] || 0)} mm`; // round up

  // Update 7-day weekday labels
  const forecastDays = getNext7Days(localDate);
  forecastDays.forEach((dayName, index) => {
    const dayEl = document.querySelector(`.day-${index + 1}`);
    if (dayEl) dayEl.textContent = dayName;
  });

  // Populate hourly forecast dropdown starting from current day
  populateHourlyDropdown(localDate);

  // Populate hourly forecast hours
  populateHourlyForecast(localDate);
}

// Fetch 5-day forecast by city

let forecastData = null; // global variable
let hourlyForecastData = []; // stores hourly forecast from API

async function getDailyForecast(city) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Forecast not found");
    const data = await response.json();

    forecastData = data; // store API data globally
    updateDailyForecast(data); // update daily cards
    populateHourlyForSelectedDay(0); // populate today's hourly forecast
    populateHourlyDropdown(); // update dropdown starting from today
  } catch (error) {
    console.error("Forecast fetch error:", error);
  }
}

// Update daily forecast cards
function updateDailyForecast(data) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Group forecast by date
  const dailyData = {};
  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toISOString().split("T")[0];
    if (!dailyData[dayKey]) dailyData[dayKey] = [];
    dailyData[dayKey].push(item);
  });

  // Skip today, update only available days
  const dailyKeys = Object.keys(dailyData).slice(1, 6); // 5-day forecast
  dailyKeys.forEach((key, i) => {
    const dayItems = dailyData[key];
    const temps = dayItems.map((d) => d.main.temp);
    const minTemp = Math.round(Math.min(...temps));
    const maxTemp = Math.round(Math.max(...temps));

    // Most frequent weather icon
    const icons = {};
    dayItems.forEach((d) => {
      const icon = d.weather[0].icon;
      icons[icon] = (icons[icon] || 0) + 1;
    });
    const mainIcon = Object.keys(icons).reduce((a, b) =>
      icons[a] > icons[b] ? a : b
    );

    // Update HTML
    const minEl = document.querySelector(`.min-temperature-day-${i + 1}`);
    const maxEl = document.querySelector(`.max-temperature-day-${i + 1}`);
    const iconEl = document.querySelector(`.weekday-icon-day-${i + 1} img`);

    if (minEl) minEl.textContent = `${minTemp}°`;
    if (maxEl) maxEl.textContent = `${maxTemp}°`;
    if (iconEl)
      iconEl.src = `https://openweathermap.org/img/wn/${mainIcon}.png`;
  });
}

// Handle search button
button.addEventListener("click", (e) => {
  e.preventDefault();
  const city = searchInput.value.trim();
  if (city) getWeatherByCity(city);
  else alert("Please enter a city name!");
});

// On page load: get current location
window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        getWeatherByCoords(latitude, longitude);
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

// Populate hourly forecast dropdown starting from current day
function populateHourlyDropdown(currentDate) {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dropdown = document.querySelector(".hourly-forecast-dropdown select");

  // Clear existing options
  dropdown.innerHTML = "";

  const todayIndex = currentDate.getDay();

  for (let i = 0; i < 7; i++) {
    const dayIndex = (todayIndex + i) % 7;
    const option = document.createElement("option");
    option.value = days[dayIndex];
    option.textContent = days[dayIndex];
    dropdown.appendChild(option);
  }
}

// FOR THE HOURLY UPDATE
function populateHourlyForecast(currentDate) {
  const hourlyCards = document.querySelectorAll(".hourly-forecast-card");
  let currentHour = currentDate.getHours(); // 0 - 23

  hourlyCards.forEach((card, index) => {
    // Calculate hour for each card
    let hour = (currentHour + index) % 24;
    let meridian = hour >= 12 ? "PM" : "AM";
    let displayHour = hour % 12 === 0 ? 12 : hour % 12;

    // Update HTML
    const hourEl = card.querySelector(".hour");
    if (hourEl)
      hourEl.innerHTML = `${displayHour}<span class="meridian"> ${meridian}</span>`;
  });
}






// START OF SERVER-SIDE SCRIPT

// ===============================
// script.js (CORS-safe version)
// ===============================

// const button = document.querySelector(".button");
// const searchInput = document.querySelector(".search-input");

// // Elements to update
// const cityEl = document.querySelector(".city");
// const dateEl = document.querySelector(".date");
// const currentTempEl = document.querySelector(".current-temperature");
// const feelsLikeEl = document.querySelector(".feels-like-value");
// const humidityEl = document.querySelector(".humidity-value");
// const windValueEl = document.querySelector(".wind-value");
// const precipitationEl = document.querySelector(".precipitation-value");

// // Local backend server URL
// const backend = "http://localhost:3000";

// // --- Format date ---
// function formatDate(date) {
//   return date.toLocaleDateString("en-US", {
//     weekday: "long",
//     month: "short",
//     day: "numeric",
//     year: "numeric",
//   });
// }

// // --- Get next 7 weekdays ---
// function getNext7Days(startDate) {
//   const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
//   const result = [];
//   for (let i = 1; i <= 7; i++) {
//     const nextDay = new Date(startDate);
//     nextDay.setDate(startDate.getDate() + i);
//     result.push(days[nextDay.getDay()]);
//   }
//   return result;
// }

// // --- Fetch weather by coordinates (via backend) ---
// async function getWeatherByCoords(lat, lon) {
//   try {
//     const weatherRes = await fetch(`${backend}/weather?lat=${lat}&lon=${lon}`);
//     const weatherData = await weatherRes.json();

//     const cityRes = await fetch(`${backend}/city?lat=${lat}&lon=${lon}`);
//     const cityData = await cityRes.json();

//     const cityName = cityData.city || "Unknown";
//     const countryName = cityData.country || "";

//     updateUI(weatherData, cityName, countryName);
//   } catch (err) {
//     console.error("Weather fetch error:", err);
//     alert("Could not fetch weather for this location.");
//   }
// }

// // --- Fetch weather by city (forward geocoding) ---
// async function getWeatherByCity(city) {
//   try {
//     // Use Open-Meteo’s geocoding API directly (through backend)
//     const geoRes = await fetch(`${backend}/city?name=${encodeURIComponent(city)}`);
//     const geoData = await geoRes.json();

//     if (!geoData || !geoData.city) throw new Error("City not found");

//     const { lat, lon } = geoData;
//     getWeatherByCoords(lat, lon);
//   } catch (err) {
//     console.error("City fetch error:", err);
//     alert("Could not fetch weather. Try another city.");
//   }
// }

// // --- Update main UI ---
// function updateUI(data, cityName, countryName) {
//   const current = data.current;
//   const hourly = data.hourly;
//   const daily = data.daily;

//   const localDate = new Date();
//   cityEl.textContent = `${cityName}, ${countryName}`;
//   dateEl.textContent = formatDate(localDate);
//   currentTempEl.textContent = `${Math.round(current.temperature_2m)}°`;
//   feelsLikeEl.textContent = `${Math.round(current.temperature_2m)}°`; // No feels_like in Open-Meteo
//   humidityEl.textContent = `${current.relative_humidity_2m}%`;
//   windValueEl.innerHTML = `${Math.round(
//     current.windspeed_10m
//   )} <span class="wind-speed">km/h</span>`;
//   precipitationEl.textContent = `${Math.round(current.precipitation || 0)} mm`;

//   // Update next 7 days’ names
//   const forecastDays = getNext7Days(localDate);
//   forecastDays.forEach((dayName, index) => {
//     const dayEl = document.querySelector(`.day-${index + 1}`);
//     if (dayEl) dayEl.textContent = dayName;
//   });

//   updateDailyForecast(daily);
//   populateHourlyDropdown(localDate);
//   populateHourlyForecast(hourly, localDate);
// }

// // --- Update daily forecast ---
// function updateDailyForecast(daily) {
//   for (let i = 0; i < 7; i++) {
//     const minEl = document.querySelector(`.min-temperature-day-${i + 1}`);
//     const maxEl = document.querySelector(`.max-temperature-day-${i + 1}`);
//     if (minEl)
//       minEl.textContent = `${Math.round(daily.temperature_2m_min[i])}°`;
//     if (maxEl)
//       maxEl.textContent = `${Math.round(daily.temperature_2m_max[i])}°`;
//   }
// }

// // --- Populate hourly dropdown ---
// function populateHourlyDropdown(currentDate) {
//   const days = [
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//     "Saturday",
//   ];
//   const dropdown = document.querySelector(".hourly-forecast-dropdown select");
//   dropdown.innerHTML = "";
//   const todayIndex = currentDate.getDay();

//   for (let i = 0; i < 7; i++) {
//     const dayIndex = (todayIndex + i) % 7;
//     const option = document.createElement("option");
//     option.value = days[dayIndex];
//     option.textContent = days[dayIndex];
//     dropdown.appendChild(option);
//   }
// }

// // --- Populate hourly forecast (hourly cards) ---
// function populateHourlyForecast(hourly, currentDate) {
//   const hourlyCards = document.querySelectorAll(".hourly-forecast-card");
//   const currentHour = currentDate.getHours();

//   hourlyCards.forEach((card, index) => {
//     const hour = (currentHour + index) % 24;
//     const meridian = hour >= 12 ? "PM" : "AM";
//     const displayHour = hour % 12 === 0 ? 12 : hour % 12;

//     const hourEl = card.querySelector(".hour");
//     if (hourEl)
//       hourEl.innerHTML = `${displayHour}<span class="meridian"> ${meridian}</span>`;

//     const tempEl = card.querySelector(".hourly-temp");
//     if (tempEl)
//       tempEl.textContent = `${Math.round(hourly.temperature_2m[hour])}°`;
//   });
// }

// // --- Search button event ---
// button.addEventListener("click", (e) => {
//   e.preventDefault();
//   const city = searchInput.value.trim();
//   if (city) getWeatherByCity(city);
//   else alert("Please enter a city name!");
// });

// // --- On page load: get current location ---
// window.addEventListener("load", () => {
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(
//       (pos) => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
//       () => {
//         console.warn("Geolocation denied — defaulting to Lagos");
//         getWeatherByCity("Lagos");
//       }
//     );
//   } else {
//     getWeatherByCity("Lagos");
//   }
// });

