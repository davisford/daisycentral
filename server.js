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
    res.serveClient('main', {title:"fantastic"});
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

var url = require('url')
  , qs  = require('querystring');

/*
  Example incoming post:
  { DATA: '051108C20872000A87D70B626A8131173121',
  id: 'Troys-Mailbox',
  mac: '00:06:66:72:16:81',
  bss: 'e0:46:9a:5a:c8:43',
  rtc: '4f87ae7d',
  bat: '3066',
  io: '510',
  wake: '1',
  seq: '7d',
  cnt: '1',
  rssi: 'e4' }

  bss = mac address of access point
  rtc = epoch ntp synchronized
  bat = supply voltage, not necessarily battery voltage
  wake = wake reason
    0 not defined
    1 power on or hardware reset
    2 awake from sleep on timer
    3 sensor interrupt
    4-5 not defined
    6 software reboot
    7 watchdog
  seq = 32 bit hex of how many posts device has made
  cnt = ?
  rssi = receiver signal strength indicator
  io = GPIO in hex
  
  AD values range from 0 to 65536, sensors typically have much less range than this.
  AD0 - RX-I (don't bother with this one)
  AD1 - Power loss/recover, high values power on, low values power off
  AD2 - Leak detection, low values leak detected, high values no leak
  AD3 - Magnetic switch, magnet close (closed) high values, magnet far (open) low values
  AD4 - Humidity detector, high values high humidity, low values low humidity
  AD5 - Temperature, cold high values, hot low values
  AD6 - Moisture (plant), low values moist, high values dry
  AD7 - Battery level, high values high batter, low values low battery

*/

// start node server for daisy device posts
http.createServer(function(req,res) {

  var raw = qs.parse(url.parse(req.url).query);
  var data = {
    did: raw.id,
    mac: raw.mac,
    timestamp: parseInt(raw.rtc, 16) * 1000,
    bat: parseInt(raw.bat),
    rssi: parseInt(raw.rssi, 16),
    wake: parseInt(raw.wake),
    seq: parseInt(raw.seq, 16)
  };

  // GPIO
  var pioValue = parseInt(raw.io, 16)
    , mask = 0x10;
  for(var i=3; i>0; i--) {
    mask = mask >> 1;
    data["PIO"+i] = (pioValue & mask) === mask ? 1 : 0;
  }

  // sensors
  // first 4 are repeat of GPIO
  var rawSensors = raw.DATA.substring(4);
  console.log(rawSensors.toString(16));
  for(var i=0; i<8; i++) {
    data["AD"+i] = parseInt(rawSensors.substring(i * 4, i * 4 + 4), 16);

  }

  console.log("New sensor data at "+new Date(data.timestamp));
	console.log("Raw data => \n", raw);
  console.log("Sanitized => \n", data);

  // TODO: broadcast on a specific channel
  ss.api.publish.all('flash', data);
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end();
}).listen(9000);

