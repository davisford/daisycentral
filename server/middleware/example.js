// Example request middleware

// Only let a request through if the session has been authenticated
exports.authenticated = function() {
  return function(req, res, next) {
    if (req.session && (req.session.userId != null)) {
      console.log('in authenticated, user is good');
      return next();
    } else {
      console.log('in authenticated, user is not good');
      return res(false);
    }
  };
};