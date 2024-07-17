
const forecastUrl = 'https://api.weather.gov';
const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const identifySite = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
const identifyParams = 'geometrytype=esriGeometryPoint&sr=4326&imagedisplay=100,100,96&tolerance=2&returnGeometry=false&f=json';
const stateCountyUrl = `${identifySite}/State_County/MapServer/identify?layers=all:0,1&${identifyParams}`;
const placeUrl = `${identifySite}/Places_CouSub_ConCity_SubMCD/MapServer/identify?layers=all:1,4&${identifyParams}`;

let previousLocation = { lng: -180, lat: -90 };

const fetchJson = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const roundToPlaces = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchPlaceName = async (location) => {
  const lng = roundToPlaces(location.lng, 6);
  const lat = roundToPlaces(location.lat, 6);

  if (lng === previousLocation.lng && lat === previousLocation.lat) {
    return previousLocation.name;
  }

  const minLng = roundToPlaces(lng - 0.0001, 6);
  const minLat = roundToPlaces(lat - 0.0001, 6);
  const maxLng = roundToPlaces(lng + 0.0001, 6);
  const maxLat = roundToPlaces(lat + 0.0001, 6);
  const pointParams = `geometry=${lng},${lat}&mapextent=${minLng},${minLat},${maxLng},${maxLat}`;

  let name;
  let json = await fetchJson(`${stateCountyUrl}&${pointParams}`);

  if (json.results) {
    const feature = {};
    json.results.forEach(f => { feature[f.layerName] = f.layerName == 'States' ? f.attributes.STUSAB : f.value });

    if (feature['States']) {
      json = await fetchJson(`${placeUrl}&${pointParams}`);

      if (json.results) {
        json.results.forEach(f => { feature[f.layerName] = f.value });
      }

      const place = feature['Incorporated Places'] || feature['County Subdivisions'] || feature['Counties'] || 'Unnamed location';
      name = `${place}, ${feature['States']}`;
    }
  }

   previousLocation = { lat, lng, name };
   return name;
};

const fetchGridPoint = async (location) => {
  const json = await fetchJson(`${forecastUrl}/points/${location.lat},${location.lng}`);

  if (!json.properties) {
    return;
  }

  const { gridId, gridX, gridY } = json.properties;
  return `${gridId}/${gridX},${gridY}`;
};

const fetchCurrent = async (gridPoint) => {
  let json = await fetchJson(`${forecastUrl}/gridpoints/${gridPoint}/stations`);

  if (!json.features) {
    return;
  }

  const station = json.features[0].properties.stationIdentifier;
  json = await fetchJson(`${forecastUrl}/stations/${station}/observations`);
  const observations = json.features.map(f => f.properties).sort((a, b) => a.timestamp > b.timestamp ? -1 : 1);
  const current = observations.filter(o => o.temperature.value !== null)[0];
  
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

const fetchForecast = async (gridPoint) => {
  const json = await fetchJson(`${forecastUrl}/gridpoints/${gridPoint}/forecast`);

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
      icon: `${period[i].icon}`,
      description: period[i].shortForecast
    });
  }

  return response;
};

const forecastService = {
  fetch: async (location) => {
    const gridPoint = await fetchGridPoint(location);

    if (!gridPoint) {
      return {};
    }

    let [placeName, forecast, current] = await Promise.all([
      fetchPlaceName(location),
      fetchForecast(gridPoint),
      fetchCurrent(gridPoint)
    ]);
    
    if (!placeName || !forecast || !current) {
      await wait(2000);

      if (!placeName) {
        placeName = await fetchPlaceName(location);
      }

      if (!forecast) {
        forecast = await fetchForecast(gridPoint);
      }

      if (!current) {
        current = await fetchCurrent(gridPoint);
      }

      if (!placeName || !forecast || !current) {
        return {};
      }
    }

    forecast.unshift(current);
    return { placeName, forecast };
  }
};

export default forecastService;
