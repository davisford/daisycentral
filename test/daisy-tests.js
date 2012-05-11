var should = require('should')
  , mongoose = require('mongoose')
  , DaisySchema = require('../server/models/daisy').DaisySchema;

// this is a test
process.env['NODE_ENV'] = 'test';

mongoose.connect("mongodb://localhost/daisycentral-test");

var Daisy = require('../server/models/daisy')
  , colOne = Daisy.getColName("00:11:22:33:44:55")
  , colTwo = Daisy.getColName("00:DE:AD:BE:EF:00")
  , DaisyOne = Daisy.getModel(colOne)
  , DaisyTwo = Daisy.getModel(colTwo);

var dataOne = {
			did: "Davis' Garage", ip: "192.168.25.132", mac: "00:06:66:72:16:81", timestamp: 1335246150000, bat: 3069, wake: 7, seq: 81,
			PIO3: 0, PIO2: 1, PIO1: 0, AD0: 2237, AD1: 2166, AD2: 10, AD3: 34803, AD4: 3131, AD5: 27265, AD6: 12560, AD7: 12574 };
var dataTwo = {
			did: "Davis' Kitchen", ip: "192.168.25.132", mac: "00:06:77:88:99:AA", timestamp: 1335246150000, bat: 3069, wake: 7, seq: 81,
			PIO3: 0, PIO2: 1, PIO1: 0, AD0: 2237, AD1: 2166, AD2: 10, AD3: 34803, AD4: 3131, AD5: 27265, AD6: 12560, AD7: 12574 };

describe("Daisy", function() {

	beforeEach(function (done) {
	  DaisyOne.remove({}, function (err) {
      if (err) { return done(err); }
      DaisyTwo.remove({}, function (err) {
      	if (err) { return done(err); }
      })
	  }); 
	  done();
	});

	afterEach(function (done) {
	  DaisyOne.remove({}, function (err) {
      if (err) { return done(err); }
      DaisyTwo.remove({}, function (err) {
      	if (err) { return done(err); }
      })
	  }); 
	  done();
	});

	it("should save sensors to collection named: "+colOne, function(done) {
		var daisy = new DaisyOne(dataOne);
		daisy.save(function (err, daisy) {
      if (err) { return done(err); }
      should.exist(daisy);
      daisy.should.have.property('_id');
      DaisyOne.findOne({'_id': daisy._id}, function(err, doc) {
      	should.not.exist(err);
      	should.exist(doc);
      	doc.collection.name.should.eql(colOne);
      	daisy._id.should.eql(doc._id);
      	done();
      });
		});
	});

	it("should save sensors to collection named: "+colTwo, function(done) {
		var daisy = new DaisyTwo(dataTwo);
		daisy.save(function (err, doc) {
			if (err) { return done(err); }
			should.exist(doc);
			doc.should.have.property('_id');
			doc.collection.name.should.eql(colTwo);
			done();
		})
	})
})