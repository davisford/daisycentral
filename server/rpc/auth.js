// - server/rpc/auth.js

var mongoose = require('mongoose')
 ,  User = mongoose.model('User');

exports.actions = function (req, res, ss) {
  req.use('session');

	return {

		// login to the app
		login: function (email, pass) {
		  User.authenticate(email, pass, function (err, user, msg) {
		  	if (err) {
		  		console.error("user auth failed =>", err);
		  		return res(false, msg.message);
		  	} else if (!user) {
          return res(false, msg.message);
		  	} else {
		  		if(req.session.auth)
		  			req.session.auth.userId = user.id;
		  		else
		  			req.session.auth = { userId: user.id };
		  		req.user = user;
		  		req.session.save();
		  		return res(true);
		  	}
		  }); // end authenticate
		}, // end login

    // create a new user
		register: function(email, pass) {
			User.findOne({email:email}, function (err, user) {
				if(user) {
					return res(false, "User is already registered");
				} else {
					user = new User({email:email, password:pass});
					user.save(function (err) {
						if(err) {
							return res("Error: not able to save user: "+err);
						} else {
							if(req.session.auth)
		  						req.session.auth.userId = user.id;
		  					else
		  					req.session.auth = { userId: user.id };
		  					req.user = user;
		  					req.session.save();
							return res(true);
						}
					}); // end save
				}
			}); // end findOne
		} // end register
	}; // end return
}; // end exports.actions

function authComplete(err, user) {
	if (err) {
		console.error("user auth failed =>", err);
		return res(fail, "Username or password incorrect");
	} else {
		req.session.setUserId(user.id);
		return res(true);
	}
}

// exported function to validate email address
function validateEmail(text) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(text);
}

// exported function to validate password
function validatePassword (text) {
  return text.length >= 6;
}