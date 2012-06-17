// in server/app/daisy-session.js

var SensorData = require('../models/sensordata')
  , Daisies = require('../models/daisies').getModel()
  , util = require('util')
  , events = require('events')
  , qs   = require('querystring');

// DaisySession subclasses EventEmitter
util.inherits(DaisySession, events.EventEmitter);

// private, shared variables; these are shared in module for multiple DaisySession instances

/**
 * Represents a bi-directional session between a connected Daisy
 * and any other client.  Clients send commands to the Daisy.
 * 
 * @constructor
 *
 * @param {Net.Socket} [socket] a connected socket
 * @param {SocketStream} [ss] the socket stream object
 * @param {int} [timeout] timeout in seconds for how long a DaisySession
 *   can be held by a client for read/write communications before it is
 *   release.
 */
function DaisySession(socket, ss, timeout) {
  this.socket = socket;
  this.ss = ss;
  this.timeout = (timeout * 1000) || (300 * 1000); // default 5 min. timeout
  this._sessionlock = DaisySession.defaultLock;
  var me = this;

  // we always use ascii for daisy wifi
  socket.setEncoding('ascii');

  // subclass EventEmitter
  events.EventEmitter.call(this);

  /* --------------- Privileged Methods ---------------- */

  /**
   * Parses the querystring into an object
   * @param {string} [queryString] the querystring from HTTP request; example: GET /wifly-data?DATA=051108C20874000987D70B4C6A9031093124&id=Troys-Mailbox&mac=00:06:66:72:16:81&bss=e0:46:9a:5a:c8:43&rtc=4fc2558b&bat=3066&io=510&wake=1&seq=60f&cnt=1&rssi=e7 HTTP/1.0 Host: 192.168.25.200
   * @return {object} with sensor data
   */
  this._parseData = function (queryString) {
    console.log('received the querystring: ', queryString);

    // shave off the HTTP header and parse into raw object
    var raw = qs.parse(queryString.slice(0, queryString.lastIndexOf(' HTTP')));

    if (raw['GET /wifly-data?DATA'] === undefined) {
      console.log('WARN: skipping this: wrong format: ', raw);
      this.socket.end("goodbye\n");
      return;
    }

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
  } // end this._parseData

  /**
   * Persists the sensor data into {SensorData} model.  If this is the
   * very first post by a daisy device, it will also persist a {Daisies}
   * record or update the {Daisies} record with the online status.
   * @param {object} [obj]
   */
  this._storeData = function (obj) {
    if (!obj) return;

    // get a special model with the collection name
    // that includes the mac address
    var SensorDataModel = SensorData.getModel(SensorData.getColName(obj.mac));
    var sensors = new SensorDataModel(obj);
    sensors.save(function (err, doc) {
      if (err) {
        console.log("Could not save sensor data", err);
        me.callback(err);
      } else {
        console.log("New sensor data saved at (localdate) "+doc.date);
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
          me.daisy = daisy;

          // should we hold the connection open?
          if (daisy.hold === true) {
            daisy.online = true;
          } else {
            daisy.online = false;
            // close the connection
            me.socket.end();
          }
          
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
          daisy = new Daisies({did: obj.did, mac: obj.mac, online:true, hold:false});
      
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
  } // end this._storeData
  
  /**
   * Callback for socket.on('data')
   * @param {string} [data] should be ASCII if we set the socket config
   */
  this._onData = function (data) {
    console.log('socket received data => ', data);
    if (!data) return;

    // this is a querystring HTTP GET with sensor data
    if (data.match(/^GET .*/)) {
      // parse it and store it
      me._storeData(me._parseData(data));
    } else {
      // issue a callback b/c it could be return 
      // from a socket.write() call
      var cb = me._sessionlock.callbacks.shift();
      if (cb) 
        cb(null, data);
      else 
        console.log("nobody is listening...nobody cares about "+data);
    }
  } // end this._onData



  /**
   * Net.Socket error handler
   */
  this._onError = function(err) {
    console.log('\t socket:error: ', err);
  }

  /**
   * Net.Socket timeout handler
   */
  this._onTimeout = function() {
    console.log('\t socket:timeout');
  }

  /**
   * Net.Socket close handler. When it closes we want to do pub/sub
   * to all consumers so they have an updated status on the connection.
   * We also need to fire our own 'dc:closed' event
   */
  this._onClose = function() {
    //console.log('\t socket:close, this.daisy', me.daisy);
    if(me.daisy) {
      me.daisy.online = false;
      Daisies.findOne({mac: me.daisy.mac}, function (err, doc) {
        if (err) { 
          // cached version
          me._pubStatus(me.daisy);
          //console.log("Could not look up daisy", me.daisy); 
        }
        else {
          if (doc) {
            doc.online = false;
            doc.save(function (err, doc) {
              if (err) { console.log("Could not update daisy to set status offline", err); }
            });
            // fresh version
            me._pubStatus(doc);
          } else {
            // cached version
            me._pubStatus(me.daisy);
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
   * Net.Socket end handler
   */
  this._onEnd = function() {
    console.log("\t socket:end");
  }

  /**
   * Write a command to the Daisy
   * @param {string} [command]
   */
  this._write = function(command) {
    // daisy needs at least a 250ms spacer after $$$
    setTimeout(function () {
      me.socket.write(command);
    }, 250);
    // refresh the session timeout
    this._sessionlock.lastCommand = new Date().getTime();
  } // end _write

  /**
   * Publish this daisy's status to any pub/sub consumers
   * @param {Daisies} [daisy] the daisy to publish status for
   */
  this._pubStatus = function(daisy) {
    daisy.owners.forEach(function (userId, index, arr) {
      me.ss.api.publish.user(userId, 'daisy:status', daisy);
    });
  }

  /**
   * Handler when a session's timeout expires for having a lock
   * on the Daisy.
   * @param {s} [DaisySession] this context
   */
  this._sessionTimeout = function(s) {
    var now = new Date().getTime();
    if(!s._sessionlock.lastCommand) { 
      s.unlock();
    }
    else if ( (now - s._sessionlock.lastCommand) >= timeout ) {
      s.unlock();
    } 
  }

  // setup all event handlers
  socket.on('data', this._onData);
  socket.on('error', this._onError);
  socket.on('timeout', this._onTimeout);
  socket.on('close', this._onClose);
  socket.on('end', this._onEnd);

  return this;

};

/* ------------ Public Methods -------------- */



/**
 * Unlock the session so it is available
 */
DaisySession.prototype.unlock = function() {
  clearTimeout(this._sessionlock.timeoutId);
  this._sessionlock = DaisySession.defaultLock;
}

/**
 * Indicates if this session is locked
 */
DaisySession.prototype.isLocked = function() {
  return this._sessionlock.sessionId !== "unlocked";
}

/**
 * Send a list of commands to the Daisy
 * @param {string} [sessionId] must send the sessionId
 * @param {string} [command] a string command to give the Daisy
 * @param {Function} [callback] => function (err, res) { } standard Node callback 
 *
 * The callback will be run each time a response is received for a command.
 * If you close the socket, you won't be able to communicate with the Daisy until the
 * next time it connects.
 */
DaisySession.prototype.send = function(sessionId, command, callback) {
  
  // sanity checks
  if (!sessionId || !command) {
    if (callback)
      return callback("Invalid parameters (sessionId, command)", null);
  }
  
  // we can't send anything b/c there's no daisy to send to
  if(!this.daisy) {
    return callback("Daisy is not connected yet", null);
  }

  if ( this.lock(sessionId, callback) === false ) {
    return callback("Session is currently locked: TODO queue commands in redis", null);
  }

  // $$$ command must not have any trailing characters
  if(command.match(/\$\$\$/)) {
    this._write('$$$');
  } else if(!command.match(/[\r]$/)) {
    this._write(command + '\r');
  } else {
    this._write(command);
  }
}

/**
 * A DaisySession can be used by only one HTTP/WebSocket session at a time.
 * DaisySession.send will take care of locking - this is exposed 
 * for efficiency and testing.
 * @param {string} [sessionId]
 * @param {Function} [callback]
 */
DaisySession.prototype.lock = function(sessionId, callback) {

  if (!sessionId || !callback) {
    return false;
  }

  if (!this._sessionlock) 
    throw new Error("Illegal state: _sessionlock is undefined");

  // already locked by same sessionId
  if (this._sessionlock.sessionId === sessionId) {
    // add this callback
    this._sessionlock.callbacks.push(callback);
    return true;

  } else if (this._sessionlock.sessionId === "unlocked") {
    // lock the session
    this._sessionlock = {
      sessionId: sessionId,
      callbacks: [callback]
    };
    this._sessionlock.timeoutId = setTimeout(this._sessionTimeout, this.timeout, this);
    return true;
  } 

  // sorry, charlie - lock request rejecto'ed
  return false;
}

// static class lock object; used if no one has a lock
DaisySession.defaultLock = {
  sessionId: "unlocked",
  callbacks: []
}

module.exports = DaisySession;


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