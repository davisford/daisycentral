// in server/app/daisy-conversation.js

// the Net.Socket we use to talk to the Daisy
var socket;

// the queue of commands to issue to the device
var queue = [];

// callback for function (err, results);
var callback;

// indicates whether we should keep the socket open or close it
// after processing data
var keepAlive;

// the daisy instance this conversation represents
var daisy;

// dependencies
var SensorData = require('../models/sensordata')
  , Daisies = require('../models/daisies').getModel()
  , util = require('util')
  , qs   = require('querystring');



// constructor
//
// @param socket the Net.Socket
// @param ss the SocketStream object
function DaisyConversation(socket, ss) {
  module.socket = socket;
  module.ss = ss;

  // we always use ascii for daisy wifi
  socket.setEncoding('ascii');

  // setup all event handlers
  socket.on('data', onData);
  socket.on('error', onError);
  socket.on('timeout', onTimeout);
  socket.on('drain', onDrain);
  socket.on('close', onClose);
  socket.on('end', onEnd);

  // good netizen
  socket.write('HTTP/1.1 200 OK\n');

  // FIXME: avoid null reference if they never send anything
  module.callback = function() { }
}



// Send a list of commands to the Daisy
// @param commands is an array of string commands
//   you want executed.  Refer to RN41 User Manual PDF
//   for a list of valid commands.
// @keepAlive whether to leave the socket open; by default
//   the socket will be closed after finishing the commands
//   and you will have to wait for the daisy to connect again
//   before you can issue it commands
DaisyConversation.prototype.send = function(commands, keepAlive, callback) {
  module.callback = callback;
  module.keepAlive = keepAlive;

  // $$$ puts device in command mode; no carriage return
  queue.push({ cmd: '$$$', expected: 'CMD\r\n' });

  // push all the commands on the queue
  commands.forEach(function (command) {
    // each command must end in carriage return for WiFly
    if(!command.match(/[\r]$/)) { command = command + '\r'; }
    queue.push({ cmd: command });
  });

  // last command exits command mode
  queue.push({ cmd: 'exit\r', expected: '\r\nEXIT\r\n' });

  // tell the device to enter command mode
  write(queue[0].cmd);
}



// callback handler for socket.on('data')
// We should get an ascii string b/c we set the encoding
// TODO: exit command mode
function onData(data) {
  //console.log("received: \t"+data);

  // this is a querystring HTTP GET with sensordata
  if (data.match(/^GET .*/)) {
    // parse it and store it
    store(parse(data));
  } else if(queue.length !== 0) {
    // wi-fly echoes our commands; ignore these
    if(data.indexOf(queue[0].cmd) >= 0) { return; }

    // pop the oldest command off the queue
    var last = queue.shift();

    // verify the expected response
    if (last && 
        last.hasOwnProperty('expected') &&
        data !== last.expected) {
      // FIXME: what to do?
      console.log('expected does not match actual response', { expected: last.expected, actual: data });
    } 

    // do we have another command to send?
    if (queue.length === 0) {
      if (module.keepAlive === false) {
        // we are done; hangup; delay allows time for processing that is not finished
        setTimeout(function() {
          module.socket.end();
          module.callback(null, 'finished');
        }, 1000);
      }
    } else {
      write(queue[0].cmd);
    }
  } 
}



// Parses the HTTP GET query string into an object
// that we can store
// @param queryString looks like this: GET /wifly-data?DATA=051108C20874000987D70B4C6A9031093124&id=Troys-Mailbox&mac=00:06:66:72:16:81&bss=e0:46:9a:5a:c8:43&rtc=4fc2558b&bat=3066&io=510&wake=1&seq=60f&cnt=1&rssi=e7 HTTP/1.0 Host: 192.168.25.200
// @return an object that can be stored
function parse(queryString) {
  // shave off the HTTP header and parse into raw object
  var raw = qs.parse(queryString.slice(0, queryString.lastIndexOf(' HTTP')));
  
  // parse values into new object
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
  for (var i = 3; i > 0; i--) {
    mask = mask >> 1;
    data["PIO" + i] = (gpio & mask) === mask ? 1 : 0;
  }

  // process senosor values
  var sensors = raw['GET /wifly-data?DATA'].substring(4);
  for (var i = 0; i < 8; i++) {
    data["AD" + i] = parseInt(sensors.substring(i * 4, i * 4 + 4), 16);
  }

  return data;
}



