
// in server/auth/auth.js

var mongoose = require('mongoose')
  , conf = require('./conf')
  , Schema = mongoose.Schema
  , passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy
  , User = require('./user');

// passport local strategy
passport.use(new LocalStrategy({
    usernameField: 'email'
  },
  function (email, password, done) {
    User.authenticate(email, password, function(err, user){
      return done(err, user);
    });
  }
));

// serialize user on login
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

// deserialize user on logout
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

module.exports = {
  init: function() {
    // connect to mongodb
    mongoose.connect(conf.db.url);
    mongoose.connection.on('open', function (){
      console.log("mongodb connection established");
    });
  }
}

