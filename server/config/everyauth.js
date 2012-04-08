var everyauth = require('everyauth')
  , Promise = everyauth.Promise
  , conf = require('./conf')
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , UserSchema = new Schema({})
  , User;

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
      myHostname: 'http://local.host:3000'
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

module.exports.init = function(ss, server) {
  ss.http.middleware.append(everyauth.middleware());

  everyauth.helpExpress(server);
  // so we can use 'everyauth' in jade
  ss.client.formatters.add(require('ss-jade'), {locals: {everyauth: everyauth}});
};

everyauth.everymodule.logoutRedirectPath('/login');

var usersByLogin = [];

// PASSWORD AUTH
/*everyauth.password
  .getLoginPath('/login')
  .postLoginPath('/login')
  .loginView('views/login.jade')
  .authenticate( function (login, password) {
    if(usersByLogin[login] && usersByLogin[login].password === password) {
      return usersByLogin[login];
    } else {
      return ['Login failed'];
    }
  })
  .loginSuccessRedirect('/') 
  .getRegisterPath('/register')
  .postRegisterPath('/register')
  .registerView('register.jade')
  .validateRegistration( function (newUserAttributes) {

  })
  .registerUser( function (newUserAttributes) {

  })
  .registerSuccessRedirect('/');*/

// TWITTER
everyauth.twitter
  .consumerKey('nQ5UWsQvj9V2Y7eCHYbQ')
  .consumerSecret('SyB4rftvGYDP6BfTPDp0Gp63B7UBXFIbjh2Eg8ww4')
  .findOrCreateUser( function(session, accessToken, accessTokenSecret, twitterUserMetadata) {
    // todo store in redis/mongo;
    console.dir(twitterUserMetadata);
    session.save();
    console.dir(everyauth);
    return true;
  }).redirectPath('/');

// FACEBOOK not working
// fb sucks; thinks my account is fake or something
// also doesn't work with localhost - what a pile of dung
// maybe i'll remove facebook integration b/c i hate it 
everyauth.facebook
  .appId('407914185903096')
  .appSecret('9875f012ac2b24d3e9e4583b9c9a5d29')
  .handleAuthCallbackError( function (req, res) {
    console.log('facebook auth error');
  })
  .scope('email')
  .findOrCreateUser( function(session, accessToken, accessTokenExtra, fbUserMetadata) {
    // todo store in redis/mongo;
    console.dir(fbUserMetadata);
    session.save();
    return true;
  }).redirectPath('/');

// GOOGLE
everyauth.google
  .appId('897736032157.apps.googleusercontent.com')
  .appSecret('pEXRmB-rLZXVkAiujEkhcJGZ')
  .scope(['https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'])
  .handleAuthCallbackError( function (req, res) {
    console.log('google auth error');
  })
  .findOrCreateUser( function (session, accessToken, accessTokenExtra, googleUserMetadata) {
    // todo store in redis/mongo;
    console.dir(googleUserMetadata);
    session.save();
    return true;
  }).redirectPath('/');



// logout
everyauth.everymodule.handleLogout( function (req, res) {
   console.log('loggin out');
   req.session.userId = undefined;
   req.logout();
   console.log('redirecting');
   this.redirect(res, this.logoutRedirectPath());
});