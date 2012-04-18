// Server-side Code

// Define actions which can be called from the client using ss.rpc('demo.ACTIONNAME', param1, param2...)
exports.actions = function(req, res, ss) {

  // Example of pre-loading sessions into req.session using internal middleware
  req.use('session');

  // Uncomment line below to use the middleware defined in server/middleware/example
  req.use('security.authenticated');

  req.use(multiplyNumber, 2);

  return {
    sendMessage: function(message) {
      if (message && message.length > 0) {         // Check for blank messages
        ss.publish.all('newMessage', message);     // Broadcast the message to everyone
        return res(true);                          // Confirm it was sent to the originating client
      } else {
        return res(false);
      }
    },

    getUser: function() {
      return res(req.session.auth.google.user);
    },

    testAction: function() {
      console.log('session: ', req.session);
    },

    showResult: function(n) {
      res('The incoming number is '+n);
    }

  };

};

multiplyNumber = function(multiplier) {
  return function(req, res, next) {
    var num = req.params[0];
    if (num && typeof(num) == 'number')
      req.params[0] = (num * multiplier);
    next();
  }
}