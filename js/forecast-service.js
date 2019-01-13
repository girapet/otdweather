
const forecastUrl = 'https://api.weather.gov';
const direction = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const fetchJson = async (url) => {
  const response = await fetch(url);
  return await response.json();
};

const fetchCurrent = async (point) => {
  let json = await fetchJson(`${forecastUrl}/points/${point}/stations`);
  const station = json.features[0].properties.stationIdentifier;

  json = await fetchJson(`${forecastUrl}/stations/${station}/observations`);
  const current = json.features[0].properties;
  const speed = Math.round(current.windSpeed.value * 2.2369356);
  const d = Math.floor((current.windDirection.value / 45 + 0.5) % 8);

  return {
    name: 'Currently',
    temperature: Math.round(current.temperature.value * 1.8 + 32),
    wind: `${direction[d]} ${speed}`,
    icon: current.icon,
    description: current.textDescription
  }
};

const fetchForecast = async (point) => {
  const json = await fetchJson(`${forecastUrl}/points/${point}/forecast`);
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
    const point = `${location.lat},${location.lng}`;
    const forecast = await fetchForecast(point);
    const current = await fetchCurrent(point);
    forecast.unshift(current);
    return forecast;
  }
};

export default forecastService;
