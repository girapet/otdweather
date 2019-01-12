
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

const map = L.map('map', { fadeAnimation: false }).setView([42.37,-71.10], 7);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>'
}).addTo(map);

initWeatherLayers();
