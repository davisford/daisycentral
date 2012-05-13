// in server/middleware/auth.js

// only let user through if they are authenticated
exports.authenticated = function() {
  return function(req, res, next) {
    if (req.session)
      if (req.session.auth)
        if (req.session.auth.userId)
          return next();
    console.log("user is not authenticated");
    return res(false);
  };
};

// only let user through if they are admin
exports.isAdmin = function() {
  return function (req, res, next) {
    console.log("isAdmin middleware", req.session);
    if(req.session)
      if(req.session.auth)
        if(req.session.auth.isAdmin === true)
          return next();
    console.log("user is not an admin");
    return res(false);
  };
};