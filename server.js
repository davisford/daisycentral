// Daisy Central server code

var http = require('http')
  , ss = require('socketstream')
  , conf = require('./conf')
  , process = require('./server/incoming/device.js').init(ss, conf)
  , express = require('express');

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
  css: ['libs', 'app.styl'],
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

var app = express.createServer(
    express.bodyParser()
  , express.static(__dirname + "/client/static")
  , ss.http.middleware
);

// handles auth for us
require('./server/auth/auth').init(ss, app);

function isAdmin(req, res, next) {
  if(req.session.isAdmin) {
    next();
  } else {
    next(new Error("You don't have permissions to do that"));
  }
}

/* _________________ ROUTES _________________ */
app.get('/', function (req, res) {
  if(req.loggedIn) {
    console.log('already logged in, req.user =>', req.user);
    res.serveClient('main');
  }
  else {
    console.log('not logged in, redirecting to login/');
    res.serveClient('login');
  }
});
app.get('/login', function(req, res) {
  console.log("/login");
  res.serveClient('login');
});
app.get('/register', function(req, res) {
  console.log("/register");
  res.serveClient("register");
});
app.get('/admin', isAdmin, function(req, res, next) {
  console.log("/admin");
  res.serveClient("admin");
});

// start socketstream webapp
app.listen(conf.webserver.port);
ss.start(app);



