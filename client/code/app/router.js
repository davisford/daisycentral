// in client/app/router.js

var devicesHandler = require('./devices');

var Router = Backbone.Router.extend({
  routes: {
    "":  "home",
    "devices": "devices",
    "rules": "rules",
    "profile": "profile",
    "help": "help"
  },

  home: function(e, a) {
    $("#content").children().hide();
    $("#home").show("fast", function() {
      // do something when home is shown
      console.log('home');
    });
  },

  devices: function(e, a) {
    $("#content").children().hide();
    $("#devices").show("fast", function() {
      // refresh table data
      devicesHandler.refresh();
    });
  },

  rules: function() {
    $("#content").children().hide();
    $("#rules").show("fast", function() {
      console.log("rules");
    });
  },

  profile: function() {
    $("#content").children().hide();
    $("#profile").show("fast", function() {
      console.log("profile");
    });
  },

  help: function() {
    $("#content").children().hide();
    $("#help").show("fast", function() {
      console.log("help");
    });
  }
});

var router = new Router();
Backbone.history.start();

// navigtation links
$(".top-menu li").click(function (e) {
  $(".nav li").removeClass("active");
  $(this).addClass("active");
});
