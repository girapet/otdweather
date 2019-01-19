import precipitationLayer from './precipitation-layer.js';
import forecastService from './forecast-service.js';

let location;

const updateForecast = async () => {
  const forecast = await forecastService.fetch(location);

  for (let i = 0; i < forecast.length; i++) {
    const entry = document.getElementById(`forecast${i}`);
    entry.querySelector('.name').innerHTML = forecast[i].name;
    entry.querySelector('.temperature').innerHTML = `&nbsp;${forecast[i].temperature}°`;
    entry.querySelector('.wind').innerHTML = forecast[i].wind;

    const icon = entry.querySelector('.icon');
    icon.src = forecast[i].icon;
    icon.title = forecast[i].description;
  }
};

const map = L.map('map', { fadeAnimation: false, zoomControl: false }).setView([42.37,-71.10], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>'
}).addTo(map);

precipitationLayer.addTo(map);

navigator.geolocation.getCurrentPosition(async (pos) => {
  location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
  await updateForecast();
});

navigator.geolocation.watchPosition(async (pos) => {
  const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };

  if (L.latLng(loc).distanceTo(location) > 2000) {
    location = loc;
    await updateForecast();
  }
});
