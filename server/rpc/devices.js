var Daisies = require('../models/daisies').getModel()
  , ObjectId = require('mongoose').Schema.ObjectId;

exports.actions = function (req, res, ss) {
  // populate the session object
  req.use('session');

  // TODO: USE THIS
  //req.use('seurity.authenticated');
  //req.use('security.isAdmin');

  console.log('req =>\n', req);
  console.log('req.session =>\n', req.session);

  return {
    get: function(pageNum, pageSize) {
      console.log('devices.get');
      Daisies.find({}, function (err, daisies) {
        console.log('get =>', daisies);
        if (err) { return res("An error returned, please try again", null); }
        else {
          res(null, daisies);
        }
      });
    },

    getmine: function() {
      var auth = req.session.auth;
      Daisies.find( {"owners": auth.userId}, function (err, daisies) {
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
      var auth = req.session.auth;
      console.log('auth in register: ', auth);
      console.log('devices.register secret =>' + secret);
      Daisies.findOne({key: secret}, function (err, found) {
        
        // database problem
        if (err) { console.log(err); return res(false); }

        // can't find it
        if(!found) {
          console.log("Couldn't find daisy by secret key", secret);
          return res(false);
        } else {
          // update it an save
          found.owners.push(auth.userId);
          found.save(function (err) {
            if (err) { console.log(err); return res(false); }
            else { return res(true); }
          });
        }
      });
      res(true);
    },

    // update a daisy 
    save: function(daisy) {
      console.log("save => ", daisy);

      // can't pass in and save null
      if(!daisy) { return res(false); }

      // need to find daisy by id
      Daisies.findById(daisy._id, function (err, found) {
        // database problem
        if (err) { console.log(err); return res(false); }

        // can't find it
        if(!found) {
          console.log("Couldn't find daisy by id",daisy);
          return res(false);
        } else {

          // update it and save
          found.key = daisy.key;
          found.save(function(err) {
            if (err) { console.log(err); return res(false); }
            else { return res(true); }
          });
        } 
      });
    }
  }
}