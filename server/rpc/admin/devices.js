// in server/rpc/admin/devices.js

var Daisies = require('../../models/daisies').getModel();

exports.actions = function (req, res, ss) {
	// populate the session object
	req.use('session');

  req.session.channel.subscribe('dw:admin');

	// must be admin to use this RPC
	req.use('security.isAdmin');

	return {

    // TODO: add pagination support
    // get all devices
		get: function (pageNum, pageSize) {
      Daisies.find({}, function (err, daisies) {
        if (err) { return res("An error occurred, please try again", null); console.log(err); }
        else {
          res(null, daisies);
        }
      });
		},

    // admin can update daisy properties
    update: function (daisy) {
      if (!daisy) { return res(false); }

      // find daisy by id
      Daisies.findById(daisy._id, function (err, found) {
        if (err) { console.log(err); return res(false); }

        // can't find it
        if(!found) {
          console.log("Couldn't find daisy by _id:", daisy);
          return res(false);
        } else {
          // update it and save
          found.key = daisy.key;
          found.save(function (err) {
            if (err) { console.log(err); return res(false); }
            else { return res(true); }
          });
        }
      });
    }

	} // end return
} // end exports.actions