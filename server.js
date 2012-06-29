// Daisy Central server code

var express = require('express')
  , ss = require('socketstream')
  , conf = require('./server/app/conf')
  , daisyServer = require('./server/app/daisy-server.js').init(ss).start()
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth')
  , security = require('./server/middleware/security');

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
  code: ['libs', 'app', 'shared', 'system'],
  tmpl: '*'
});

// the login page
ss.client.define('login', {
  view: 'login.jade',
  css: ['libs', 'app.styl', 'login.styl'],
  code: ['libs', 'app', 'system', 'shared'],
  tmpl: '*'
});

// the admin page
ss.client.define('admin', {
  view: 'admin.jade',
  css: ['libs', 'app.styl'],
  code: ['libs', 'admin', 'shared', 'system'],
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
app.get('/', security.authenticated(), function (req, res) {
  res.serveClient('main');
});

app.get('/login', security.validCookie(), function(req, res) {
  res.serveClient('login');
});

app.get('/logout', function (req, res) {
  req.session.userId = undefined;
  req.session.destroy();
  req.logout();
  res.redirect('/login');
});

app.get('/admin', security.isAdmin(), function(req, res, next) {
  res.serveClient("admin");
});

// start socketstream webapp
app.listen(conf.webserver.port, function() {
  console.log("daisycentral listening on port %d in %s mode", app.address().port, app.settings.env);
});
ss.start(app);

process.on('uncaughtException', function (err) {
  console.log(err);
});
