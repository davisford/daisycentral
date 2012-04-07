// My SocketStream app

var http = require('http')
  , ss = require('socketstream')
  , express = require('express')
  , auth = require('./server/config/everyauth.js').init(ss)
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
ss.client.formatters.add(require('ss-jade'));
ss.client.formatters.add(require('ss-stylus'));

// Use server-side compiled Hogan (Mustache) templates. Others engines available
ss.client.templateEngine.use(require('ss-hogan'));

// Minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env == 'production') ss.client.packAssets();

ss.http.middleware.prepend(ss.http.connect.bodyParser());

// Start web server
var server = express.createServer(ss.http.middleware);
//everyauth.helpExpress(server);
server.listen(3000);

server.get('/', function (req, res) {
  if(req.session.userId)
    res.serveClient('main');
  else
    res.serveClient('login');
});

server.get('/login', function(req, res) {
  res.serveClient('login');
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

