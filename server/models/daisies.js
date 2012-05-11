// in server/models/daisies.js
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , lastmodified = require('./plugins/lastmodified');

var DaisiesSchema = new Schema({
	did: { type: String, index: true },
	mac: { type: String, index: true },
	owners: { type: [ObjectId], index: true },
	key: { type: String }
});
DaisiesSchema.plugin(lastmodified);

var Daisies = function() {
	var _getModel = function() { return mongoose.model("Daisies", DaisiesSchema); }
	return {
		getModel: _getModel
	}
}();
module.exports = Daisies;