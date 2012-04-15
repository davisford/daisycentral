// - server/rpc/auth.js

exports.actions = function (req, res, ss) {
    req.use('session');

	return {
		login: function (email, pass, sticky) {
			console.log('login, user:'+email+", pass:"+pass+", sticky:"+sticky);
			res(true);
		}, 

		register: function(email, pass) {
			console.log('register, user:'+email+", pass:"+pass);
			res(true);
		}
	};
};