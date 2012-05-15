// in client/code/admin/router.js

var devicesHandler = require('./devices.js');

var Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "devices": "devices",
    "rules": "rules",
    "profile": "profile",
    "help": "help"
  },

  home: function () {
    $("#content").children().hide();
    $("#home").show("fast", function() {
      // do something when home is shown
      console.log('home');
    });
  },

  devices: function () {
    $("#content").children().hide();
    $("#devices").show("fast", function() {
      // refresh table data
      devicesHandler.refresh();
    });
  },

  rules: function () {
    $("#content").children().hide();
    $("#rules").show("fast", function() {
      // do something when rules is shown
      console.log('rules');
    });
  },

  profile: function () {
    $("#content").children().hide();
    $("#profile").show("fast", function() {
      // do something when profile is shown
      console.log('profile');
    });
  },

  help: function () {
    $("#content").children().hide();
    $("#help").show("fast", function() {
      // do something when help is shown
      console.log('help');
    });
  }
});

var router = new Router();
Backbone.history.start();

// navigation links
$(".top-menu li").click(function (e) {
  
  $(".nav li").removeClass("active");
  $(this).addClass("active");
});

