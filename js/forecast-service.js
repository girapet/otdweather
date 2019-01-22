
const forecastUrl = 'https://api.weather.gov';
const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const placeUrl = 'https://services.nationalmap.gov/arcgis/rest/services/WFS/govunits/MapServer/identify?layers=all&geometrytype=point&imagedisplay=10,10,96&tolerance=2&returnGeometry=false&f=json';

const fetchJson = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const fetchPlaceName = async (location) => {
  const extent = `${location.lng - 0.00001},${location.lat - 0.00001},${location.lng + 0.00001},${location.lat + 0.00001}`
  const json = await fetchJson(`${placeUrl}&geometry=${location.lng},${location.lat}&mapextent=${extent}`);

  const feature = {};
  json.results.forEach(f => { feature[f.layerName] = f.layerName == 'County or Equivalent' ? f.attributes.GNIS_NAME : f.value });
  const state = feature['State or Territory High-res'];

  if (!state) {
    return;
  }

  const place = feature['Incorporated Place'] || feature['Minor Civil Division'] || feature['Native American Area'] || feature['County or Equivalent'] || 'Unnamed location';
  return `${place}, ${state}`;
};

const fetchCurrent = async (location) => {
  let json = await fetchJson(`${forecastUrl}/points/${location.lat},${location.lng}/stations`);

  if (!json.features) {
    return;
  }

  const station = json.features[0].properties.stationIdentifier;
  json = await fetchJson(`${forecastUrl}/stations/${station}/observations`);
  const current = json.features[0].properties;
  let wind = '---';

  if (current.windSpeed.value === 0) {
    wind = 'Calm';
  }
  else if (current.windSpeed.value !== null || current.windDirection.value !== null) {
    const d = Math.floor((current.windDirection.value / 45 + 0.5) % 8);
    const s = Math.round(current.windSpeed.value * 2.2369356);
    wind = `${direction[d]} ${speed}`;
  }

  return {
    name: 'Currently',
    temperature: Math.round(current.temperature.value * 1.8 + 32),
    wind,
    icon: current.icon,
    description: current.textDescription
  }
};

const fetchForecast = async (location) => {
  const json = await fetchJson(`${forecastUrl}/points/${location.lat},${location.lng}/forecast`);

  if (!json.properties) {
    return;
  }

  const period = json.properties.periods;
  const response = [];

  for (let i = 0; i < 6; i++) {
    const speed = period[i].windSpeed.replace(' to ', '-').replace(' mph', '');

    response.push({
      name: period[i].name,
      temperature: period[i].temperature,
      wind: `${period[i].windDirection} ${speed}`,
      icon: period[i].icon,
      description: period[i].shortForecast
    });
  }

  return response;
};

const forecastService = {
  fetch: async (location) => {
    const placeName = await fetchPlaceName(location);
    const forecast = await fetchForecast(location);
    const current = await fetchCurrent(location);

    if (!placeName || !forecast || !current) {
      return {};
    }

    forecast.unshift(current);
    return { placeName, forecast };
  }
};

export default forecastService;
