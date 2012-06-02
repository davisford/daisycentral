// in server/app/daisy-conversation.js

var SensorData = require('../models/sensordata')
  , Daisies = require('../models/daisies').getModel()
  , util = require('util')
  , events = require('events')
  , qs   = require('querystring');

// DaisyConversation subclasses EventEmitter
util.inherits(DaisyConversation, events.EventEmitter);

/**
 * Represents a bi-directional conversation between a connected Daisy
 * and any other client.  Clients send commands to the Daisy.
 * 
 * @constructor
 *
 * @param {Net.Socket} [socket] a connected socket
 * @param {SocketStream} [ss] the socket stream object
 */
function DaisyConversation(socket, ss) {
  this.socket = socket;
  this.ss = ss;
  this.keepAlive = true;
  this.queue = [];
  this.callback = function(err, res) { };
  var me = this;

  // we always use ascii for daisy wifi
  socket.setEncoding('ascii');

  // good netizen
  socket.write('HTTP/1.1 200 OK\n');

  // subclass EventEmitter
  events.EventEmitter.call(this);

  /* --------------- Privileged Methods ---------------- */

  /**
   * Parses the querystring into an object
   * @param {string} [queryString] the querystring from HTTP request; example: GET /wifly-data?DATA=051108C20874000987D70B4C6A9031093124&id=Troys-Mailbox&mac=00:06:66:72:16:81&bss=e0:46:9a:5a:c8:43&rtc=4fc2558b&bat=3066&io=510&wake=1&seq=60f&cnt=1&rssi=e7 HTTP/1.0 Host: 192.168.25.200
   * @return {object} with sensor data
   */
  this.parseData = function (queryString) {
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

    // notify server that we are initialized for this mac
    me.emit('dc:initialized', data.mac, me);

    return data;
  } // end this.parseData

  /**
   * Persists the sensor data into {SensorData} model.  If this is the
   * very first post by a daisy device, it will also persist a {Daisies}
   * record or update the {Daisies} record with the online status.
   * @param {object} [obj]
   */
  this.storeData = function (obj) {
    // get a special model with the collection name
    // that includes the mac address
    var SensorDataModel = SensorData.getModel(SensorData.getColName(obj.mac));
    var sensors = new SensorDataModel(obj);
    sensors.save(function (err, doc) {
      if (err) {
        console.log("Could not save sensor data", err);
        me.callback(err);
      } else {
        console.log("New sensor data saved at "+doc.localdate);
      }
    });

    // register the device if it isn't found in the db
    Daisies.findOne({mac: obj.mac}, function (err, daisy) {
      if (err) { 
        console.log("Could not look up daisy to create it", err);
        me.callback(err);
      } else {
        // daisy already exists
        if (daisy) {
          daisy.online = true;
          me.daisy = daisy;
          // publish the data to any owners (subscribers)
          daisy.owners.forEach(function (userId, index, arr) {
            me.ss.api.publish.user(userId, 'daisy:sensors', sensors);
            me.pubStatus(me.daisy);
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

        me.daisy = daisy;

        // publish to admin channel so we can see device status
        me.ss.api.publish.channel('dw:admin', 'admin:daisy:status', daisy);
      }
    }); // end findOne
  } // end this.storeData
  
  /**
   * Callback for socket.on('data')
   * @param {string} [data] should be ASCII if we set the socket config
   */
  this.onData = function (data) {
    // this is a querystring HTTP GET with sensor data
    if (data.match(/^GET .*/)) {
      // parse it and store it
      me.storeData(me.parseData(data));
    } else if(me.queue.length !== 0) {
      // wi-fly echoes our commands; ignore these
      if(data.indexOf(me.queue[0].cmd) >= 0) { return; }

      // pop the oldest command off the queue
      var last = me.queue.shift();

      // verify the expected response
      if (last && 
          last.hasOwnProperty('expected') &&
          data !== last.expected) {
        // FIXME: what to do?
        console.log('expected does not match actual response', { expected: last.expected, actual: data });
      } 

      // all commands exhausted?
      if (me.queue.length === 0) {
        if (me.keepAlive === false) {
          // we are done; hangup; delay allows time for processing that is not finished
          setTimeout(function() {
            me.socket.end();
            me.callback(null, 'finished');
          }, 1000);
        }
      } else {
        write(me.queue[0].cmd);
      } // else queue is finished, but leave the socket open for future writes
    }
  } // end this.onData

  /**
   * Write a command to the Daisy
   * @param {string} [command]
   */
  this.write = function(command) {
    setTimeout(function () {
      me.socket.write(command);
      console.log('written to socket: \t'+command);
    }, 250);
  } // end _write

  /**
   * Net.Socket error handler
   */
  this.onError = function(err) {
    console.log('\t socket:error: ', err);
  }

  /**
   * Net.Socket timeout handler
   */
  this.onTimeout = function() {
    console.log('\t socket:timeout');
  }

  /**
   * Net.Socket close handler. When it closes we want to do pub/sub
   * to all consumers so they have an updated status on the connection.
   * We also need to fire our own 'dc:closed' event
   */
  this.onClose = function() {
    console.log('\t socket:close, this.daisy', me.daisy);
    if(me.daisy) {
      me.daisy.online = false;
      Daisies.findOne({mac: me.daisy.mac}, function (err, doc) {
        if (err) { 
          // cached version
          me.pubStatus(me.daisy);
          console.log("Could not look up daisy", me.daisy); 
        }
        else {
          if (doc) {
            doc.online = false;
            doc.save(function (err, doc) {
              if (err) { console.log("Could not update daisy to set status offline", err); }
            });
            // fresh version
            me.pubStatus(doc);
          } else {
            // cached version
            me.pubStatus(me.daisy);
          }
        }
      });
      // regardless of whether we're able to update the db state
      // we know the device is offline, b/c the socket is closed.
      me.ss.api.publish.channel('dw:admin', 'daisy:status', me.daisy);
      me.emit('dc:closed', me.daisy.mac);
    } else {
      console.log("In socket.close handler, but no daisy attached");
    }
  } // end _onClose

  /**
   * Publish this daisy's status to any pub/sub consumers
   * @param {Daisies} [daisy] the daisy to publish status for
   */
  this.pubStatus = function(daisy) {
    console.log("UPDATE DAISY STATUS: ", daisy.online);
    daisy.owners.forEach(function (userId, index, arr) {
      me.ss.api.publish.user(userId, 'daisy:status', daisy);
    });
  }

  /**
   * Net.Socket end handler
   */
  this.onEnd = function() {
    console.log("\t socket:end");
  }

  // setup all event handlers
  socket.on('data', this.onData);
  socket.on('error', this.onError);
  socket.on('timeout', this.onTimeout);
  socket.on('close', this.onClose);
  socket.on('end', this.onEnd);

};

/* ------------ Public Methods -------------- */

/**
 * Send a list of commands to the Daisy
 * @param {Array} [commands] an array of string commands
 * @param {Boolean} [keepAlive] whether to close the socket after sending the commands
 * @param {Function} [callback] => function (err, res) { } standard Node callback 
 *
 * The callback will be run each time a response is received for a command.
 * If you close the socket, you won't be able to communicate with the Daisy until the
 * next time it connects.
 */
DaisyConversation.prototype.send = function(commands, keepAlive, callback) {
  this.callback = callback;
  this.keepAlive = keepAlive;

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