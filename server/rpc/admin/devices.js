// in server/rpc/admin/devices.js

var server = require('../../app/daisy-server'),
  Daisies;

exports.actions = function (req, res, ss) {

  Daisies = require('../../models/daisies')(ss);

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
          return res("An error occurred, please try again", null);
        } else {
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
        if (!found) {
          console.log("Couldn't find daisy by _id:", daisy);
          return res(false);
        } else {
          // update it and save
          found.key = daisy.key;
          found.save(function (err) {
            if (err) {
              console.log(err);
              return res(false);
            } else { return res(true); }
          });
        }
      });
    },

    sendCommand: function (mac, command) {

      if (!mac) {
        return res("Invalid mac address");
      }
      if (!command) {
        return res("Cannot send null/empty command");
      }

      var session = server.getSession(mac),
        cmd = command;

      if (!session) {
        return res("That Daisy doesn't appear to be online at the moment.  Try again later. \n");
      }

      session.send(command, function (err, result) {
        if (err) {
          console.log(err);
          return res(err);
        }
        // ignore echo 
        if (result && result.indexOf(cmd) !== 0) {
          res(null, result);
        } else {
          res("No response");
        }
      });

    }

  }; // end return

}; // end exports.actions