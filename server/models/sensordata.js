// in server/models/sensordata.js
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

var SensorDataSchema = new Schema({
  did:    String,
  ip:     String,
  mac:    String,
  timestamp:  { type: Number, index: true },
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

SensorDataSchema.virtual('wakeReason')
  .get(function (){
    switch(this.wake) {
      case 0: return "Not Defined";
      case 1: return "Power On or Hardware Reset";
      case 2: return "Awoke from Sleep via Timer";
      case 3: return "Sensor Interrupt";
      case 4: /* fall thru */
      case 5: return "Not Defined";
      case 6: return "Software Reboot";
      case 7: return "Watchdog";
      default: return "Unknown";
    }
  });

SensorDataSchema.virtual('localtime')
  .get(function (){
    var localNow = new Date().getTimezoneOffset(),
        min = this.timestamp / 1000 / 60;
    return (min - localNow) * 1000 * 60;
  });

SensorDataSchema.virtual('date')
  .get(function (){
    return new Date(this.timestamp);
  });

SensorDataSchema.virtual('localdate')
  .get(function (){
    return new Date(this.localtime);
  });

var SensorData = function() {
  // get the real mongoose model tied to a specific collection name
  var _getModel = function(colName) {
    if (typeof(colName) === "undefined" || colName === null || colName.length === 0) {
      throw new Error("collection name cannot be null/empty");
    }
    return mongoose.model(colName, SensorDataSchema, colName);
  }
  // generate the collection name from the mac
  var _getColName = function(mac) {
    if(typeof(mac) === "undefined" || mac === null || mac.length === 0) {
      throw new Error("mac address cannot be null/empty");
    }
    return "sensors."+mac;
  }
  return {
    getModel: _getModel,
    getColName: _getColName
  }
}();
module.exports = SensorData;

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