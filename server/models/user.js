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
  email: { type: String, unique: true },
  hash: { type: String }
});

/**
 * Virtual get/set on password to encrypt
 * FIXME currently using synch bcrypt here = BAD
 *   switch to async bcrypt using setPassword function
 *   https://github.com/LearnBoost/mongoose/issues/517
 */
UserSchema
  .virtual('password')
  .get(function (){
    return this._password;
  })
  .set(function (password){
    this._password = password;
    this.hash = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  });

/**
 * Returns a string handle for the user.  Returns their name if
 * it exists, otherwise, returns their email address.
 */
UserSchema
  .virtual('handle')
  .get(function (){
    if (this.name.first || this.name.last) {
      return this.name.first + " " + this.name.last;
    } else {
      return this.email;
    }
  });

/**
 * Uses bcrypt to verify a password against the hash
 */
UserSchema.method('verifyPassword', function (password, cb) {
  if(typeof(password) === "undefined" || password === null) return cb(null, false);
  return bcrypt.compare(password, this.hash, cb);
});

/**
 * Static authenticate method
 * @param {email} [string] the email address
 * @param {password} [string] the password
 * @param {cb} [Function] callback function(err, user, message)
 */
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
//
// I removed Twitter OAuth support b/c Twitter does not provide
// the user's email address.  Email is unique index, and thus
// we have no way to either link it up to a previously registered
// user or prevent duplicate key index errors b/c the email will
// be null every time.
//
// I removed Facebook Oauth support b/c I hate FB..well, anyway
// FB was giving me a hassle registering as a dev. on their site
// ...kept claiming I was not real and wanted me to scan and upload
// my driver's license - I AM NOT KIDDING.  FB can go F themselves.
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
, google: {
    everyauth: {
      myHostname: conf.google.myHostname
    , appId: conf.google.clientId
    , appSecret: conf.google.clientSecret
    , redirectPath: '/'
    , scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
    , findOrCreateUser: function (session, accessTok, accessTokExtra, googleUser) {

        var promise = this.Promise();
      
        // if the user is already logged in, we can find them by session.userId
        User.findById(session.userId, function (err, user) {
      
          if (err) { 
            console.log("error finding user by id: ", err);
            return promise.fail(err);
          } 
      
          if (!user) {

            // let's see if this user has registered already
            User.where('email', googleUser.email).findOne( function (err, user) {
              
              if (err) {
                console.log("error finding user by email: ", err);
                return promise.fail(err);
              } 

              if (!user) {

                // let everyauth create the user
                User.createWithGoogle(googleUser, accessTok, accessTokExtra.expires, function (err, createdUser) {
                  if (err) {
                    console.log("error trying to create google user: ", err);
                    return promise.fail(err);
                  } else {
                    // sign them in =>
                    session.userId = createdUser._id;
                    return promise.fulfill(createdUser);
                  }
                });

              } else {
                // user already registered with same email
                // copy google properties over and save to db
                saveGoogleUserData(session, promise, user, accessTok, accessTokExtra, googleUser);
              }
            }); // end find by email
          } else {
            // we did find the user by session.userId
            // copy google properties over and save to db
            saveGoogleUserData(session, promise, user, accessTok, accessTokExtra, googleUser);
          }
        }); // end findById
        return promise;
      } // end findOrCreateUser
    } // end everyauth
  } // end google
});

// you have to set this on everyauth for things to work
everyauth.everymodule.findUserById(function (userId, callback) {
  User.findById(userId, callback);
});

/**
 * Validates an email against a RegEx
 * @return true if ok, false if email is no good
 */
function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

/**
 * Validate a password against our _strict_ password requirements
 * @return an error || undefined if passwords are ok
 */
function validatePassword(one, two) {
  if(typeof(one) === "undefined" || one === null) { return "Password cannot be null or empty"; }
  if(one !== two) { return "Passwords do not match"; }
  if(one.length < 6) { return "Password should be at least 6 characters long"; }
}

/**
 * 1) Copy the properties from Google OAuth user metadata to our User
 * 2) Save to database
 * 3) Update session.userId to sign them in
 * @param {session} [object] the session object
 * @param {promise} [object] the Promise object
 * @param {token} [object] the OAuth token object
 * @param {tokenExtra} [object] extra OAuth token info (e.g. expiration date)
 * @param {googleUser} [object] google user metadata
 */
function saveGoogleUserData(session, promise, user, token, tokenExtra, googleUser) {
  user.email = googleUser.email;
  user.name.first = googleUser.given_name;
  user.name.last = googleUser.family_name;

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

  user.save( function (err, user) {
    if (err) {
      console.log("error trying to save updated user: ", err);
      return promise.fail(err);
    } else {
      session.userId = user._id;
      return promise.fulfill(user);
    }
  });
}

var User = mongoose.model('User', UserSchema);
module.exports.User = User;
