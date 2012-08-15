// in client/code/admin/router.js

var devicesHandler = require('./devices');

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
    $("#home").show("fast", function () {

    });
  },

  devices: function () {
    $("#content").children().hide();
    $("#devices").show("fast", function () {
      devicesHandler.refresh();
    });
  },

  rules: function () {
    $("#content").children().hide();
    $("#rules").show("fast", function () {

    });
  },

  profile: function () {
    $("#content").children().hide();
    $("#profile").show("fast", function () {

    });
  },

  help: function () {
    $("#content").children().hide();
    $("#help").show("fast", function () {

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

