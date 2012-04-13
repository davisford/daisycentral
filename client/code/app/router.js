var Router = Backbone.Router.extend({
      routes: {
      	"":  "home",
      	"devices": "devices",
        "rules": "rules",
        "profile": "profile",
        "help": "help"
      },

      home: function(e, a) {
        $("#home").show();
      },

      devices: function(e, a) {
        $("#devices").show();
      },

      rules: function() {
        $("#rules").show();
      },

      profile: function() {
        $("#profile").show();
      },

      help: function() {
        $("#help").show();
      }
});

var router = new Router();
Backbone.history.start();

// navigtation links
$(".nav li").click(function (e) {
  $("#content").children().hide();
  $(".nav li").removeClass("active");
  $(this).addClass("active");
});
