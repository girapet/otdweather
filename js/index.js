
const forecastUrl = 'https://api.weather.gov';
const nowCoastUrl = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer';
const nowCoastParams = 'layers=3&bbox={minx}%2C{miny}%2C{maxx}%2C{maxy}&size={sx}%2C{sy}&f=image&format=png&transparent=true';
const getWeatherTemplate = (t) => `${nowCoastUrl}/export?time=${t}&${nowCoastParams}`;
const weatherOptions = {
  attribution: '© <a href="https://www.weather.gov">NWS</a>',
  opacity: 0.5
};

const weather = {
  layers: [],
  maxLayers: 7,
  intervalMilliseconds: 600000,
  time: new Date().valueOf()
};

const weatherCycle = () => {
  const now = new Date().valueOf();

  if (weather.time < now - weather.intervalMilliseconds) {
    const layer = L.shingleLayer(getWeatherTemplate(now), { ...weatherOptions, visibility: 'hidden' });
    weather.layers.push(layer.addTo(map));
    weather.layers.shift().removeFrom(map);
    weather.current = (weather.current + weather.maxLayers - 1) % weather.maxLayers;
    weather.time = now;
  }

  const old = weather.current;
  weather.current = (weather.current + 1) % weather.maxLayers;
  weather.layers[weather.current].show();
  weather.layers[old].hide();
  setTimeout(weatherCycle, weather.current === weather.maxLayers - 1 ? 3000 : 400);
};

const initWeatherLayers = () => {
  if (weather.layers.length > 0) {
    weather.layers[0].off('load', initWeatherLayers);
  }

  if (weather.layers.length < weather.maxLayers) {
    const time = weather.time - weather.layers.length * weather.intervalMilliseconds;
    const visibility = weather.layers.length === 0 ? 'visible' : 'hidden';
    const layer = L.shingleLayer(getWeatherTemplate(time), { ...weatherOptions, visibility });
    layer.on('load', initWeatherLayers);
    weather.layers.unshift(layer.addTo(map));
    return;
  }

  weather.current = weather.layers.length - 1;
  weatherCycle();
};

const map = L.map('map', { fadeAnimation: false, zoomControl: false }).setView([42.37,-71.10], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>'
}).addTo(map);

initWeatherLayers();

navigator.geolocation.getCurrentPosition(async (pos) => {
  let response = await fetch(`${forecastUrl}/points/${pos.coords.latitude},${pos.coords.longitude}/stations`);
  let json = await response.json();
  const station = json.features[0].properties.stationIdentifier;

  response = await fetch(`${forecastUrl}/stations/${station}/observations`);
  json = await response.json();
  const current = json.features[0].properties;

  const temperature = Math.round(current.temperature.value * 1.8 + 32);
  let windSpeed = Math.round(current.windSpeed.value * 2.2369356);
  const windIndex = Math.floor((current.windDirection.value / 45 + 0.5) % 8);
  const windDir = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][windIndex];
  let entry = document.getElementById('current');
  let img = entry.querySelector('img');
  img.src = current.icon.replace('medium', 'large');
  entry.querySelector('.temp').innerHTML = `&nbsp;${temperature}°`;
  entry.querySelector('.cond').innerHTML = `${current.textDescription}`;
  entry.querySelector('.wind').innerHTML = `${windDir} ${windSpeed}`;

  response = await fetch(`${forecastUrl}/points/${pos.coords.latitude},${pos.coords.longitude}/forecast`);
  json = await response.json();
  const forecast = json.properties;

  for (let i = 0; i < 3; i++) {
    const period = forecast.periods[i];
    windSpeed = period.windSpeed.replace(' to ', '-').replace(' mph', '');
    entry = document.getElementById(`next${i}`);
    img = entry.querySelector('img');
    img.src = period.icon.replace('medium', 'large');
    entry.querySelector('.period').innerHTML = period.name;
    entry.querySelector('.temp').innerHTML = `&nbsp;${period.temperature}°`;
    entry.querySelector('.cond').innerHTML = period.shortForecast;
    entry.querySelector('.wind').innerHTML = `${period.windDirection} ${windSpeed}`;
  }
});
