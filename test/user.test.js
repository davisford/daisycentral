// tests for server/models/user.js

var should = require('should'),
  mongoose = require("mongoose"),
  User = require("../server/models/user").User;

// this is a test
process.env['NODE_ENV'] = 'test';

mongoose.connect("mongodb://localhost/daisycentral-test");

describe("User", function () {

  var currentUser = null;

  beforeEach(function (done) {
    // remove all users before each test
    User.remove({}, function (err) {
      if (err) { return done(err); }

      // add a test user
      User.register("test@test.com", "password", "password", function (err, user, failed) {
        if (err) { return done(err); } else { currentUser = user; }
        done();
      });
    });

  });

  afterEach(function (done) {
    // remove all users after each test
    User.remove({}, function () {
      done();
    });
  });

  it("should register a new user", function (done) {
    User.register("test2@test.com", "password", "password", function (err, user, failed) {
      if (err) { return done(err); }
      user.email.should.equal("test2@test.com");
      user.password.should.equal("password");
      done();
    });
  });

  it("should not register a user with an invalid email", function (done) {
    User.register("foo@.", "password", "password", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user with a password that is too short", function (done) {
    User.register("test2@test.com", "passw", "passw", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user with passwords that do not match", function (done) {
    User.register("test2@test.com", "password", "passwore", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not register a user that is already registered", function (done) {
    User.register("test@test.com", "password", "password", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should authenticate the user with the correct password", function (done) {
    User.authenticate("test@test.com", "password", function (err, user, failed) {
      if (err) { return done(err); }
      should.exist(user);
      user.email.should.equal("test@test.com");
      done();
    });
  });

  it("should not authenticate an unknown user", function (done) {
    User.authenticate("foo@bar.com", "secret", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with the incorrect password", function (done) {
    User.authenticate("test@test.com", "bogus", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with null email", function (done) {
    User.authenticate(null, "password", function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should not authenticate the user with null password", function (done) {
    User.authenticate("test@test.com", null, function (err, user, failed) {
      if (err) { return done(err); }
      should.not.exist(user);
      should.exist(failed);
      failed.should.have.property('message');
      done();
    });
  });

  it("should find the user by email", function (done) {
    User.findByEmail(currentUser.email, function (err, user) {
      if (err) { return done(err); }
      user.email.should.equal("test@test.com");
      done();
    });
  });

  it("should create a google user", function (done) {

    var googleUser = {
      id: '103878622001353198855',
      email: 'davisford@gmail.com',
      verified_email: true,
      name: 'Davis Ford',
      given_name: 'Davis',
      family_name: 'Ford',
      link: 'https://plus.google.com/103878622001353198855',
      picture: 'https://lh5.googleusercontent.com/-KH08maMU5QI/AAAAAAAAAAI/AAAAAAAAAG0/4_oc3UU7MJ0/photo.jpg',
      gender: 'male',
      locale: 'en'
    },
      accessTok = 'ya29.AHES6ZT7DMGm3heS65ZKcE-vvUQbyOW__X9f1VNQcaPhFdb5r4UMsw',
      accessTokExtra = {
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXVkIjoiODk3NzM2MDMyMTU3LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiY2lkIjoiODk3NzM2MDMyMTU3LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiaWQiOiIxMDM4Nzg2MjIwMDEzNTMxOTg4NTUiLCJlbWFpbCI6ImRhdmlzZm9yZEBnbWFpbC5jb20iLCJ2ZXJpZmllZF9lbWFpbCI6InRydWUiLCJ0b2tlbl9oYXNoIjoiT0JLQWdvYUdFSkd6NnMwWkN6ZzR0dyIsImlhdCI6MTM0MTE5NjI5MywiZXhwIjoxMzQxMjAwMTkzfQ.UyYLP9urZBzCR3J1KoWByMATZbbF3l7CI4qbEgdGWUvZvNZJfJY39mUYIXIt-jY-55GoEi3AwC4iLOvJbmT5EE-BLrZGswQJIhV85AiifXFmy2roNns2W8D7v193kkLVZHYncmjED2tFUXZq-gpaXOs_pN6dM7F0S-O9vTSgYjI'
      };

    User.createWithGoogleOAuth(googleUser, accessTok, accessTokExtra, function (err, createdUser) {
      if (err) { return done(err); }
      should.exist(createdUser);
      createdUser.should.have.property('google');
      createdUser.google.email.should.eql('davisford@gmail.com');
      User.findByEmail(createdUser.email, function (err, user) {
        if (err) { return done(err); }
        should.exist(user);
        user.google.should.have.property('givenName');
        user.google.should.have.property('familyName');
        user.google.givenName.should.eql('Davis');
        user.google.familyName.should.eql('Ford');
        done();
      });
    });
  });

});