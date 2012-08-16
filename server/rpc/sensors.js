// server/rpc/sensors.js 

var SensorData = require('../models/sensordata'),
  ObjectId = require('mongoose').Schema.ObjectId;

exports.actions = function (req, res, ss) {
  // populate the session object
  req.use('session');

  // TODO add security middleware

  return {

    // TODO adding paging functionality
    get: function (mac) {

      if (!mac) { return res("MAC address is not valid: " + mac); }

      var SensorDataModel = SensorData.getModel(SensorData.getColName(mac));

      SensorDataModel.find().sort("-timestamp").limit(25).execFind(function (err, sensors) {
        if (err) {
          console.log(err); return res("An error occurred, please try again.");
        } else { return res(null, sensors); }
      });
    }
  };
};