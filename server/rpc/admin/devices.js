// in server/rpc/admin/devices.js

var Daisies = require('../../models/daisies').getModel(),
    server  = require('../../app/daisyServer');

exports.actions = function (req, res, ss) {
	// populate the session object
	req.use('session');

  //req.session.channel.subscribe('dw:admin');

	// must be admin to use this RPC
	req.use('security.isAdmin');

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

      if (!mac) { 
        console.log("mac is not valid: "+mac);
        return res("Cannot send to null/empty daisy", null); 
      }
      if (!command) { 
        console.log("command is not valid: "+command);
        return res("Cannot send null/empty command", null); 
      }

      var daisyConvo = server.getConvo(mac);
      if (!daisyConvo) { 
        console.log("Daisy Convo is not available for mac: " + mac);
        return res("That Daisy doesn't appear to be online at the moment", null); 
      }

      var cmd = command;
      daisyConvo.send(command, function (err, result) {
        if (result && result.indexOf(cmd) === 0) {
          console.log("Ignore echo command: "+result);
        } else {
          console.log("responding to RPC with "+result);
          res(err, result);
        }
      }); 
      console.log('command should be sent');
    }

	} // end return
} // end exports.actions