// in server/models/customer.js

var Customer = function() {

  var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

  var CustomerSchema = new Schema({
  	id 		: Number,
  	email 	: {type: String, index: { unique: true, required: true} },
  	first 	: String,
  	last 	: String,
  	crypted_password: String,
  	auth_token: String,
  	invoices: [{type: Schema.ObjectId, ref : 'Invoice'}]
  });

  var _model = mongoose.model('customers', CustomerSchema);

  var _authenticate = function(email, password, callback) {
  	customer.findByEmail({email:email}, 
  		function(e) {
  			callback(e);
  		},
  		function(doc) {
  			if(password === doc.password) {
  				callback(true);
  			} else { callback(false); }
  		})
  }

  var _register = function(email, password, confirm, callback) {
    var customer = new Customer({email:email, password:password});
    customer.save(function (err) {
    	callback(err);
    });
  }

  var _findByEmail = function(email, success, fail) {
  	_model.findOne({email:email}, function(e, doc) {
  		if(e) { fail(e); }
  		else { success(doc); }
  	});
  }

  return {
  	schema: CustomerSchema,
  	model: _model,
  	findByEmail: _findByEmail,
  	authenticate: _authenticate,
  	register: _register
  }
}();
module.exports = Customer;