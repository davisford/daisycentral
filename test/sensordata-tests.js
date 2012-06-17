var should = require('should')
  , mongoose = require('mongoose');

mongoose.connect("mongodb://localhost/daisycentral-test");

var SensorData = require('../server/models/sensordata')
  , colOne = SensorData.getColName("00:11:22:33:44:55")
  , colTwo = SensorData.getColName("00:DE:AD:BE:EF:00")
  , SensorDataOne = SensorData.getModel(colOne)
  , SensorDataTwo = SensorData.getModel(colTwo);

var dataOne = {
	did: "Davis' Garage", ip: "192.168.25.132", mac: "00:06:66:72:16:81", 
	timestamp: 1335246150000, bat: 3069, wake: 7, seq: 81,
	PIO3: 0, PIO2: 1, PIO1: 0, AD0: 2237, AD1: 2166, AD2: 10, 
	AD3: 34803, AD4: 3131, AD5: 27265, AD6: 12560, AD7: 12574 };
var dataTwo = {
	did: "Davis' Kitchen", ip: "192.168.25.132", mac: "00:06:77:88:99:AA", 
	timestamp: 1335246150000, bat: 3069, wake: 7, seq: 81,
	PIO3: 0, PIO2: 1, PIO1: 0, AD0: 2237, AD1: 2166, AD2: 10, 
	AD3: 34803, AD4: 3131, AD5: 27265, AD6: 12560, AD7: 12574 };

describe("SensorData", function() {

	beforeEach(function (done) {
	  SensorDataOne.remove({}, function (err) {
      if (err) { return done(err); }
      SensorDataTwo.remove({}, function (err) {
      	if (err) { return done(err); }
      })
	  }); 
	  done();
	});

	afterEach(function (done) {
	  SensorDataOne.remove({}, function (err) {
      if (err) { return done(err); }
      SensorDataTwo.remove({}, function (err) {
      	if (err) { return done(err); }
      })
	  }); 
	  done();
	});

	it("should save sensors to collection named: "+colOne, function(done) {
		var sensors = new SensorDataOne(dataOne);

		sensors.save(function (err, doc) {
      if (err) { return done(err); }
      should.exist(doc);
      doc.should.have.property('_id');

      // check that we can find again
      SensorDataOne.findOne({'_id': doc._id}, function(err, sdoc) {
      	should.not.exist(err);
      	should.exist(sdoc);
      	sdoc.collection.name.should.eql(colOne);
      	doc._id.should.eql(sdoc._id);
      	done();
      });
		});
	});

	it("should save sensors to collection named: "+colTwo, function(done) {
		var sensors = new SensorDataTwo(dataTwo);

		sensors.save(function (err, doc) {
			if (err) { return done(err); }
			should.exist(doc);
			doc.should.have.property('_id');
			doc.collection.name.should.eql(colTwo);
			done();
		})
	})
})