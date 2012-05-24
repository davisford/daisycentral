// in server/middleware/auth.js

// if the user is authenticated, redirect them to /
// else redirect them to /login
exports.authenticated = function() {
  return function(req, res, next) {
    console.log('middleware => security.authenticated', req.session);
    if (req.session.userId) {
      console.log("middleware => security.authenticated: TRUE");
      return next();
    }
    console.log("middleware => security.authenticated: FALSE");
    if (res.redirect) 
      return res.redirect('/login');
    else
      return res(new Error('unauthorized'));
  };
}();

// only let user through if they are admin
exports.isAdmin = function() {
  return function (req, res, next) {
    console.log("middleware => security.isAdmin", req.session);
    if(req.session.isAdmin === true) {
      console.log("middleware => security.isAdmin: TRUE");
      return next();
    }
    console.log("middlware => security.isAdmin: FALSE");
    if(res.redirect)
      return res.redirect('/login');
    else
      return res(new Error('unauthorized'));
  };
}();

// if the user is authenticated, redirect them to /
// else let them pass through -- to be used for /login route only
exports.validCookie = function() {
  return function(req, res, next) {
    console.log('middleware => security.validCookie', req.session);
    if (req.session.userId) {
      console.log('middleware => security.validCookie: TRUE');
      return res.redirect('/');
    }
    console.log('middleware => security.validCookie: FALSE');
    return next();
  };
}();

