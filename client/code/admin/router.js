// in client/code/admin/router.js

var Router = Backbone.Router.extend({
  routes: {
    "": "home",
    "devices": "devices",
    "rules": "rules",
    "profile": "profile",
    "help": "help"
  },

  home: function () {
    $("#home").show();
  },

  devices: function () {
    $("#devices").show();
    ss.rpc('devices.get', function(err, daisies) {
      if (err) alert(err);
      else {
        console.dir(daisies);
        var json = JSON.stringify(daisies);
        console.log([json]);

        $('#daisiesTable').dataTable().fnAddData(daisies);
      }
    });
  },

  rules: function () {
    $("#rules").show();
  },

  profile: function () {
    $("#profile").show();
  },

  help: function () {
    $("#help").show();
  }
});

var router = new Router();
Backbone.history.start();

// navigation links
$(".top-menu li").click(function (e) {
  $("#content").children().hide();
  $(".nav li").removeClass("active");
  $(this).addClass("active");
});

