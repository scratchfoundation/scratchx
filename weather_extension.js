/* Extension demonstrating a blocking reporter block */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, May 2014 */
/* Kreg Hanning <khanning@media.mit.edu>, July 2016 */

(function(ext) {
  // You will need to obtain an API key to query
  // the OpenWeatherMap.org server
  // https://openweathermap.org/api
  var APPID = 'INSERT_API_KEY_HERE';

  var cacheDuration = 1800000 //ms, 30 minutes
  var cachedTemps = {};

  var units = 'imperial';

  function getWeatherData(weatherData, type) {
    var val = null;
    switch (type) {
      case 'temperature':
        val = weatherData.main.temp;
        if (units === 'metric')
          val = (val - 32) * (5/9)
        val = Math.round(val);
        break;
      case 'weather':
        val = weatherData.weather[0].description;
        break;
      case 'humidity':
        val = weatherData.main.humidity;
        break;
      case 'wind speed':
        val = weatherData.wind.speed;
        if (units === 'imperial')
          val *= 2.23694;
        if (Math.round(val) !== val)
          val = val.toFixed(1);
        break;
      case 'cloudiness':
        val = weatherData.clouds.all;
        break;
    }
    return(val);
  }

  function fetchWeatherData(location, callback) {

    if (location in cachedTemps &&
        Date.now() - cachedTemps[location].time < cacheDuration) {
      //Weather data is cached
      callback(cachedTemps[location].data);
      return;
    }

    // Make an AJAX call to the Open Weather Maps API
    $.ajax({
      url: 'http://api.openweathermap.org/data/2.5/weather',
      data: {q: location, units: 'imperial', appid: APPID},
      dataType: 'jsonp',
      success: function(weatherData) {
        //Received the weather data. Cache and return the data.
        cachedTemps[location] = {data: weatherData, time: Date.now()};
        callback(weatherData);
      }
    });
  }

  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};

  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function() {
    return {status: 2, msg: 'Ready'};
  };

  ext.getWeather = function(type, location, callback) {
    fetchWeatherData(location, function(data) {
      var val = getWeatherData(data, type);
      callback(val);
    });
  };

  ext.whenWeather = function(type, location, op, val) {
    if (!cachedTemps[location]) {
      //Weather data not cached
      //Fetch it and return false for now
      fetchWeatherData(location, function(){});
      return false;
    }
    //Weather data is cached, no risk of blocking
    var data = getWeatherData(cachedTemps[location].data, type);
    switch (op) {
      case '<':
        return (data < val);
      case '=':
        return (data == val);
      case '>':
        return (data > val);
    }
  };

  ext.setUnits = function(format) {
    units = format;
    return;
  };

  ext.getUnits = function() {
    return units;
  };

  // Block and block menu descriptions
  var descriptor = {
    blocks: [
      ['R', '%m.reporterData in %s', 'getWeather', 'temperature', 'Boston, MA'],
      ['h', 'when %m.eventData in %s is %m.ops %n', 'whenWeather', 'temperature', 'Boston, MA', '>', 80],
      [' ', 'set units to %m.units', 'setUnits', 'imperial'],
      ['r', 'unit format', 'getUnits']
    ],
    menus: {
      reporterData: ['temperature', 'weather', 'humidity', 'wind speed', 'cloudiness'],
      eventData: ['temperature', 'humidity', 'wind speed', 'cloudiness'],
      ops: ['>','=', '<'],
      units: ['imperial', 'metric']
    }
  };

  // Register the extension
  ScratchExtensions.register('Weather extension', descriptor, ext);

})({});
