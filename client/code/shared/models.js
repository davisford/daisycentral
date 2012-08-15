// models for sensors / daisies
module.exports = (function () {

  /*---------------------------------------------------------------------------
     Model: Daisy
   --------------------------------------------------------------------------*/
  var Daisy = Backbone.Model.extend();


  /*---------------------------------------------------------------------------
     Model: Sensor
   --------------------------------------------------------------------------*/
  var Sensor = Backbone.Model.extend();
  Sensor.info = {
    AD0: { name: "RX-I", bool: false, yaxis: -1, color: "#000" },
    AD1: { name: "Power", bool: true, yaxis: 1, color: "#CB4B4B" },
    AD2: { name: "Leak Detection", bool: true, yaxis: 1, color: "#4DA74D" },
    AD3: { name: "Magnetic Switch", bool: true, yaxis: 1, color: "#9440ED" },
    AD4: { name: "Humidity", bool: false, yaxis: 2, color: "#BD9B33" },
    AD5: { name: "Temperature", bool: false, yaxis: 3, color: "#8CACC6" },
    AD6: { name: "Moisture", bool: false, yaxis: 4, color: "#A23C3C" },
    AD7: { name: "Battery", bool: false, yaxis: 5, color: "#3D853D" }
  };

  /*---------------------------------------------------------------------------
     Collection: Daisies
       Holds the collection of Daisies assigned to this user
   --------------------------------------------------------------------------*/
  var Daisies = Backbone.Collection.extend({

    model: Daisy,

    initialize: function (options) {
      if (!options.url) {
        throw new Error("URL must be specified for Daisies");
      }
      this.url = options.url;
    },

    // override Backbone.Collection.fetch()
    "fetch": function (options) {
      var collection = this,
        success = options.success;
      options.success = function (resp, status, xhr) {
        collection.reset(resp, options);
        if (success) { success(collection, resp); }
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      ss.rpc(this.url, function (err, arr) {
        console.log('fetched daisies: ', err, arr);
        if (err) { return options.error(err); }
        return options.success(arr);
      });
      return;
    }
  });


  /*---------------------------------------------------------------------------
     Collection: Sensors
       Holds the sensor data for a particular Daisy
   --------------------------------------------------------------------------*/
  var Sensors = Backbone.Collection.extend({
    model: Sensor,

    comparator: function (sensor) {
      return sensor.get('timestamp');
    },

    initialize: function (options) {
      if (!options.url) {
        throw new Error("URL must be specified for Sensors");
      }
      this.url = options.url;
    },

    "fetch": function (options) {
      var collection = this,
        success = options.success;
      options.success = function (resp, status, xhr) {
        collection.reset(resp, options);
        if (success) { success(collection, resp); }
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      ss.rpc(this.url, options.mac, function (err, arr) {
        if (err) { return options.error(err); }
        return options.success(arr);
      });
      return;
    },

    getCached: function () {
      return this.cached || [];
    },

    /**
     * Converts the models in this collection to a format flot expects
     * @param {Array} [arr] an array naming the sensors that should be shown; other
     *    sensors will be filtered out.  e.g. ['AD0', 'AD1']
     * @return an array of data for flot
     */
    flotData: function (arr) {
      var data = [], i, j, info,
        vals, boolSensor,
        timestamps = _.map(this.pluck('timestamp'), function (num) {
          // convert GMT time to local timestamp
          var localNow = new Date().getTimezoneOffset(),
            min = num / 1000 / 60;
          return (min - localNow) * 1000 * 60;
        });

      for (i = 0; i < arr.length; i += 1) {
        info = Sensor.info[arr[i]];
        vals = this.pluck(arr[i]);
        boolSensor = _.any(["Power", "Leak Detection", "Magnetic Switch"], function (sensor) {
          return sensor === info.name;
        });

        if (boolSensor) {
          // boolean sensors have the raw values converted to 0 or 1 based on midpoint between 0-65534
          for (j = 0; j < vals.length; j += 1) {
            if (vals[j] > (65534 / 2)) {
              vals[j] = 1;
            } else { vals[j] = 0; }
          }
          // boolean sensors all share the same yaxis, and have line steps
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            yaxis: info.yaxis,
            clickable: true,
            hoverable: true,
            lines: { show: true, steps: true }
          });
        } else {
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            clickable: true,
            hoverable: true,
            yaxis: info.yaxis
          });
        }
      }
      this.cached = data;
      return data;
    }
  });

  return {
    Daisy: Daisy,
    Sensor: Sensor,
    Daisies: Daisies,
    Sensors: Sensors
  }

}());
