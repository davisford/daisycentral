// in server/models/user.js

var conf = require('../app/conf')
  , mongoose = require('mongoose')
  , mongooseAuth = require('mongoose-auth')
  , bcrypt = require('bcrypt')
  , everyauth = require('everyauth')
  , lastmodified = require('./plugins/lastmodified');
  
var Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , Promise = everyauth.Promise;

var UserSchema = new Schema({
  roles: [String],
  lockedOut: Boolean,
  name: {
    first: { type: String },
    last: { type: String }
  },
  email: { type: String, unique: true, index: true },
  hash: { type: String }
});

// virtual get/set on password to encrypt
// FIXME using synchronous bcrypt here
// switch to async using setPassword function
// see https://github.com/LearnBoost/mongoose/issues/517
UserSchema
  .virtual('password')
  .get(function (){
    return this._password;
  })
  .set(function (password){
    this._password = password;
    this.hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  });

// verify password method
UserSchema.method('verifyPassword', function (password, cb) {
  if(typeof(password) === "undefined" || password === null) return cb(null, false);
  return bcrypt.compare(password, this.hash, cb);
});

// Static authenticate method 
// @param {email} the email address
// @param {password} the password
// @param {cb} callback function(error, user, message);
UserSchema.static('authenticate', function (email, password, cb) {
  this.findOne( {email: email}, function (err, user) {
    if (err) {
      return cb(err);
    }
    if (!user) {
      return cb(null, null, { message: "Unknown user "+email });
    }
    user.verifyPassword(password, function (err, isValid) {
      if (err) {
        return cb(err);
      }
      if (!isValid) {
        return cb(null, null, { message: "Invalid password for user "+email});
      } else {
        // success
        return cb(null, user);
      }
    }); // end verifyPassword
  }); // end findOne
}); // end static authenticate

// Static register method
// @param {email} the email address
// @param {password} the password
// @param {confirm} confirm the password
// @param {cb} callback function(error, user, message);
UserSchema.static('register', function(email, password, confirm, cb) {
  if(validateEmail(email) === false) {
    return cb(null, null, { message: "Email is invalid "+email });
  }
  var err = validatePassword(password, confirm);
  if(err) { return cb(null, null, { message: err }); }

  this.findOne( {email: email}, function (err, user) {
    if (err) { 
      return cb(err);
    }
    if (user) {
      return cb(null, null, { message: "User is already registered" });
    } else {
      user = new User({email: email, password: password});
      user.save(function (err) {
        if (err) {
          return cb(err);
        } else {
          return cb(null, user, null);
        }
      });
    }
  });
});

UserSchema.static('findByEmail', function(email, cb) {
  this.findOne( {email: email}, function (err, user) {
    if (err) {
      return cb(err);
    } else {
      return cb(null, user);
    }
  });
});

/* ------------- UserSchema Plugins -------------- */

UserSchema.plugin(lastmodified);

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
        User.findById(session.userId, function (err, user) {
          if (err) return promise.fail(err);
          if (!user) {
            // twitter metadata doesn't have email; so no other way to link up
            User.createWithTwitter(twitterUser, accessTok, accessTokSecret, function (err, createdUser) {
              if (err) return promise.fail(err);
              return promise.fulfill(createdUser);
            }); // end createWithTwitter
          } else {
            assignTwitterDataToUser(user, accessTok, accessTokSecret, twitterUser);
            User.save(function (err, user) {
              if (err) return promise.fail(err);
              return promise.fulfill(user);
            });
          }
        }); // end findById
        return promise;
      } // end findOrCreateuser
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
        //, User = this.User()();
        User.findById(session.userId, function (err, user) {
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
                //user = user.toObject({getters: true, virtuals: true});
                assignGoogleDataToUser(user, accessTok, accessTokExtra, googleUser);
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

everyauth.everymodule.findUserById(function (userId, callback) {
  console.log('findUserById: '+userId);
  User.findById(userId, callback);
});

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validatePassword(one, two) {
  if(typeof(one) === "undefined" || one === null) { return "Password cannot be null or empty"; }
  if(one !== two) { return "Passwords do not match"; }
  if(one.length < 6) { return "Password should be at least 6 characters long"; }
}

function assignGoogleDataToUser(user, token, tokenExtra, googleUser) {
  console.log("\n user => \n", user);
  console.log("\n google user metadata => \n", googleUser);
  console.log("\n token => ", token);
  console.log("\n tokenExtra => ", tokenExtra);
  console.log("user.google", user.google);
  console.log("user.google.accessToken", user.google.accessToken);
  user.google['accessToken'] = token;
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

var User = mongoose.model('User', UserSchema);
module.exports.User = User;
