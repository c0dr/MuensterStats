startLoading();


// Basic map configuration
var lastClickedLayer, selectedFilter = {group: 'kids', type: 'Absolute'};
var map = L.map('map').setView([51.962, 7.629], 11);

L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);


//Info panel which shows the population data on hover

var info = L.control();

info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};

info.update = function (props) {
  this._div.innerHTML = "<h4>Bevölkerungsanteile</h4>" +  (props ?
    '<h3>' + props.BezirkName + '</h3>'+
    '<table class="table table-bordered table-striped">' + '<tr> <th>Altergruppe</th><th>#</th><th>%</th>'+

    '<tr><td>Kinder 0-9 </td><td>' +props.kidsAbsolute + '</td><td>'+ (props.kidsRelative*100).toFixed(0) + ' %</td></tr>' +
    '<tr><td>Teenager 10-19: </td><td>' + props.teenAbsolute + '</td><td>' + (props.teenRelative*100).toFixed(0) + ' %</td></tr>' +
    '<tr><td>Erwachsene 20-69: </td><td>' + props.adultAbsolute + '</td><td>' + (props.adultRelative*100).toFixed(0) + ' %</td></tr>'+
    '<tr><td>Senioren ab 70: </td><td>' + props.seniorAbsolute + '</td><td>'+ (props.seniorRelative*100).toFixed(0) + ' %</td></tr>' +
    '<tr><td></td><td>' + props.Gesamt + '</td><td>100%</td></tr></table>'

    : "Hover über einen Stadtteil");
};

info.addTo(map);


//Event functions for districts

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera) {
    layer.bringToFront();
  }

  info.update(layer.feature.properties);
}

function resetHighlight(e) {

  //TODO: Use resetStyle instead (which doesnt seem to work) instead of this workaround
  //geojsonLayer.resetStyle(e.target);
  var layer = e.target;
  layer.setStyle({
    weight: 0.5,
  });

  info.update();
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: clickUpdate
   });
}


//To make it work on touch devices
function clickUpdate(e) {

  if(lastClickedLayer) {

    resetHighlight(lastClickedLayer);

    if(e.target._leaflet_id === lastClickedLayer.target._leaflet_id) {
      lastClickedLayer = undefined;
    } else {
      lastClickedLayer = e;
      highlightFeature(e);
    }

  } else {
    lastClickedLayer = e;
    highlightFeature(e);
  }

}


//Load districts
var geojsonLayer = new L.GeoJSON.AJAX("data/districts.json", {onEachFeature: onEachFeature});

geojsonLayer.on('data:loaded', loadData);
geojsonLayer.addTo(map);


//Variables for Choreoplet

var hues = [
'#eff3ff',
'#bdd7e7',
'#6baed6',
'#3182bd',
'#08519c'];

// The names of variables of the data that can be choosen for the choreoplet

var variables = [
'kidsAbsolute',
'kidsRelative',

'teenAbsolute',
'teenRelative',

'adultAbsolute',
'adultRelative',

'seniorAbsolute',
'seniorRelative'];

// Collect the range of each variable over the full set, so
// we know what to color the brightest or darkest.
var ranges = {};

for (var i = 0; i < variables.length; i++) {
  ranges[variables[i]] = { min: Infinity, max: -Infinity };
}


//Load stats
function loadData() {
  $.getJSON('data/output_wo.geojson').done(function(data) {
    joinData(data, geojsonLayer);
  });
}

function joinData(data, layer) {
    // First, get the districtGeoJSON data for reference.
    var msGeoJSON = geojsonLayer.toGeoJSON(), byID = {};

    // Rearrange it so that instead of being a big array,
    // it's an object that is indexed by the state name,
    // that we'll use to join on.
    for (var i = 0; i < msGeoJSON.features.length; i++) {

        byID[msGeoJSON.features[i].properties.Nr] = msGeoJSON.features[i];
    }
    for (i = 0; i < data.length; i++) {
        // Match the GeoJSON data (byID) with the statistics
        // (data), replacing the GeoJSON feature properties
        // with the full data from the stats.

        //Ugly parent-districts that have no district number
        if(!data[i]['BezirkNummer']) {

        } else {

          byID[data[i].BezirkNummer].properties = data[i];
          for (var j = 0; j < variables.length; j++) {
              // Simultaneously build the table of min and max
              // values for each attribute.
              var n = variables[j];
              ranges[n].min = Math.min(data[i][n], ranges[n].min);
              ranges[n].max = Math.max(data[i][n], ranges[n].max);
          }
        }
    }
    // Create a new GeoJSON array of features and set it
    // as the new usLayer content.
    var newFeatures = [];
    for (i in byID) {
        newFeatures.push(byID[i]);
    }
    geojsonLayer.clearLayers();
    geojsonLayer.addData(newFeatures);
    // Kick off by filtering on an attribute.
    setVariable(variables[0]);
}

// Excuse the short function name: this is not setting a JavaScript
// variable, but rather the variable by which the map is colored.
// The input is a string 'name', which specifies which column
// of the imported JSON file is used to color the map.
function setVariable(name) {
    var scale = ranges[name];
    geojsonLayer.eachLayer(function(layer) {
        // Decide the color for each state by finding its
        // place between min & max, and choosing a particular
        // color as index.
        var division = Math.floor(
            (hues.length - 1) *
            ((layer.feature.properties[name] - scale.min) /
            (scale.max - scale.min)));
        // See full path options at
        // http://leafletjs.com/reference.html#path
        layer.setStyle({
            fillColor: hues[division],
            fillOpacity: 0.8,
            weight: 0.5
        });
    });
    finishedLoading();
}

function startLoading() {
    loader.className = '';
}

function finishedLoading() {
    // first, toggle the class 'done', which makes the loading screen
    // fade out
    loader.className = 'done';
    setTimeout(function() {
        // then, after a half-second, add the class 'hide', which hides
        // it completely and ensures that the user can interact with the
        // map again.
        loader.className = 'hide';
    }, 500);
}

function updateFilter() {
  setVariable(selectedFilter.group + selectedFilter.type);
}

//Button bindings

$('#filterBtn button').on('click', function (e) {

  selectedFilter.group = $(this).data('filter');
  updateFilter()

  $('#filterBtn button.btn-primary').removeClass('btn-primary').addClass('btn-default');
  $(this).removeClass('btn-default').addClass('btn-primary');

})

$('#typeBtn button').on('click', function () {

  selectedFilter.type = $(this).data('type');
  updateFilter()

  $('#typeBtn button.btn-primary').removeClass('btn-primary').addClass('btn-default');
  $(this).removeClass('btn-default').addClass('btn-primary');

})
