var should = require('should')
  , mongoose = require('mongoose')
  , Daisy = require("../server/models/daisy").Daisy;

// this is a test
process.env['NODE_ENV'] = 'test';

mongoose.connect("mongodb://localhost/daisycentral-test");

describe("Daisy", function() {
	var currentDaisy = null;

	beforeEach(function (done) {
	  Daisy.remove({}, function (err) {
      if (err) { return done(err); }
      done();
	  });
	});

	afterEach(function (done) {
	  Daisy.remove({}, function (err) {
      if (err) { return done(err); }
      done();
	  });
	});

	it("should save a daisy to the correct collection", function(done) {
		var daisy = new Daisy({
			did: "Davis' Garage", ip: "192.168.25.132", mac: "00:06:66:72:16:81", timestamp: 1335246150000, bat: 3069, wake: 7, seq: 81,
			PIO3: 0, PIO2: 1, PIO1: 0, AD0: 2237, AD1: 2166, AD2: 10, AD3: 34803, AD4: 3131, AD5: 27265, AD6: 12560, AD7: 12574 });
		daisy.save(function (err, daisy) {
      if (err) { return done(err); }
      should.exist(daisy);
      daisy.should.have.property('_id');
      done()
		});
	})
})