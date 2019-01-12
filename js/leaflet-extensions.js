
L.ShingleLayer = L.Layer.extend({
  getEvents: function () {
    var events = {
      dragend: this._dragEnd,
      zoom: this._animateZoom
    };

    if (this._zoomAnimated) {
      events.zoomanim = this._animateZoom;
      events.zoomend = this._zoomEnd;
      events.moveend = this._moveEnd;
    }

    return events;
  },

  hide: function () {
    this._container.style.visibility = 'hidden';
  },

  initialize: function (url, options) {
    this._url = url;
    L.setOptions(this, {
      pane: 'tilePane',
      boundsFormat: 'projected',  // 'projected' or 'latlng'
      preserveOnPan: false,
      visibility: 'visible',
      zIndex: 1
    });
    L.setOptions(this, options);
    this._shingles = [];
    this._isLoading = false;
  },

  isLoading: function () {
    return this._isLoading;
  },

  onAdd: function (map) {
    if (!this._container) {
      this._container = L.DomUtil.create('div', 'leaflet-layer', this.getPane());

      if (this.options.hasOwnProperty('zIndex')) {
        this._container.style.zIndex = this.options.zIndex;
      }

      this._container.style.visibility = this.options.visibility;
    }

    this._update(true);
  },

  onRemove: function (map) {
    L.DomUtil.remove(this._container);
    this._container = null;
  },

  redraw: function () {
    if (this._map) {
      this._update(true);
    }

    return this;
  },

  show: function () {
    this._container.style.visibility = 'visible';
  },

  _animateZoom: function (e) {
    var map = this._map;
    var zoom = e.zoom || map.getZoom();
    var center = e.center || map.getCenter();

    for (var i = 0; i < this._shingles.length; ++i) {
      var img = this._shingles[i];
      var scale = Math.pow(2, zoom - img.data.level);

      var nw = img.data.bounds.getNorthWest();
      var se = img.data.bounds.getSouthEast();

      var position = map._latLngToNewLayerPoint(nw, zoom, center);
      var size = map._latLngToNewLayerPoint(se, zoom, center)._subtract(position);

      L.DomUtil.setTransform(img, position, scale);
    }
  },

  _createImage: function (size) {
    var img = L.DomUtil.create('img', 'leaflet-shingle' + (this._zoomAnimated ? ' leaflet-zoom-animated' : ''));
    img.style.position = 'absolute';
    img.style.width = size.x + 'px';
    img.style.height = size.y + 'px';
    img.galleryimg = 'no';
    img.data = {};

    if (this.options.hasOwnProperty('opacity')) {
      img.style.opacity = this.options.opacity;
    }

    img.onselectstart = img.onmousemove = L.Util.falseFn;
    img.onload = this._onLoad;
    img.ondragstart = function () { return false; };

    return img;
  },

  _dragEnd: function () {
    this._dragged = true;
  },

  _getShingleUrl: function (size, bbox) {
    var data = {
      sx: size.x,
      sy: size.y,
      minx: bbox[0],
      miny: bbox[1],
      maxx: bbox[2],
      maxy: bbox[3]
    };

    return L.Util.template(this._url, L.extend(data, this.options));
  },

  _moveEnd: function () {
    if (!this._dragged && !this._zoomed) {
      this._update(true);
      return;
    }

    delete this._dragged;
    delete this._zoomed;
    var layer = this;

    if (layer._changeHandle) {
      clearTimeout(layer._changeHandle);
    }

    layer._changeHandle = setTimeout(function () {
      delete layer._changeHandle;
      layer._update();
    }, 500);
  },

  _onLoad: function () {
    var layer = this.data.layer;
    var zoom = layer._map.getZoom();

    if (this.data.level === zoom) {
      layer._container.appendChild(this);

      for (var i = layer._shingles.length - 1; i >= 0; --i) {
        var img = layer._shingles[i];

        if (img.data.level !== zoom || this.data.reset || !layer.options.preserveOnPan) {
          layer._container.removeChild(img);
          layer._shingles.splice(i, 1);
        }
      }

      delete this.data.reset;
      layer._shingles.push(this);
    }

    layer._isLoading = false;
    layer.fire('load');
  },

  _update: function (reset) {
    if (!this._map || !this._url) {
      return;
    }

    var map = this._map;
    var size = map.getSize();

    var img = this._createImage(size);
    img.data.layer = this;
    img.data.level = map.getZoom();
    img.data.reset = reset;

    var position = L.point(0, 0);
    var nw = map.containerPointToLatLng(position);
    var se = map.containerPointToLatLng(size);
    img.data.bounds = L.latLngBounds(L.latLng(se.lat, nw.lng), L.latLng(nw.lat, se.lng));
    var bbox = [ nw.lng, se.lat, se.lng, nw.lat ];

    if (this.options.boundsFormat === 'projected') {
      se = map.options.crs.project(se);
      nw = map.options.crs.project(nw);
      bbox = [ nw.x, se.y, se.x, nw.y ];
    }

    position = map.containerPointToLayerPoint(position);
    L.DomUtil.setPosition(img, position);

    this._isLoading = true;
    img.src = this._getShingleUrl(size, bbox);
  },

  _zoomEnd: function () {
    this._zoomed = true;
  }
});

L.shingleLayer = function (url, options) {
  return new L.ShingleLayer(url, options);
};
