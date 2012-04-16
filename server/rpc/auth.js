// - server/rpc/auth.js

var mongoose = require('mongoose')
  , passport = require('passport');

var User = mongoose.model('User');

exports.actions = function (req, res, ss) {
    req.use('session');

	return {
		login: function (email, pass, sticky) {
			console.log('login, user:'+email+", pass:"+pass+", sticky:"+sticky);
			passport.authenticate('local', function (req, res) {
				// if this fn is called auth was successful
				res(true);
			});
			
		}, 

		register: function(email, pass) {
			User.findOne({email:email}, function (err, user) {
				if(user) {
					console.log('user is already registered');
					res(false, "User is already registered");
				} else {
					user = new User({email:email, password:pass});
					user.save(function (err) {
						if(err) {
							res("Error: not able to save user: "+err);
						} else {
							res(true);
						}
					});
				}
			});
		}
	};
};