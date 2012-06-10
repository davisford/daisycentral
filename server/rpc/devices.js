// in server/rpc/devices.js

var Daisies = require('../models/daisies').getModel()
  , ObjectId = require('mongoose').Schema.ObjectId;

exports.actions = function (req, res, ss) {
  // populate the session object
  req.use('session');

  // you must be authenticated 
  req.use('security.authenticated');

  return {
    
    // returns only the daisies that the logged in user 
    // claims ownership to
    get: function() {
      Daisies.find( {"owners": req.session.userId}, function (err, daisies) {
        console.log('RPC.get daisies: ', daisies);
        if (err) { console.log(err); return res(false, null); }
        else {
          return res(null, daisies);
        }
      });
    },

    // registering a new daisy means if they authenticate
    // with the secret key, we add them to the list of owners
    // for that daisy and they can use it
    register: function(secret) {
      Daisies.findOne({key: secret}, function (err, found) {
        
        // database problem
        if (err) { console.log(err); return res(false); }

        // can't find it
        if(!found) {
          console.log("Couldn't find daisy by secret key", secret);
          return res(false);
        } else {
          // update it an save
          found.owners.push(req.session.userId);
          found.save(function (err) {
            if (err) { console.log(err); return res(false); }
            else { return res(true); }
          });
        }
      });
      res(true);
    }

  } // end return
} // end exports.actions