// in server/rpc/devices.js

var Daisies
  , ObjectId = require('mongoose').Schema.ObjectId; 

exports.actions = function (req, res, ss) {

  Daisies = require('../models/daisies')(ss);

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
        if (err) { console.log(err); return res("Registration error; please try again", false); }

        // can't find it
        if(!found) {
          console.log("Couldn't find daisy by secret key", secret);
          return res("Registration was not successful - are you sure you have the right key? ", false);
        } else {
          if(found.owners.indexOf(req.session.userId) < 0) {
            // update and save
            found.owners.push(req.session.userId);
            found.save(function (err) {
              if (err) { console.log(err); return res("Registration error; please try again", false); }
              else { return res("Registration was successful", true); }
            });
          } else {
            // we are already an owner of this daisy
            return res("You've already registered that Daisy", true);
          }
        }
      }); 
    }

  } // end return
} // end exports.actions