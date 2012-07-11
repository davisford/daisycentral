// in client/app/router.js

var devicesHandler = require('./devices');
var rulesHandler = require('./rules');

var Router = Backbone.Router.extend({
  routes: {
    "":  "home",
    "devices": "devices",
    "devices/register": "devicesRegister",
    "devices/daisies": "devicesDaisies",
    "rules": "rules",
    "rules/rules": "rulesRules",
    "rules/editor": "rulesEditor",
    "profile": "profile",
    "help": "help",
  },

  home: function() {
    $("#content").children().hide();
    $("#home").show("fast", function() {
      // do something when home is shown
      console.log('home');
    });
  },

  devices: function() {
    $("#content").children().hide();
    $("#devices").show("fast", function() {
      // refresh table data
      devicesHandler.refresh();
    });
  },

  devicesDaisies: function() {
    $('#devices-content').children().hide();
    $('#table-view').show('fast', function() {
      if ( !$('#devices').is(':visible') ) {
        $('#content').children().hide();
        $('#devices').show('fast', function() {
          devicesHandler.refresh();
        });
      }
    });
  },

  devicesRegister: function() {
    $('#devices-content').children().hide();
    $('#register-view').show('fast', function() {
      if ( !$('#devices').is(':visible') ) {
        $('#content').children().hide();
        $('#devices').show('fast', function() {
          devicesHandler.refresh();
        });
      }
    });
  },

  rules: function() {
    $("#content").children().hide();
    $("#rules").show("fast", function() {
      console.log("rules");
    });
  },

  rulesRules: function() {
    this.rules();
    $('#rules-content').children().hide();
    $('#rules-view').show('fast', function() {

    });
  },

  rulesEditor: function() {
    this.rules();
    $('#rules-content').children().hide();
    $('#editor-view').show('fast', function() {

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
  $(".top-menu li").removeClass("active");
  $(this).addClass("active");
});

$(".sidebar-nav li").click(function (e) {
  $(".sidebar-nav li").removeClass("active");
  $(this).addClass("active");
})
