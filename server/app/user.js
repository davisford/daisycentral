/** User Schema **/

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var passport = require('passport')
  , bcrypt = require('bcrypt');

var UserSchema = new Schema({
	name: {
		first: { type: String }
	  , last: { type: String }
	}
  , email: { type: String, required: true, unique: true }
  , salt: { type: String, required: true }
  , hash: { type: String, required: true }
});

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

UserSchema.static('authenticate', function (email, password, cb) {
	this.findOne({ email: email}, function (err, user){
		// database error
		if (err) { return cb(err); }
		// user not found
		if (!user) { return cb(null, false, { message: 'Unknown user' }); }
		user.verifyPassword(password, function (err, passwordCorrect) {
			// something wrong with bcrypt
			if (err) { return cb(err); }
			// password incorrect
			if (!passwordCorrect) { return cb(null, false, { message: 'Invalid password' }); }
			// success
			return cb(null, user);
		});
	});
});

module.exports = mongoose.model('User', UserSchema);