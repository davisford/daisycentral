var DaisySession = require('../server/app/daisy-session')
  , sinon = require('sinon')
  , net = require('net')
  , ss = require('socketstream')
  , mongoose = require('mongoose')
  , SensorData = require('../server/models/sensordata')
  , Daisies = require('../server/models/daisies').getModel();

mongoose.connect('mongodb://localhost/daisycentral-test');

describe("DaisySession", function() {

	// object under test
	var session;

	var socket, mockSocket
	  , mockSs;

	beforeEach(function (done) {
		// create new socket, ss, and mock them
		socket = new net.Socket({});
		//mockSocket = sinon.mock(socket);
		mockSs = sinon.mock(ss);

		// clean database
		Daisies.remove({}, function (err) {
			if (err) { return done(err); }
		})
		done();
	});

	afterEach(function (done) {
		//session.unlock();
		done();
	});

	/*

	it("constructor should set the socket encoding to `ascii`", function(done) {
		mockSocket.expects("setEncoding").withExactArgs("ascii").once();
		mockSocket.expects("write").withExactArgs("HTTP/1.1 200 OK\n").once();

		session = new DaisySession(socket, ss);
	
		mockSocket.verify();
		socket.should.eql(session.socket);
		ss.should.eql(session.ss);
		done();
	});

	it("should fail to lock if sessionId is invalid", function(done) {
		mockSocket.expects("write");

		session = new DaisySession(socket, ss);
		session.lock(null, function() {}).should.be.false;
		done();
	});

	it("should fail to lock if callback is invalid", function(done) {
		mockSocket.expects("write");

		session = new DaisySession(socket, ss);
		session.lock("123", null).should.be.false;
		done();
	});

	it("should lock if passed valid params", function(done) {
		mockSocket.expects("write");

		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		done();
	});

	it("should lock idempotently if called twice with same params", function(done) {
		mockSocket.expects("write");

		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		session.lock("123", function() {}).should.be.true;
		done();
	});

	it("should fail to lock if another session has locked it", function(done) {
		mockSocket.expects("write");

		session = new DaisySession(socket, ss);
		session.lock("123", function() {}).should.be.true;
		session.lock("ABC", function() {}).should.be.false;
		done();
	}); 

	it("should block another session from lock until timeout expires", function(done) {
		mockSocket.expects("write");

		// 1 sec session timeout
		session = new DaisySession(socket, ss, 1);
		session.lock("123", function() {}).should.be.true;
		session.lock("ABC", function() {}).should.be.false;
		// after 1 sec it should be unlocked and available again
		setTimeout(function() {
			session.lock("ABC", function() {}).should.be.true;
			done();
		}, 1000);
	}); */

	it("should refresh the lock timeout if client keeps sending", function(done) {
		var i = 0;
		var stub = sinon.stub(socket, "write");
			
		socket.on('data', function(data) {
			console.log('data received', data);
		});

		socket.write("foobar", null, function(echo){ 
			socket.emit('data', '\nfoobar echo '+echo);
		})
		socket.write.yields(socket.write.getCall(0).args[0]);

		socket.write("boofar", null, function(echo){
			setTimeout(function() {
				socket.emit('data', '\nboofar echo '+echo);
			}, 1000)	
		});
		socket.write.yields(socket.write.getCall(1).args[0]);
		
		socket.write("zanzibar", null, function(echo){
			socket.emit('data', '\nzanzibar echo '+echo);
		});
		socket.write.yields(socket.write.getCall(2).args[0]);
		
		console.log("\nwrite args\n", socket.write.args);

		done();
		
	});

	it("should blah blah balh ", function(done) {
		var stub = sinon.stub(socket, "write").yields();

		session = new DaisySession(socket, ss);
		var daisyStub = sinon.stub();
		session.daisy = daisyStub;

		var cb = function(err, res) {
			console.log(err, res);
			err.should.not.exist;
		}
		session.send('123', '$$$', cb);
		session.send('123', 'get ip', cb);
		session.send('123', 'get mac', cb);
		session.send('abc', 'whoa!', cb);
		session.send('123', 'bankroll', cb);
	});

	
});