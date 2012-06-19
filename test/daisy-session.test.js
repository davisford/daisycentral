var DaisySession = require('../server/app/daisy-session')
  , sinon = require('sinon')
  , should = require('should')
  , net = require('net')
  , ss = require('socketstream')
  , util = require('util')
  , mongoose = require('mongoose')
  , SensorData = require('../server/models/sensordata')
  , Daisies = require('../server/models/daisies')(ss);

mongoose.connect('mongodb://localhost/daisycentral-test');

describe("DaisySession", function() {

	// object under test
	var session;

	var socket    // legit net.Socket
	  , spy 			// spy of SocketStream
	  , stub;			// stub of net.Socket

	beforeEach(function (done) {
		// create new socket, ss, and mock them
		socket = new net.Socket({});
		//mockSocket = sinon.mock(socket);
		spy = sinon.spy(ss);

		// stub out Socket.write
		// it just echoes the command right back by firing the data event
	  stub = sinon.stub(socket, "write", function(data, enc, cb) {
	  	var args = stub.args;
	  	//console.log("socket.write was called with args: ", args);
	  	if (args.length > 0) 
				this.emit('data', stub.args[stub.callCount-1][0]);
		});

		// clean database
		Daisies.remove({}, function (err) {
			if (err) { return done(err); }
		});
		done();
	});

	afterEach(function (done) {
		// so we don't have lingering timeout callbacks
		session.unlock();
		done();
	});

	it("should fail to lock if sessionId is invalid", function(done) {
		session = new DaisySession(socket, ss);
		session.lock(null, function() {}).should.be.false;
		done();
	});

	it("should fail to lock if callback is invalid", function(done) {
		session = new DaisySession(socket, ss);
		session.lock("123", null).should.be.false;
		done();
	});

	it("should lock if passed valid params", function(done) {
		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		done();
	});

	it("should lock idempotently if called twice with same params", function(done) {
		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		session.lock("123", function() {}).should.be.true;
		done();
	});

	it("should fail to lock if another session has locked it", function(done) {
		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		session.lock("ABC", function() {}).should.be.false;
		done();
	}); 

	it("should block another session from lock until timeout expires", function(done) {
		// 1 sec session timeout
		session = new DaisySession(socket, ss, 1);
		session.lock("123", function() {}).should.be.true;
		session.lock("ABC", function() {}).should.be.false;
		// after 1 sec it should be unlocked and available again
		setTimeout(function() {
			session.lock("ABC", function() {}).should.be.true;
			done();
		}, 1000);
	}); 

	it("should handle interleaving send calls with different sessions", function(done) {
		// message index 0,2,3,6 should go through
		// b/c session1 is first and locks out session2 
		var cmds = [
				{ sid: 'session1', msg: 'pass1\r' }, 
				{ sid: 'session2', msg: 'fail1\r' }, // 1 = fail
				{ sid: 'session1', msg: 'pass2\r' },
				{ sid: 'session1', msg: 'pass3\r' },
				{ sid: 'session2', msg: 'fail2\r' }, // 4 = fail
				{ sid: 'session1', msg: 'pass4\r' }
		];

		session = new DaisySession(socket, ss);
		// have to set a daisy or send won't work
		session.daisy = sinon.spy();

		cmds.forEach(function(cmd, idx, arr) {
			// send all cmds
			session.send(cmd.sid, cmd.msg, function(err, res) {				
				//console.log("session.send callback["+idx+"] => ", err, res);
				if([1,4].indexOf(idx) >= 0) { 
					should.exist(err);
				} else {
					cmd.msg.should.eql(res);
				}

				if (idx === cmds.length-1) {
					done();
				}
			});

		});
	});

	it("should expire a session", function(done) {

		// expires in 1 second
		session = new DaisySession(socket, ss, 1);

		// have to set a daisy or send won't work
		session.daisy = sinon.spy();

		session.send("session1", "foo", function(err, res) {
			should.not.exist(err);
			"foo\r".should.eql(res);
		});

		// subject to timing failure; 1s from now, sesison2 will try
		// and should succeed in locking session and sending ok
		setTimeout( function() {

			session.isLocked().should.be.false;
			
			session.send("session2", "bar", function(err, res) {
				should.not.exist(err);
				"bar\r".should.eql(res);
				done();
			});

		}, 1000);
	});

	it("should not blow up if no callbacks are registered and data is received", function(done) {
		socket.emit('data', 'bogus data');
		done();
	});

	it("should not blow up parsing bogus input", function (done) {
		session = new DaisySession(socket, ss);
		should.not.exist(session._parseData('Hungry Hungry Hippos'));

		var undef = session._parseData("GET /wifly-data?DATA=0");

		// this is almost right, but will create a parse error
		should.not.exist(undef);

		done();
	});

	it("should parse a valid query string and fire initialized event ", function (done) {
		session = new DaisySession(socket, ss);
		
		// event should fire after successful parse
		session.on('daisy-session:initialized', function(mac, ses) {
			should.exist(mac);
			mac.should.eql('00:06:66:72:10:ec');
			should.exist(ses);
			session.should.eql(ses);
			done();
		});
		
		var qs = "GET /wifly-data?DATA=051208BECF29CF29001F09F30AF52EC33DD7&id=Garden&mac=00:06:66:72:10:ec&bss=e0:46:9a:5b:22:ee&rtc=42ab&bat=2621&io=510&wake=2&seq=409&cnt=2&rssi=bc HTTP/1.0\rHost: live.daisyworks.com";
		var data = session._parseData(qs);
		
		should.exist(data);
		data.mac.should.eql('00:06:66:72:10:ec');
		data.timestamp.should.eql(17067000);
		data.bat.should.eql(2621);
		data.rssi.should.eql(188);
		data.wake.should.eql(2);
		data.seq.should.eql(1033);
		data.PIO3.should.eql(0);
		data.PIO2.should.eql(0);
		data.PIO1.should.eql(0);
		data.AD0.should.eql(2238);
		data.AD1.should.eql(53033);
		data.AD2.should.eql(53033);
		data.AD3.should.eql(31);
		data.AD4.should.eql(2547);
		data.AD5.should.eql(2805);
		data.AD6.should.eql(11971);
	});

  it("should fire closed event on socket close", function(done) {
  	session = new DaisySession(socket, ss);
  	// mock daisy; simulate a real one; close won't fire w/o it
  	session.daisy = new sinon.spy();
  	session.on('daisy-session:closed', function(mac) {
  		// TODO test storing a daisy
  		done();
  	});

  	socket.emit('close');
  });

	
});