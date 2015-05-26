var fs = require('fs');
var popdistricts = require('./stats.json');
var geodistricts = require('./districts.json');


//Combine two objects

var mix = function(source, target) {
   for(var key in source) {
     if (source.hasOwnProperty(key)) {
        target[key] = source[key];
     }
   }
}


popdistricts.forEach(function (district) {

  //Cache districts total for faster calculations

  var total = district["Gesamt"];


  //Kids from 0 to 9
  district.kidsAbsolute = district['0 - 9'];
  district.kidsRelative = Math.round( 1e2 * (district.kidsAbsolute / total)) / 1e2;

  //(Almost) Teenagers from 9 to 19
  district.teenAbsolute = district['10 - 19'];
  district.teenRelative = Math.round( 1e2 * (district.teenAbsolute / total)) / 1e2;

  //Adults from 20 to 69
  //TODO: There is probably an easier/cleaner way to do this, but it's too late in the night :)
  district.adultAbsolute = district['20 - 29'] +
                           district['30 - 39'] +
                           district['40 - 49'] +
                           district['50 - 59'] +
                           district['60 - 69'];
  district.adultRelative = Math.round( 1e2 * (district.adultAbsolute / total)) / 1e2;

  //Seniors from 70 to 90+
  district.seniorAbsolute = district['70 - 79'] +
                            district['80 - 89'] +
                            district['90 u. mehr'];
  district.seniorRelative = Math.round( 1e2 * (district.seniorAbsolute / total)) / 1e2;


  //Georeference the data (Add properties of districts from statistics to geojson of districts)

  var geodistrict = geodistricts['features'].filter(function( obj ) {
    return obj['properties']['Nr'] == district['BezirkNummer'];
  });

  if(geodistrict[0] != null) {
    mix(district, geodistrict[0].properties);
  }

});


//First let's generate the geoJSON
var outputFilename = 'output.geojson';
fs.writeFile(outputFilename, JSON.stringify(geodistricts), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("JSON saved to " + outputFilename);
    }
});


//Then the one to use with leaflet
var outputFilename = 'output_lf.geojson';
fs.writeFile(outputFilename, 'var districts = ' + JSON.stringify(geodistricts), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("Leaflet JSON saved to " + outputFilename);
    }
});


//First let's generate the geoJSON
var outputFilename = 'output_wo.geojson';
fs.writeFile(outputFilename, JSON.stringify(popdistricts, true, 4), function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log("JSON saved to " + outputFilename);
    }
});
