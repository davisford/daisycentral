var Daisies = require('../models/daisies').getModel();

exports.actions = function (req, res, ss) {
	// you must be logged in and be an admin
	req.use('session');
	//req.use('seurity.authenticated');
	//req.use('security.isAdmin');

	return {
		get: function(pageNum, pageSize) {
			Daisies.find({}, function (err, daisies) {
				console.log('getDevices', daisies);
				if (err) { return res("An error returned, please try again", null); }
				else {
					res(null, daisies);
				}
			});
		}
	}
}