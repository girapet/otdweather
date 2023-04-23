const maxLayers = 7;
const intervalMilliseconds = 600000;

const toQuery = (params) => {
  return Object.keys(params).map((k) => `${k}=${params[k]}`).join('&');
};

const nowCoastUrl = 'https://nowcoast.noaa.gov/geoserver/weather_radar/wms';
const nowCoastParams = {
  SERVICE: 'WMS',
  VERSION: '1.3.0',
  REQUEST: 'GetMap',
  FORMAT: 'image%2Fpng8',
  TRANSPARENT: 'true',
  LAYERS: 'base_reflectivity_mosaic',
  STYLES: '',
  CRS: 'EPSG%3A3857',
  WIDTH: '{sx}',
  HEIGHT: '{sy}',
  BBOX: '{minx}%2C{miny}%2C{maxx}%2C{maxy}'
};
const getTemplate = (t) => `${nowCoastUrl}?${toQuery(nowCoastParams)}&time=${(new Date(t)).toISOString()}`;

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
