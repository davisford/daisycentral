// Daisy Central server code

var express = require('express')
  , ss = require('socketstream')
  , conf = require('./server/app/conf')
  , deviceServer = require('./server/app/device.js').init(ss)
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth');

var UserModel = require('./server/models/user').User;

// connect to mongodb
mongoose.connect(conf.db.url);
mongoose.connection.on('open', function (){
  console.log("mongodb connection established");
});

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
  , mongooseAuth.middleware()
);

mongooseAuth.helpExpress(app);

/* _________________ ROUTES _________________ */
app.get('/', ensureAuthenticated, function (req, res) {
  console.log('/ req.user => ', req.user);
  console.log('req.session =>', req.session);
  res.serveClient('main');
});

app.get('/login', function(req, res) {
  res.serveClient('login');
});

app.get('/logout', function (req, res) {
  console.log('/logout')
  req.session.userId = undefined;
  req.session.destroy();
  req.logout();
  console.dir(req.session);
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
  console.dir(req.session);
  if (req.session !== undefined) 
    if (req.session.auth !== undefined)
      if (req.session.auth.userId !== undefined)
        return next(); 
  res.redirect('/login');
}

function isAdmin(req, res, next) {
  if(req.session.auth.userId) {
    next();
  } else {
    next(new Error("You don't have permissions to do that"));
  }
}

