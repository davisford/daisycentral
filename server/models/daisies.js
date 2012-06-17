// in server/models/daisies.js
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , lastmodified = require('./plugins/lastmodified')
  , ss = require('socketstream');

var DaisiesSchema = new Schema({
	did: { type: String, index: true },
	mac: { type: String, index: true },
  	online: { type: Boolean, index: true },
	owners: [{ type: ObjectId, index: true, ref: 'User' }],
	key: { type: String, unique: true }
});

DaisiesSchema.plugin(lastmodified);

var Daisies = function() {
	var _getModel = function() { return mongoose.model("Daisies", DaisiesSchema); }
	return {
		getModel: _getModel
	}
}();
module.exports = Daisies;