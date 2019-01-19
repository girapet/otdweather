const maxLayers = 7;
const intervalMilliseconds = 600000;

const nowCoastUrl = 'https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer';
const nowCoastParams = 'layers=3&bbox={minx}%2C{miny}%2C{maxx}%2C{maxy}&size={sx}%2C{sy}&f=image&format=png&transparent=true';
const getTemplate = (t) => `${nowCoastUrl}/export?time=${t}&${nowCoastParams}`;
const layerOptions = {
  attribution: '© <a href="https://www.weather.gov">NWS</a>',
  opacity: 0.35
};

let map;
const layers = [];
let time = new Date().valueOf();
let current;

const cycle = () => {
  const now = new Date().valueOf();

  if (time < now - intervalMilliseconds) {
    const layer = L.shingleLayer(getTemplate(now), { ...layerOptions, visibility: 'hidden' });
    layers.push(layer.addTo(map));
    layers.shift().removeFrom(map);
    current = (current + maxLayers - 1) % maxLayers;
    time = now;
  }

  const old = current;
  current = (current + 1) % maxLayers;
  layers[current].show();
  layers[old].hide();
  setTimeout(cycle, current === maxLayers - 1 ? 3000 : 400);
};

const initialize = () => {
  if (layers.length > 0) {
    layers[0].off('load', initialize);
  }

  if (layers.length < maxLayers) {
    const t = time - layers.length * intervalMilliseconds;
    const visibility = layers.length === 0 ? 'visible' : 'hidden';
    const layer = L.shingleLayer(getTemplate(t), { ...layerOptions, visibility });
    layer.on('load', initialize);
    layers.unshift(layer.addTo(map));
    return;
  }

  current = layers.length - 1;
  cycle();
};

export default {
  addTo(m) {
    map = m;
    initialize();
  }
};
