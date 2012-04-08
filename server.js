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

// Minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env == 'production') ss.client.packAssets();

// must be appended
ss.http.middleware.append(mongooseAuth.middleware());

// create server
var server = express.createServer(ss.http.middleware);
mongooseAuth.helpExpress(server);
server.listen(3000);

/* ____________ ROUTING _____________ */
server.get('/', function (req, res) {
  if(req.loggedIn) {
    console.log('already logged in: ', req.user);
    res.serveClient('main');
  }
  else {
    console.log('not logged in, redirecting...');
    res.serveClient('login');
  }
});

server.get('/login', function(req, res) {
  res.serveClient('login');
});

server.get('/register', function (req, res) {
  res.serveClient('register');
});

// start socketstream webapp
ss.start(server);

// start node server for daisy device posts
http.createServer(function(req,res) {
	console.log(req.url);
  ss.api.publish.all('flash', req.url);
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end();
}).listen(9000);

