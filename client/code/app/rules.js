// in client/code/app/rules.js

module.exports = function() {

  SideBarView = Backbone.View.extend({
    el: $('#rules-sidebar-view'),

    events: {
      'click a': 'menuClicked'
    },

    initialize: function(options) {
      this.bus = options.bus;
      _.bindAll(this, 'render');
    },

    render: function() {

    },

    menuClicked: function(e) {
      
    }

  });


  var _refresh = function() {

  }

  return { 
    refresh: _refresh
  };

}();