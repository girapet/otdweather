L.TileLayer.prototype.getTileUrl = function (coords) {
  var d = 20037508.342787;
  var z = this._getZoomForUrl();
  var w = d / Math.pow(2, z - 1);
  var minx = -d + coords.x * w;
  var miny = d - (coords.y + 1) * w;

  var data = {
    r: L.Browser.retina ? '@2x' : '',
    s: this._getSubdomain(coords),
    x: coords.x,
    y: coords.y,
    z: z,
    minx: minx,
    miny: miny,
    maxx: minx + w,
    maxy: miny + w
  };

  if (this._map && !this._map.options.crs.infinite) {
    var invertedY = this._globalTileRange.max.y - coords.y;

    if (this.options.tms) {
      data['y'] = invertedY;
    }

    data['-y'] = invertedY;
  }

  return L.Util.template(this._url, L.extend(data, this.options));
};

const map = L.map('map').setView([42.37,-71.10], 9);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors, © <a href="https://carto.com">CARTO</a>'
}).addTo(map);

L.tileLayer('https://nowcoast.noaa.gov/arcgis/rest/services/nowcoast/radar_meteo_imagery_nexrad_time/MapServer/export?layers=3&bbox={minx}%2C{miny}%2C{maxx}%2C{maxy}&size=256%2C256&f=image&format=png&transparent=true', {
  attribution: '© <a href="https://www.weather.gov">NWS</a>',
  opacity: 0.5
}).addTo(map);
