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
      	$("#home").show();
      },

      devices: function(e, a) {
      	$("#content").children().hide();
      	$("#devices").show();
      },

      rules: function() {
      	$("#content").children().hide();
      	$("#rules").show();
      },

      profile: function() {
      	$("#content").children().hide();
      	$("#profile").show();
      },

      help: function() {
      	$("#content").children().hide();
      	$("#help").show();
      }
});

var router = new Router();
Backbone.history.start();
