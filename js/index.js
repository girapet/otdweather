
const nowCoastUrl = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer';
const nowCoastParams = 'layers=3&bbox={minx}%2C{miny}%2C{maxx}%2C{maxy}&size=256%2C256&f=image&format=png&transparent=true';
const getWeatherTemplate = (t) => `${nowCoastUrl}/export?time=${t}&${nowCoastParams}`;
const weatherOptions = {
  attribution: '© <a href="https://www.weather.gov">NWS</a>',
  opacity: 0.5,
  fadeDuration: 400
};

const weather = {
  layers: [],
  quantity: 5,
  time: new Date().valueOf()
};

const weatherCycle = () => {
  if (weather.layers[weather.current].isLoading()) {
    setTimeout(weatherCycle, 400);
    return;
  }

  const old = weather.current;
  weather.current = (weather.current + 1) % weather.quantity;
  weather.layers[weather.current].addTo(map);
  setTimeout(() => weather.layers[old].removeFrom(map), 1);
  setTimeout(weatherCycle, weather.current === weather.quantity - 1 ? 3000 : 400);
};

const initWeatherLayers = () => {
  if (weather.layers.length > 0) {
    weather.layers[0].off('load', initWeatherLayers);

    if (weather.layers.length > 1) {
      weather.layers[0].removeFrom(map);
      weather.layers[0].options.opacity = 0.5;
    }
  }

  if (weather.layers.length < weather.quantity) {
    const template = getWeatherTemplate(weather.time - weather.layers.length * 600000);
    const opacity = weather.layers.length === 0 ? weatherOptions.opacity : 0.0001;
    const layer = L.tileLayer(template, { ...weatherOptions, opacity });
    layer.on('load', initWeatherLayers);
    weather.layers.unshift(layer);
    layer.addTo(map);
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
