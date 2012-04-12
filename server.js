// Daisy Central server code

var http = require('http')
  , ss = require('socketstream')
  , express = require('express')
  , everyauth = require('everyauth')
  , Promise = everyauth.Promise
  , conf = require('./conf')
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , UserSchema = new Schema({})
  , User;

/* _____________ MONGOOSE / EVERYAUTH CONFIG _______________ */
UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function() {
        return User;
      }
    }
  }
  , facebook: {
    everyauth: {
      myHostname: 'http://local.host:3000'
    , appId: conf.fb.appId
    , appSecret: conf.fb.appSecret
    , redirectPath: '/'
    }
  }
  , twitter: {
    everyauth: {
      myHostname: 'http://localhost:3000'
    , consumerKey: conf.twit.consumerKey
    , consumerSecret: conf.twit.consumerSecret
    , redirectPath: '/'
    }
  }
  , password: {
      loginWith: 'email'
    , everyauth: {
      getLoginPath: '/login'
    , postLoginPath: '/login'
    , loginView: 'login.jade'
    , getRegisterPath: '/register'
    , postRegisterPath: '/register'
    , registerView: 'register.jade'
    , loginSuccessRedirect: '/'
    , registerSuccessRedirect: '/'
    }
  }
  , google: {
    everyauth: {
      myHostname: 'http://localhost:3000'
    , appId: conf.google.clientId
    , appSecret: conf.google.clientSecret
    , redirectPath: '/'
    , scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
    }
  }
});

mongoose.model('User', UserSchema);
mongoose.connect('mongodb://localhost/example');
User = mongoose.model('User');
everyauth.everymodule.findUserById( function (userId, callback) {
  console.log('findUserById: '+userId);
  User.findById(userId, callback);
});
// disable for production
everyauth.debug=true;

/* _________________ PAGES ________________ */
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

ss.client.formatters.add(require('ss-stylus'));
ss.client.formatters.add(require('ss-jade'), {locals:{everyauth:everyauth}});
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
  , mongooseAuth.middleware()
);

mongooseAuth.helpExpress(app);

/* _________________ ROUTES _________________ */
app.get('/', function (req, res) {
  if(req.loggedIn) {
    console.log('already logged in, req.user =>', req.user);
    console.log('everyauth.user =>', everyauth.user);
    console.log('everyauth.twitter.user =>', everyauth.twitter.user);
    res.serveClient('main', {user:"davis"});
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

// start socketstream webapp
app.listen(3000);
ss.start(app);

// start node server for daisy device posts
http.createServer(function(req,res) {
	console.log(req.url);
  ss.api.publish.all('flash', req.url);
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end();
}).listen(9000);

