// in server/app/daisyServer.js

var conf = require('./conf')
  , net  = require('net')
  , DaisyConversation = require('./daisy-conversation');

module.convos = {};

module.exports.init = function(ss) {
  module.ss = ss;

  var server = net.createServer(function (socket) {
    console.log('connection was made to daisy server');
    var daisyConvo = new DaisyConversation(socket, ss, function (mac) {
      module.convos.mac = daisyConvo;
    });

    // REMOVE ME: just to see that it is working
    daisyConvo.send(['get ip'], false, function (err, resp) {
      if (err) { console.log ("ERROR => ", err); }
      if (resp) { console.log ("Message from DaisyConvo: ", resp); }
    }); 
  }).listen(conf.deviceserver.port, function () {
    console.log('server is bound and ready');
  });
}

module.exports.getConvo = function(mac) {
  return module.convos[mac];
}

