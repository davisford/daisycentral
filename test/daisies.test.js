// tests for server/models/daisies.js

var sinon = require('sinon'),
  should = require('should'),
  ss = require('socketstream').start(),
  mongoose = require('mongoose'),
  ObjectId = require('mongoose').Types.ObjectId,
  channels = require('../server/app/channels'),
  Daisies;

describe("DaisiesTest", function () {

  var channelspy, userspy;

  before(function (done) {
    mongoose.connect('mongodb://localhost/daisycentral-test');
    // this has to be done late - or SocketStream isn't init'd
    Daisies = require('../server/models/daisies')(ss);
    done();
  });

  after(function (done) {
    mongoose.disconnect();
    done();
  });

  beforeEach(function (done) {

    // wrap SocketStream pub/sub functions
    channelspy = sinon.spy(ss.publish, 'channel');
    userspy = sinon.spy(ss.publish, 'user');

    // clean database
    Daisies.remove({}, function (err) {
      if (err) {
        return done(err);
      } else { return done(); }
    });
  });

  afterEach(function (done) {
    // remove wrapper and reset counters
    channelspy.restore(ss.publish);
    channelspy.reset();
    userspy.restore(ss.publish);
    userspy.reset();
    done();
  });

  it("model should save ok and publish to admin channel with no owners", function (done) {

    var daisy = new Daisies({
      did: "Test Daisy",
      mac: "00:06:66:11:22:33",
      online: true,
      hold: true
    });

    daisy.save(function (err, doc) {

      should.not.exist(err);
      should.exist(doc);

      ss.publish.channel.calledOnce.should.be.true;
      ss.publish.channel.withArgs(channels.admin,
        channels.admin.daisy.status).calledOnce.should.be.true;

      // won't publish to user channel b/c it has no users
      ss.publish.user.called.should.be.false;

      doc.should.have.property('_id');

      // check that we can find it again
      Daisies.findOne({'_id': doc._id}, function (err, sdoc) {

        should.not.exist(err);
        should.exist(sdoc);

        doc._id.should.eql(sdoc._id);
        sdoc.mac.should.eql("00:06:66:11:22:33");
        sdoc.did.should.eql("Test Daisy");
        sdoc.online.should.be.true;
        sdoc.hold.should.be.true;

        done();
      });
    });

  });

  it("model with owners should publish to users channel upon save", function (done) {

    // create a new daisy with two owners
    var daisy = new Daisies({
      did: "Test Daisy",
      mac: "00:06:66:11:22:33",
      online: true,
      hold: false,
      owners: [
        ObjectId.fromString("4fae9d7379a3c943a1000003"),
        ObjectId.fromString("4fae9d7379a3c943a1000002")]
    });

    daisy.save(function (err, doc) {

      should.not.exist(err);
      should.exist(doc);

      ss.publish.channel.calledOnce.should.be.true;
      ss.publish.channel.withArgs(channels.admin,
        channels.admin.daisy.status).calledOnce.should.be.true;

      ss.publish.user.calledTwice.should.be.true;
      ss.publish.user.withArgs('4fae9d7379a3c943a1000003',
        channels.user.daisy.status).calledOnce.should.be.true;
      ss.publish.user.withArgs('4fae9d7379a3c943a1000002',
        channels.user.daisy.status).calledOnce.should.be.true;

      done();
    });

  });

});