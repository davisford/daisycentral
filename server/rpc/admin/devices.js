// in server/rpc/admin/devices.js

var Daisies = require('../../models/daisies').getModel(),
    server  = require('../../app/daisyServer');

exports.actions = function (req, res, ss) {
	// populate the session object
	req.use('session');

  //req.session.channel.subscribe('dw:admin');

	// must be admin to use this RPC
	//req.use('security.isAdmin');

	return {

    // TODO: add pagination support
    // get all devices
		get: function (pageNum, pageSize) {
      Daisies.find({}, function (err, daisies) {
        if (err) { 
          console.log(err);
          return res("An error occurred, please try again", null);  }
        else {
          return res(null, daisies);
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
    },

    sendCommand: function (mac, command) {
      console.log('mac:'+mac+", command:"+command);

      if (!mac) { return res("Cannot send to null/empty daisy", null); }
      if (!command) { return res("Cannot send null/empty command", null); }

      var daisyConvo = server.getConvo(mac);
      if (!daisyConvo) { return res("That Daisy doesn't appear to be online at the moment", null); }

      var results = [];
      daisyConvo.send([command], true, function (err, result) {
        console.log('callback from send: ', err, result);
        results.push(result);
        if(result.match(/EXIT/)) {
          res(err, results.join('\n'));
        }
        
      }); 
    }

	} // end return
} // end exports.actions