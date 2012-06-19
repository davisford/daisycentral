var should = require('should')
  , mongoose = require("mongoose")
  , User = require("../server/models/user").User;

// this is a test
process.env['NODE_ENV'] = 'test';

mongoose.connect("mongodb://localhost/daisycentral-test");

describe("User", function() {
  
  var currentUser = null;

  beforeEach(function(done) {
    // remove all users before each test
    User.remove({}, function(err) {
      if (err) { return done(err); }

      // add a test user
      User.register("test@test.com", "password", "password", function(err, user, failed) {
        if(err) { return done(err); }
        else { currentUser = user; }
        done();
      });
    });
    
  });

  afterEach(function(done){
    // remove all users after each test
    User.remove({}, function() {
      done();
    });
  });

  it("should register a new user", function(done) {
    User.register("test2@test.com", "password", "password", function(err, user, failed) {
      if (err) { return done(err); }
      user.email.should.equal("test2@test.com");
      user.password.should.equal("password");
      done();
    });
  });

  it("should not register a user with an invalid email", function(done) {
    User.register("foo@.", "password", "password", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user with a password that is too short", function(done) {
    User.register("test2@test.com", "passw", "passw", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user with passwords that do not match", function(done) {
    User.register("test2@test.com", "password", "passwore", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user that is already registered", function(done) {
    User.register("test@test.com", "password", "password", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should authenticate the user with the correct password", function(done) {
    User.authenticate("test@test.com", "password", function(err, user, failed) {
      if (err) { return done(err); }
      should.exist(user);
      user.email.should.equal("test@test.com");
      done();
    });
  });

  it("should not authenticate an unknown user", function(done) {
    User.authenticate("foo@bar.com", "secret", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with the incorrect password", function(done) {
    User.authenticate("test@test.com", "bogus", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with null email", function(done) {
    User.authenticate(null, "password", function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with null password", function(done) {
    User.authenticate("test@test.com", null, function(err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should find the user by email", function(done) {
    User.findByEmail(currentUser.email, function(err, user) {
      if (err) { return done(err); }
      user.email.should.equal("test@test.com");
      done();
    });
  });

  // TODO mongoose-auth tests

});