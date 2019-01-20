import precipitationLayer from './precipitation-layer.js';
import forecastService from './forecast-service.js';

let map;
let marker;
let location;
let myLocationButton;
let fullExtentButton;

const setLocation = async (e) => {
  location = e.latlng;
  marker.setLatLng(location);
  await updateForecast();
};

const createMapButton = (map, className, title, handler) => {
  const MapButton = L.Control.extend({
    onAdd: function () {
      const button = L.DomUtil.create('div');
      button.className = `map-button ${className}`;
      button.title = title;
      L.DomEvent.on(button, 'click', handler);
      L.DomEvent.disableClickPropagation(button);
      return button;
    }
  })

  return new MapButton({ position: 'topleft' }).addTo(map);
};

const initializeMap = () => {
  map = L.map('map', { fadeAnimation: false, zoomControl: false }).setView(location, 6);
  map.on('click', setLocation);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>'
  }).addTo(map);

  precipitationLayer.addTo(map);
  marker = L.circleMarker(location, {
    color: '#802020',
    weight: 2,
    fillColor: '#F06060',
    fillOpacity: 1,
    radius: 6
  }).addTo(map);

  myLocationButton = createMapButton(map, 'my-location', 'Go to my location', goToUserLocation);
  fullExtentButton = createMapButton(map, 'full-extent', 'Return to location', () => map.setView(location, 6));
};

const getForecastEntries = () => [...document.getElementById('bar').childNodes].map(c => c.querySelector('div'));

const updateForecast = async () => {
  const header = document.getElementById('header');
  header.innerHTML = 'loading forecast...';

  const f = await forecastService.fetch(location);
  header.innerHTML = f.placeName || 'Forecast not available';

  if (!f.forecast) {
    getForecastEntries().forEach(e => { e.style.visibility = 'hidden' });
    return;
  }

  for (let i = 0; i < f.forecast.length; i++) {
    const entry = document.getElementById(`forecast${i}`).querySelector('div');
    entry.style.visibility = 'visible';
    entry.querySelector('.name').innerHTML = f.forecast[i].name;
    entry.querySelector('.temperature').innerHTML = `&nbsp;${f.forecast[i].temperature}°`;
    entry.querySelector('.wind').innerHTML = f.forecast[i].wind;

    const icon = entry.querySelector('.icon');
    icon.src = f.forecast[i].icon;
    icon.title = f.forecast[i].description;
    icon.style.display = 'inline-block';

    const desc = entry.querySelector('.desc');
    desc.innerHTML = f.forecast[i].description;
    desc.style.display = 'none';
  }
};

const goToUserLocation = async () => {
  navigator.geolocation.getCurrentPosition(async (pos) => {
    location = { lat: pos.coords.latitude, lng: pos.coords.longitude };

    if (!map) {
      initializeMap();
    }
    else {
      map.setView(location, 6);
      marker.setLatLng(location);
    }

    await updateForecast();
  });

  return false;
};

const descriptionTouch = (e) => {
  const parent = e.target.parentNode;
  const sibling = e.target.className === 'icon' ? parent.querySelector('.desc') :  parent.querySelector('.icon');
  e.target.style.display = 'none';
  sibling.style.display = 'inline-block';
};

getForecastEntries().forEach(e => {
  e.querySelector('.icon').addEventListener('click', descriptionTouch);
  e.querySelector('.desc').addEventListener('click', descriptionTouch);
});

goToUserLocation();
