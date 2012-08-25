// in server/middleware/auth.js

// if the user is authenticated, redirect them to /
// else redirect them to /login
exports.authenticated = function (req, res, next) {

  if (req.session.userId) {
    return next();
  }
  if (res.redirect) {
    return res.redirect('/login');
  } else {
    return res(new Error('unauthorized'));
  }

};

// only let user through if they are admin
exports.isAdmin = function (req, res, next) {

  if (req.session.isAdmin === true) {
    return next();
  } else {
    throw new Error('unauthorized');
  }

};

// if the user is authenticated, redirect them to /
// else let them pass through -- to be used for /login route only
exports.validCookie = function (req, res, next) {

  if (req.session.userId) {
    return res.redirect('/');
  }
  return next();

};