// Stores the sensor data object in mongo and also
// Stores the daisy object if it doesn't exist
// Also notifies any online users about their data if they are
// setup as an owner of the device
function store(obj) {
  // get a special model with the collection name
  // that includes the mac address
  var SensorDataModel = SensorData.getModel(SensorData.getColName(obj.mac));
  var sensors = new SensorDataModel(obj);
  sensors.save(function (err, doc) {
    if (err) {
      console.log("Could not save sensor data", err);
      module.callback(err);
    } else {
      console.log("New sensor data saved at "+doc.localdate);
    }
  });

  // register the device if it isn't found in the db
  Daisies.findOne({mac: obj.mac}, function (err, daisy) {
    if (err) { 
      console.log("Could not look up daisy to create it", err);
      module.callback(err);
    } else {
      // daisy already exists
      if (daisy) {
        daisy.online = true;
        module.daisy = daisy;
        // publish the data to any owners (subscribers)
        daisy.owners.forEach(function (userId, index, arr) {
          module.ss.api.publish.user(userId, 'daisy:sensors', sensors);
          publishDaisyStatus(module.daisy);
        });
        // save the status update
        daisy.save(function (err) {
          if (err) { console.log(err); }
        });
      } else {
        // this is the first time; create it
        daisy = new Daisies({did: obj.did, mac: obj.mac, online:true});
        daisy.save(function (err, doc) {
          if (err) { 
            console.log("Could not save Daisy", err);
          } else {
            console.log("New Daisy registered! ", doc);
          }
        }); // end save
      }

      module.daisy = daisy;

      // publish to admin channel so we can see device status
      module.ss.api.publish.channel('dw:admin', 'admin:daisy:status', daisy);
    }
  }); // end findOne
}

// Write the data to the socket
// @param data the data to write, if it isn't $$$ it must end in a carriage return
// @delay if you're sending $$$ you need at least a 250ms delay; see WiFly manual
function write(data) {
  setTimeout(function () {
    module.socket.write(data);
    console.log("wrote to socket: \t"+data);
  }, 250);
}

function onError(err) {
  console.log('\t socket:error: ',err);
}

function onTimeout() {
  console.log('\t socket:timeout');
}

function onDrain() {
  console.log('\t socket:drain: drained ');
}

function onClose() {
  console.log('\t socket:close, module.daisy', module.daisy);
  if(module.daisy) {
    module.daisy.online = false;
    Daisies.findOne({mac: module.daisy.mac}, function (err, doc) {
      if (err) { 
        // cached version
        publishDaisyStatus(module.daisy);
        console.log("Could not look up daisy", module.daisy); 
      }
      else {
        if (doc) {
          doc.online = false;
          doc.save(function (err, doc) {
            if (err) { console.log("Could not update daisy to set status offline", err); }
          });
          // fresh version
          publishDaisyStatus(doc);
        } else {
          // cached version
          publishDaisyStatus(daisy);
        }
      }
    });
    // regardless of whether we're able to update the db state
    // we know the device is offline, b/c the socket is closed.
    module.ss.api.publish.channel('dw:admin', 'daisy:status', module.daisy);
  } else {
    console.log("NOT module.daisy");
  }
}

function publishDaisyStatus(daisy) {
  console.log("UPDATE DAISY STATUS: ", daisy.online);
  daisy.owners.forEach(function (userId, index, arr) {
    module.ss.api.publish.user(userId, 'daisy:status', daisy);
  });
}

// TODO: look at allowHalfOpen
function onEnd() {
  console.log('\t socket:end');
}

module.exports = DaisyConversation;


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