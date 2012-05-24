/*
  Example incoming post:
  { DATA: '051108C20872000A87D70B626A8131173121',
  id: 'Troys-Mailbox',
  mac: '00:06:66:72:16:81',
  bss: 'e0:46:9a:5a:c8:43',
  rtc: '4f87ae7d',
  bat: '3066',
  io: '510',
  wake: '1',
  seq: '7d',
  cnt: '1',
  rssi: 'e4' }

  bss = mac address of access point
  rtc = epoch ntp synchronized
  bat = supply voltage, not necessarily battery voltage
  wake = wake reason
    0 not defined
    1 power on or hardware reset
    2 awake from sleep on timer
    3 sensor interrupt
    4-5 not defined
    6 software reboot
    7 watchdog
  seq = 32 bit hex of how many posts device has made
  cnt = ?
  rssi = receiver signal strength indicator
  io = GPIO in hex
  
  AD values range from 0 to 65536, sensors typically have much less range than this.
  AD0 - RX-I (don't bother with this one)
  AD1 - Power loss/recover, high values power on, low values power off
  AD2 - Leak detection, low values leak detected, high values no leak
  AD3 - Magnetic switch, magnet close (closed) high values, magnet far (open) low values
  AD4 - Humidity detector, high values high humidity, low values low humidity
  AD5 - Temperature, cold high values, hot low values
  AD6 - Moisture (plant), low values moist, high values dry
  AD7 - Battery level, high values high batter, low values low battery

*/

var url = require('url')
  , qs  = require('querystring')
  , http = require('http')
  , conf = require('./conf')
  , SensorData = require('../models/sensordata')
  , Daisies = require('../models/daisies').getModel();

module.exports.init = function(ss) {
  module.ss = ss;

  http.createServer( function(req, res) {
    onMessage(req, res);
  }).listen(conf.deviceserver.port);
};

// message handler for incoming device sensor data
function onMessage(req, res) {

  // parse out the query params
  var raw = qs.parse(url.parse(req.url).query);
  
  // initial data structure
  var data = {
    did: raw.id,
    mac: raw.mac,
    timestamp: parseInt(raw.rtc, 16) * 1000,
    bat: parseInt(raw.bat),
    rssi: parseInt(raw.rssi, 16),
    wake: parseInt(raw.wake),
    seq: parseInt(raw.seq, 16)
  };

  // process GPIO values
  var gpio = parseInt(raw.io, 16), mask = 0x10;
  for (var i=3; i>0; i--) {
    mask = mask >> 1;
    data["PIO"+i] = (gpio & mask) === mask ? 1 : 0;
  }

  // process sensor values
  var sensors = raw.DATA.substring(4);
  for (var i=0; i<8; i++) {
    data["AD"+i] = parseInt(sensors.substring(i * 4, i * 4 + 4), 16);
  }

  // save the sensor data
  var SensorDataModel = SensorData.getModel(SensorData.getColName(data.mac));
  var sensors = new SensorDataModel(data);
  sensors.save(function (err, doc) {
    if (err) console.log(err);
    else console.log("New sensor data saved; received at:"+doc.localdate);
  });

  // register the device if not found
  Daisies.findOne({mac: data.mac}, function (err, daisy) {
    if (err) { return console.log (err); }
    if (daisy) { 
      console.log('daisy owners: ', daisy);
      daisy.owners.forEach(function (userId, idx, arr) {
        console.log('publishing sensor data to user: '+userId);
        module.ss.api.publish.user(userId, 'sensorData', sensors);
      });
    }
    else {
      daisy = new Daisies({did: data.did, mac: data.mac});
      daisy.save(function (err, doc) {
        if (err) { console.log(err); }
        else { console.log("new daisy saved ", doc); }
      });
    }
  });
  
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end();
}

