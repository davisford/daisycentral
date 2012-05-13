// - server/rpc/auth.js

var mongoose = require('mongoose')
 ,  User = require('../models/user').User;

exports.actions = function (req, res, ss) {
  req.use('session');

  return {

    // login to the app
    login: function (email, pass) {
      User.authenticate(email, pass, function (err, user, msg) {
        if (err) {
          console.log("user auth failed =>", err);
          return res(false, "An error occurred, please try again");
        } else if (!user) {
          return res(false, msg.message);
        } else {
          if(req.session.auth) {
            req.session.auth.userId = user.id;
          } else {
            req.session.auth = { userId: user.id };
          }
          if (user.roles.indexOf('admin') !== -1) {
            req.session.auth.isAdmin = true;
          } else {
            req.session.auth.isAdmin = false;
          }
          req.session.save();
          return res(true);
        }
      }); // end authenticate
    }, // end login

    // create a new user
    register: function(email, pass, confirm) {
      User.register(email, pass, confirm, function (err, user, msg) {
        if (err) {
          console.log("user register failed =>", err);
          return res(false, "An error occurred, please try again");
        } else if (!user) {
          return res(false, msg.message);
        } else {
          if (req.session.auth) {
            req.session.auth.userId = user.id;
          } else {
            req.session.auth = { userId: user.id };
          }
          req.session.save();
          return res(true);
        }
      });

    } // end register
  }; // end return
}; // end exports.actions
