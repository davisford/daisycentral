// in server/app/daisyServer.js

var conf = require('./conf')
  , net  = require('net')
  , DaisyConversation = require('./daisy-conversation');

// singleton
var DaisyServer = (function () {
  var server, ss, convos = {};

  function daisyConvoReady(mac, daisyConvo) {
    convos[mac] = daisyConvo;
  }

  function daisyConvoClosed(mac) {
    convos[mac] = undefined;
  }

  function createServer(ss) {
    var server = net.createServer( function (socket) {
      console.log('new connection made on daisy server');
      var daisyConvo = new DaisyConversation(socket, ss);

      daisyConvo.on('dc:initialized', daisyConvoReady);
      daisyConvo.on('dc:closed', daisyConvoClosed);

    }).listen(conf.deviceserver.port, function () {
      console.log('daisy server listening on port '+conf.deviceserver.port);
    });

    return server;
  }

  return {
    init: function (ss) {
      if (!ss) { throw new Error("must pass SocketStream object"); }
      this.ss = ss;
      return this;
    },

    start: function() {
      if (!this.ss) { throw new Error("Server has not been initialized yet"); }
      this.server = createServer(this.ss);
      return this;
    },

    getConvo: function(mac) {
      return convos[mac];
    }
  }
})();


module.exports = DaisyServer;



