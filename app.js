// My SocketStream app

var http = require('http')
  , ss = require('socketstream')
  , express = require('express')
  , everyauth = require('everyauth');

// Define a single-page client
ss.client.define('main', {
  view: 'app.jade',
  css:  ['libs', 'app.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

ss.client.define('login', {
  view: 'login.jade',
  css: ['libs', 'app.styl'],
  code: ['libs', 'app'],
  tmpl: '*'
});

// Remove to use only plain .js, .html and .css files if you prefer
ss.client.formatters.add(require('ss-coffee'));
ss.client.formatters.add(require('ss-jade'));
ss.client.formatters.add(require('ss-stylus'));

// Use server-side compiled Hogan (Mustache) templates. Others engines available
ss.client.templateEngine.use(require('ss-hogan'));

// Minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env == 'production') ss.client.packAssets();

everyauth.twitter
  .consumerKey('nQ5UWsQvj9V2Y7eCHYbQ')
  .consumerSecret('SyB4rftvGYDP6BfTPDp0Gp63B7UBXFIbjh2Eg8ww4')
  .findOrCreateUser( function(session, accessToken, accessTokenSecret, twitterUserMetadata) {
    var userName = twitterUserMetadata.screen_name;
    console.log('Twitter username is ', userName);
    session.userId = userName;
    session.save();
    return true;
  }).redirectPath('/');

ss.http.middleware.prepend(ss.http.connect.bodyParser());
ss.http.middleware.append(everyauth.middleware());

// Start web server
var server = express.createServer(ss.http.middleware);
everyauth.helpExpress(server);
server.listen(3000);

server.get('/', function (req, res) {
  res.serveClient('main');
});

server.get('/login', function(req, res) {
  res.serveClient('login');
});

http.createServer(function(req,res) {
	console.log(req.url);
  ss.api.publish.all('flash', req.url);
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end();
}).listen(9000);



// Start SocketStream
ss.start(server);