// in server/app/daisyServer.js

var conf = require('./conf')
  , net  = require('net')
  , DaisySession = require('./daisy-session');

// singleton
var DaisyServer = (function () {
  var server, ss, sessions = {};

  function sessionReady(mac, daisySession) {
    sessions[mac] = daisySession;
    console.log("session count: "+sessions);
  }

  function sessionClosed(mac) {
    delete sessions[mac];
  }

  function createServer(ss) {
    if (!server) {
      var server = net.createServer( function (socket) {
        console.log('new connection made on daisy server');
        var daisySession = new DaisySession(socket, ss);

        daisySession.on('dc:initialized', sessionReady);
        daisySession.on('dc:closed', sessionClosed);
      }).listen(conf.deviceserver.port, function () {
        console.log('daisy server listening on port '+conf.deviceserver.port);
      });
    }
    return server;
  }

  return {
    
    /**
     * Initialize the server
     */
    init: function (ss) {
      if (!ss) { throw new Error("must pass SocketStream object"); }
      this.ss = ss;
      return this;
    },

    /**
     * Start the server
     */
    start: function() {
      if (!this.ss) { throw new Error("Server has not been initialized yet"); }
      this.server = createServer(this.ss);
      return this;
    },

    /**
     * Get a session via its mac address
     */
    getSession: function(mac) {
      return sessions[mac];
    }
  }
})();


module.exports = DaisyServer;



