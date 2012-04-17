// Daisy Central server code

var express = require('express')
  , ss = require('socketstream')
  , conf = require('./server/app/conf')
  , deviceServer = require('./server/app/device.js').init(ss)
  , auth = require('./server/app/auth.js').init()
  , passport = require('passport')
  , mongoose = require('mongoose')
  , connectMongo = require('connect-mongodb');

/* _________________ VIEWS ________________ */
// the main webapp
ss.client.define('main', {
  view: 'app.jade',
  css:  ['libs', 'app.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

// the login page
ss.client.define('login', {
  view: 'login.jade',
  css: ['libs', 'app.styl', 'login.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

// the register page
ss.client.define('register', {
  view: 'register.jade',
  css: ['libs', 'app.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

// the admin page
ss.client.define('admin', {
  view: 'admin.jade',
  css: ['libs', 'app.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

ss.client.formatters.add(require('ss-stylus'));
ss.client.formatters.add(require('ss-jade'));
ss.client.templateEngine.use(require('ss-hogan'));

// use redis for sticky sessions
ss.session.store.use('redis');
ss.publish.transport.use('redis');

// minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env == 'production') ss.client.packAssets();

// express cookieParser + session added by ss.http.middleware
var app = express.createServer(
    express.bodyParser()
  , express.static(__dirname + "/client/static")
  , ss.http.middleware
  , passport.initialize()
  , passport.session()
);

/* _________________ ROUTES _________________ */
app.get('/', ensureAuthenticated, function (req, res) {
  res.serveClient('main');
});

app.get('/login', function(req, res) {
  res.serveClient('login');
});

app.post('/login',
  passport.authenticate('local', {failureRedirect: '/login', failureFlash:true }),
  function (req, res) {
    res.serveClient('main');
  });

app.post('/register', function(req, res) {
  // TODO
});

app.get('/logout', function (req, res) {
  req.logout();
  res.redirect('/login');
});

app.get('/admin', isAdmin, function(req, res, next) {
  console.log("/admin");
  res.serveClient("admin");
});

// start socketstream webapp
app.listen(conf.webserver.port);
ss.start(app);

// Simple route middleware to ensure user is authenticated.
// Use this route middleware on any resource that needs to be protected.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if(req.session.isAdmin) {
    next();
  } else {
    next(new Error("You don't have permissions to do that"));
  }
}

