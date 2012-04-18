// in server/app/oauth.js

var conf = require('./conf')
  , bcrypt = require('bcrypt')
  , everyauth = require('everyauth')
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth');

var Promise = everyauth.Promise
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

// user schema defnition
var UserSchema = new mongoose.Schema({
      roles: [String]
    , lockedOut: Boolean
    , lastLogin: Date
    , name: {
      first: { type: String }
      , last: { type: String }
    }
    , email: { type: String, unique: true }
    , salt: { type: String }
    , hash: { type: String }
  })
  , User;

// add virtual function to encrypt/decrypt password
UserSchema
  .virtual('password')
  .get(function (){
    return this._password;
  })
  .set(function (password){
    this._password = password;
    var salt = this.salt = bcrypt.genSaltSync(10);
    this.hash = bcrypt.hashSync(password, salt);
  });

// verifyPassword method on User
UserSchema.method('verifyPassword', function (password, cb) {
  bcrypt.compare(password, this.hash, cb);
});

// add static authenticate method on user
UserSchema.static('authenticate', function (email, password, cb) {
  this.findOne( {email: email}, function (err, user) {
    if (err) {
      console.error('db error', err);
      return cb(err);
    }
    if (!user) {
      return cb(null, false, { message: 'Unknown user' });
    }
    user.verifyPassword(password, function (err, isValid) {
      if (err) {
        console.error('bcrypt error', err);
        return cb(err);
      }
      if (!isValid) {
        return cb(null, false, { message: 'Invalid password'});
      } else {
        return cb(null, user);
      }
    }); // end verifyPassword
  }); // end findOne
}); // end static authenticate

// mongoose-auth plugin for twit, fb, goog
UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function() {
        return User;
      },
      handleLogout: function (req, res) {
        req.logout();
        req.session.userId = undefined;
        req.session.destroy();
        res.writeHead(303, { 'Location': this.logoutRedirectPath() });
        res.end();
      }
    }
  }
, facebook: {
    everyauth: {
      myHostname: conf.fb.myHostname
    , appId: conf.fb.appId
    , appSecret: conf.fb.appSecret
    , redirectPath: '/'
    } // end everyauth
  } // end facebook
, twitter: {
    everyauth: {
      myHostname: conf.twit.myHostname
    , consumerKey: conf.twit.consumerKey
    , consumerSecret: conf.twit.consumerSecret
    , redirectPath: '/'
    } // end everyauth
  } // end twitter
, google: {
    everyauth: {
      myHostname: conf.google.myHostname
    , appId: conf.google.clientId
    , appSecret: conf.google.clientSecret
    , redirectPath: '/'
    , scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
    , findOrCreateUser: function (session, accessTok, accessTokExtra, googleUser) {
        var promise = this.Promise()
        , User = this.User()();
        User.findById(session.auth.userId, function (err, user) {
          if (err) return promise.fail(err);
          if (!user) {
            User.where('email', googleUser.email).findOne( function (err, user) {
              if (err) return promise.fail(err);
              if (!user) {
                User.createWithGoogle(googleUser, accessTok, accessTokExtra.expires, function (err, createdUser) {
                  if (err) return promise.fail(err);
                  return promise.fulfill(createdUser);
                });
              } else {
                assignGoogleDataTouser(user, accessTok, accessTokExtra, googleUser);
                user.save( function (err, user) {
                  if (err) return promise.fail(err);
                  promise.fulfill(user);
                });
              }
            });
          } else {
            assignGoogleDataTouser(user, accessTok, accessTokExtra, googleUser);
            user.save( function(err, user) {
              if (err) return promise.fail(err);
              promise.fulfill(user);
            });
          }
        }); // end findById
        return promise;
      } // end findOrCreateUser
    } // end everyauth
  } // end google
});

User = mongoose.model('User', UserSchema);

everyauth.everymodule.findUserById(function (userId, callback) {
  console.log('findUserById: '+userId);
  User.findById(userId, callback);
});

function assignGoogleDataTouser(user, token, tokenExtra, googleUser) {
  console.dir(googleUser);
  user.google.accessToken = token;
  user.google.expires = tokenExtra.expires;
  user.google.refreshToken = googleUser.refreshToken;
  user.google.email = googleUser.email;
}

// disable for production
everyauth.debug=conf.everyauth.debug;
