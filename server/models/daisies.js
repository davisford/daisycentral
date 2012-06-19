// in server/models/daisies.js

var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId
  , channels = require('../app/channels')
  , lastmodified = require('./plugins/lastmodified');

/**
 * Model object for Daisy meta-info (not sensors)
 */
module.exports = function(ss) {

  if (!ss) 
    throw new Error("must pass SocketStream object");

  var DaisiesSchema = new Schema({
    // human-readable name
    did: { type: String, index: true },
    // mac address
    mac: { type: String, index: true },
    // status (i.e. socket connected? )
    online: { type: Boolean, index: true },
    // hold Socket on next connect?
    hold: { type: Boolean, index: true },
    // associated users
    owners: [{ type: ObjectId, index: true, ref: 'User' }],
    // secret registration key
    key: { type: String, unique: true }
  });

  // use last-modified plugin
  DaisiesSchema.plugin(lastmodified);

  /**
   * Pub/sub status whenever model is saved
   */
  DaisiesSchema.pre('save', function (next) {

    // publish daisy status to admin channel
    ss.api.publish.channel(channels.admin, channels.admin.daisy.status, this);
    
    if(this.owners && this.owners.length > 0) {

      // publish daisy status to each user channel
      this.owners.forEach( function(userId, idx, arr) {
        ss.api.publish.user(userId.toString(), channels.user.daisy.status, this);
      });

      next();

    } else {
      next();
    }

  }); 

  return mongoose.model("Daisies", DaisiesSchema);

};