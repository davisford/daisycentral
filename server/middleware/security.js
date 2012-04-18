// in server/middleware/auth.js

// only let user through if they are authenticated
exports.authenticated = function() {
  return function(req, res, next) {
    if (req.session && (req.session.userId != null)) {
      return next();
    } else {
      return res(false);
    }
  };
};

// only let user through if they are admin
exports.isAdmin = function() {
  return function (req, res, next) {
    if (req.session && (req.session.userId != null) && (req.session.isAdmin)) {
      return next();
    } else {
      return res(false);
    }
  }
}