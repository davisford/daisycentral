// in server/models/daisy.js

/*
	{ "did" : "Troys-Mailbox", 
	  "ip" : "192.168.25.132", 
	  "mac" : "00:06:66:72:16:81", 
	  "timestamp" : 1335246150000, 
	  "bat" : 3069, 
	  "rssi" : 230, 
	  "wake" : 7, 
	  "seq" : 81, 
	  "PIO3" : 0, 
	  "PIO2" : 0, 
	  "PIO1" : 0, 
	  "AD0" : 2237, 
	  "AD1" : 2166, 
	  "AD2" : 10, 
	  "AD3" : 34803, 
	  "AD4" : 3131, 
	  "AD5" : 27265, 
	  "AD6" : 12560, 
	  "AD7" : 12574, 
	  "_id" : ObjectId("4f963d422c6fab0000000008") 
 */

var mongoose = require('mongoose');
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

var DaisyMetaSchema = new Schema({
  mac:    String,
  owners: [ObjectId],
  posts: Number
});

var DaisySchema = new Schema({
  did:    String,
  ip:     String,
  mac:    String,
  timestamp:  Number,
  bat:  Number,
  rssi: Number,
  wake: Number,
  seq:  Number,
  PIO1: Number,
  PIO2: Number,
  PIO3: Number,
  AD0: Number,
  AD1: Number,
  AD2: Number,
  AD3: Number,
  AD4: Number,
  AD5: Number,
  AD6: Number,
  AD7: Number
});