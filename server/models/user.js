// in server/models/user.js

var mongoose = require('mongoose')
  , bcrypt = require('bcrypt')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

var UserSchema = new Schema({
  roles: [String],
  lockedOut: Boolean,
  lastLogin: Date,
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

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validatePassword(one, two) {
  if(typeof(one) === "undefined" || one === null) { return "Password cannot be null or empty"; }
  if(one !== two) { return "Passwords do not match"; }
  if(one.length < 6) { return "Password should be at least 6 characters long"; }
}

var User = mongoose.model('User', UserSchema);

module.exports.UserSchema = UserSchema;
module.exports.User = User;