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
    , email: { type: String, index: true, unique: true }
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

// mongoose-auth plugin for twit, fb, goog; decorates schema
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
    , findOrCreateUser: function (session, accessTok, accessTokSecret, twitterUser) {
      var promise = this.Promise()
        , User = this.User()();
      User.findById(session.auth.userId, function (err, user) {
        if (err) return promise.fail(err);
        if (!user) {
          // twitter metadata doesn't have email; so no other way to link up
          User.createWithTwitter(twitterUser, accessTok, accessTokSecret, function (err, createdUser) {
            if (err) return promise.fail(err);
            return promise.fulfill(createdUser);
          }); // end createWithTwitter
        } else {
          assignTwitterDataToUser(user, accessTok, accessTokSecret, twitterUser);
          user.save(function (err, user) {
            if (err) return promise.fail(err);
            return promise.fulfill(user);
          });
        }
      }); // end findById
      return promise;
    }
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
            assignGoogleDataToUser(user, accessTok, accessTokExtra, googleUser);
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

function assignGoogleDataToUser(user, token, tokenExtra, googleUser) {
  console.log("\n google user metadata => \n", googleUser);
  user.google.accessToken = token;
  user.google.expires = tokenExtra.expires;
  user.google.refreshToken = googleUser.refreshToken;
  user.google.email = googleUser.email;

  /* added by my mongoose-auth fork davisford/mongoose-auth */
  user.google.id = googleUser.id;
  user.google.verifiedEmail = googleUser.verified_email;
  user.google.name = googleUser.name;
  user.google.givenName = googleUser.given_name;
  user.google.familyName = googleUser.family_name;
  user.google.link = googleUser.link;
  user.google.picture = googleUser.picture;
  user.google.gender = googleUser.gender;
  user.google.locale = googleUser.locale;
}

function assignTwitterDataToUser(user, token, tokenExtra, twitterUser) {
  console.log("\n twitter user metadata => \n", twitterUser);
  user.twit.accessToken = token;
  user.twit.accessTokenSecret = tokenExtra;
  user.twit.id = twitterUser.id;
  user.twit.name = twitterUser.name;
  user.twit.screenName = twitterUser.screen_name;
  user.twit.location = twitterUser.location;
  user.twit.description = twitterUser.description;
  user.twit.profileImageUrl = twitterUser.profile_image_url;
  user.twit.url = twitterUser.url;
  user.twit.protected = twitterUser.protected;
  user.twit.followersCount = twitterUser.followersCount;
  user.twit.friendsCount = twitterUser.friends_count;
  user.twit.utcOffset = twitterUser.utc_offset;
  user.twit.timeZone = twitterUser.time_zone;
  user.twit.profileBackgroundImageUrl = twitterUser.profile_background_image_url;
  user.twit.verified = twitterUser.verified;
  user.twit.statusesCount = twitterUser.statuses_count;
  user.twit.lang = twitterUser.lang;
}

// disable for production
everyauth.debug=conf.everyauth.debug;
