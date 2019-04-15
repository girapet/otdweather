
const forecastUrl = 'https://api.weather.gov';
const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const placeUrl = 'https://carto.nationalmap.gov/wfs/rest/services/govunits/MapServer/identify?layers=all:19,20,21,22,23,29,35,37&geometrytype=esriGeometryPoint&sr=4326&imagedisplay=100,100,96&tolerance=2&returnGeometry=false&f=json';

let previousLocation = { lng: -180, lat: -90 };

const fetchJson = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const roundToPlaces = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

const fetchPlaceName = async (location) => {
  if (location.lng === previousLocation.lng && location.lat === previousLocation.lat) {
    return previousLocation.name;
  }

  const lng = roundToPlaces(location.lng, 6);
  const lat = roundToPlaces(location.lat, 6);
  const minLng = roundToPlaces(lng - 0.0001, 6);
  const minLat = roundToPlaces(lat - 0.0001, 6);
  const maxLng = roundToPlaces(lng + 0.0001, 6);
  const maxLat = roundToPlaces(lat + 0.0001, 6);
  const json = await fetchJson(`${placeUrl}&geometry=${lng},${lat}&mapextent=${minLng},${minLat},${maxLng},${maxLat}`);

  let name = '[unknown location]';

  if (json.results) {
    const feature = {};
    json.results.forEach(f => { feature[f.layerName] = f.layerName == 'County or Equivalent' ? f.attributes.GNIS_NAME : f.value });
    const state = feature['State or Territory Large-Scale'];
  
    if (state) {
      const place = feature['Incorporated Place'] || feature['Unincorporated Place'] || feature['Minor Civil Division'] || feature['Native American Area'] || feature['National Park'] || feature['Military Reserve'] || feature['County or Equivalent'] || 'Unnamed location';
      name = `${place}, ${state}`;
    }
  }

  previousLocation = { ...location, name };
  return name;
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
    const speed = Math.round(current.windSpeed.value * 2.2369356);
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
    const [placeName, forecast, current] = await Promise.all([
      fetchPlaceName(location),
      fetchForecast(location),
      fetchCurrent(location)
    ]);

    if (!placeName || !forecast || !current) {
      return {};
    }

    forecast.unshift(current);
    return { placeName, forecast };
  }
};

export default forecastService;
