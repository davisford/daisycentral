
// in server/auth/auth.js

var conf         = require('../../conf')
  , everyauth    = require('everyauth')
  , mongoose     = require('mongoose')
  , mongooseAuth = require('mongoose-auth');

var Promise = everyauth.Promise
  , Schema  = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , UserSchema = new mongoose.Schema({
      roles: [String]
    , active: Boolean
  })
  , User;

module.exports.init = function(ss, app) {
  app.use(mongooseAuth.middleware());
  mongooseAuth.helpExpress(app);
}

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
mongoose.connect('mongodb://localhost/daisycentral');
User = mongoose.model('User');
everyauth.everymodule.findUserById( function (userId, callback) {
  console.log('findUserById: '+userId);
  User.findById(userId, callback);  
});
// disable for production
everyauth.debug=conf.everyauth.debug;

