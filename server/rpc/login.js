exports.actions = function (req, res, ss) {
	return {
	  login: function(user, pass, sticy) {
	    console.log('login');
	    res(true);
	  }
	}
}