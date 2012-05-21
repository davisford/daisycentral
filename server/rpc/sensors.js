// server/rpc/sensors.js 

var SensorData = require('../models/sensordata')
  , ObjectId = require('mongoose').Schema.ObjectId;

exports.actions = function (req, res, ss) {
	// populate the session object
	req.use('session')

	// TODO add security middleware

	return {

		// TODO adding paging functionality
		get: function(mac) {
			console.log('sensors.get =>'+mac);
			var SensorDataModel = SensorData.getModel(SensorData.getColName(mac));
			var query = SensorDataModel.where({}).limit(25);
			query.run(function (err, sensors) {
				if (err) { return res("An error occurred, please try again"); return; }
				else { return res(null, sensors); }
			});
		}
	}
}