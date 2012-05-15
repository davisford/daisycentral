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
		},

		save: function(daisy) {
			console.log("save => ", daisy);
			if(!daisy) { return res(false); }
			Daisies.update({_id: daisy._id}, daisy, function (err, numAffected) {
			  if (err) { 
			  	console.log("could not update daisy", err); 
			  	return res(false); 
			  }
			  if (numAffected !== 1) { 
			  	console.log("we should only have updated ONE, but we modifed: "+numAffected);
			  }
			  console.log("update should have been successful");
			  return res(true);
			});
		}
	}
}