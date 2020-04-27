var map, mly;						// Leaflet and Mapillary objects
var markers = [];					// array of all new markers
var mapillaryMarkers = [] // array of all new Mapillary markers
var selectedMarker;					// currently selected marker
var beamIcon, beamMarker, redIcon;	// custom icons
var clickTimer, swallowClick;		// double-click handling

// =========================================================================
// Initialise the app

function initialise() {

  // Standard layers
  map = L.map('map', {doubleClickZoom: false}).setView([30, 20], 2);
  var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: "<a href='https://osm.org/copyright' target='_blank'>&copy; OpenStreetMap contributors</a>",
    maxNativeZoom: 19,
    maxZoom: 22
  }).addTo(map);
  var bing = L.tileLayer.bing("Arzdiw4nlOJzRwOz__qailc8NiR31Tt51dN2D7cm57NrnceZnCpgOkmJhNpGoppU");
  var esri = L.tileLayer("https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: "ESRI",
    maxNativeZoom: 18,
    maxZoom: 22
  });

  var mapillaryRaster = L.tileLayer('https://d6a1v2w10ny40.cloudfront.net/v0.1/{z}/{x}/{y}.png', {
    attribution: "<a href='https://mapillary.com/' target='_blank'>&copy; Mapillary</a>",
    maxNativeZoom: 18,
    maxzoom: 24
  }).addTo(map);

  // Initialise Leaflet
  L.Control.geocoder({expand: 'click',}).addTo(map);
  L.control.layers({"OSM": osm, "Bing aerial": bing, "ESRI Clarity": esri}, {"Mapillary": mapillaryRaster}).addTo(map);
  map.on('click', clickMap);
  map.on('dblclick', doubleClickMap);

  // Initialise icons
  beamIcon = L.icon({iconUrl: 'images/location-0.png', iconSize: [48, 48], iconAnchor: [24, 24]});
  Object.assign({}, L.Icon.Default.prototype.options);
  redIcon = L.icon({
    iconUrl: 'images/marker_red.png', iconRetinaUrl: 'images/marker_red_2x.png',
    shadowUrl: "images/marker-shadow.png", iconSize: [25, 41], iconAnchor: [12, 41],
    popupAnchor: [1, -34], tooltipAnchor: [16, -28], shadowSize: [41, 41]
  });

  // Initialise Mapillary
  mly = new Mapillary.Viewer(
    'mapillary',
    'ZXZyTWZwdkg1WFBIZ2hGVEkySlFiUTpjZWJmMWU3MTViMGMwOTY3',
    null,
    {
      component: {
        marker: {
          visibleBBoxSize: 100,
        },
        mouse: {
          doubleClickZoom: false,
        },
      },
    }
  );
  // activate hover effect
  var hover = document.createElement("script");
  n = 0 // marker ID count
  hover.type = "text/javascript";
  hover.src = "hover.js";
  document.head.appendChild(hover);
  mly.setRenderMode(Mapillary.RenderMode.Letterbox);
  window.addEventListener("resize", function () {
    mly.resize();
  });
  mly.on('dblclick', doubleClickMapillary);
  mly.on('nodechanged', mapillaryMoved);
  mly.on('bearingchanged', mapillaryRotated);

}

function flash(str) {
  u('#flash').first().innerHTML = str;
  u('#flash').first().style.display = 'block';
  setTimeout(function () {
    u('#flash').first().style.display = 'none';
  }, 700);
}

// =========================================================================
// Click events

// User clicked the Leaflet map, so pan to that location in Mapillary
function clickMap(event) {
  u('#introduction').remove();
  clickTimer = setTimeout(function () {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    swallowClick = false;
    mly.moveCloseTo(event.latlng.lat, event.latlng.lng);
  }, 200);
}

// User double-clicked either the Leaflet map or Mapillary to add a marker
function doubleClickMap(event) {
  if (clickTimer) {
    clearTimeout(clickTimer);
    swallowClick = true;
    clickTimer = null;
  }
  createNewMarkerAt(event.latlng);
}

function doubleClickMapillary(event) {
  var ll = event.latLon;
  if (ll == null) {
    flash("Couldn't find position");
    console.log(event);
    return;
  }
  createNewMarkerAt([ll.lat, ll.lon]);
}

function createNewMarkerAt(ll) {
  currentMarkerId = n;
  var mapillaryMarker = new Mapillary.MarkerComponent.SimpleMarker(
    n,
    {lat: ll[0], lon: ll[1]},
    {interactive: true});
  var m = L.marker(ll, {draggable: true}).addTo(map);
  m.on('click', clickMarker);
  markers.push(m);
  mapillaryMarkers.push(mapillaryMarker);
  m.id = n;
  console.log(m.id);
  clickMarker(m);
  n += 1;
  handleMapMarkerDrag(m);
}

// User navigated somewhere on the Mapillary viewer
function mapillaryMoved(node) {
  var loc = node.computedLatLon ? [node.computedLatLon.lat, node.computedLatLon.lon] : [node.latLon.lat, node.latLon.lon];
  if (beamMarker) {
    beamMarker.setLatLng(loc);
  } else {
    beamMarker = L.marker(loc, {icon: beamIcon}).addTo(map);
  }
}

function mapillaryRotated(angle) {
  if (beamMarker) {
    beamMarker.setRotationAngle(angle);
  }
}

// =========================================================================
// Tag/marker editing

// User clicked a Leaflet marker, so open it for editing
// (open the tag table editor, plus a delete button)
function clickMarker(e) {
  deselectCurrentMarker();
  var markerComponent = mly.getComponent('marker');
  var marker = e.target || e;
  marker.options.tags = marker.options.tags || {};
  selectedMarker = marker;
  marker.setIcon(redIcon);
  markerId = marker.id;
  currentMarkerId = markerId;
  markerComponent.add([mapillaryMarkers[currentMarkerId]]);
}

// Deselect currently selected marker
function deselectCurrentMarker() {
  if (!selectedMarker) return;
  selectedMarker.setIcon(L.Icon.Default.prototype);
  selectedMarker = null;
  currentMarkerId = null;
  markerComponent.removeAll();
}
