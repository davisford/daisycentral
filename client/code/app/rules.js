// in client/code/app/rules.js

var models = require('./widgets')
  , SensorWidget = models.SensorWidget
  , Widgets = models.Widgets;

var Rules = function() {

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

  // -------------------------------------------------------
  // View: EditorView
  // -------------------------------------------------------
  EditorView = Backbone.View.extend({
    el: $('#editor-view'),

    events: {

    },

    initialize: function(options) {
      // FIXME: see if we can load jqueryui on demand instead
      ss.load.code('/editor', function() {
        console.log('all code is loaded');
      });

      _.bindAll(this, 'render', 'addOne', 'removeOne', 'save', 'clear');

      var col = this.collection;

      col.bind('add', this.addOne);
      col.bind('remove', this.removeOne);

      $('.ed-toolbar-item').draggable({
        appendTo: '#ed-canvas',
        helper: 'clone'
      });

      $('#ed-canvas').droppable({
        drop: function (event, ui) {
          var o = {position: ui.position};

          switch(ui.draggable[0].innerHTML) {
            case "Sensor":

              col.add(new SensorWidget(), o);
              break;
          }
        }
      });
    },

    render: function() {

    },

    addOne: function(model, el, options) {
      switch (model.get('type')) {
        case 'Sensor':
          new SensorView({model: model, position: options.position}).render();
          break;
      }
    },

    removeOne: function() {

    },

    save: function() {

    },

    clear: function() {

    }

  });

  SensorView = Backbone.View.extend({
    tagName: 'div',
    className: 'ui-widget-content',
    position: {},
    template: ss.tmpl['rules-foobar'].render({title:"If the Sensor"}),

    initialize: function (options) {
      this.position = options.position;
      this.model.set('uid', options.uid);
      $(this.el).attr('id', options.uid);
      _.bindAll(this, 'render');

      options.uid = 'sensor-' + this.model.cid;

    },

    render: function () {
      
      console.log(this.el);

      $(this.el).html(this.template);
      $(this.el).width(150).height(150).css('position', 'absolute');
      $(this.el).position({
        of: $('#ed-canvas'),
        my: 'left top',
        at: 'left top',
        offset: this.position.left + ' ' + this.position.top
      }); 

      

      $('#ed-canvas')
        .append(this.el);

      jsPlumb.draggable(this.el);
      $(this.el).draggable();

      // set the position where they dropped it
      
    },

  });


  var _refresh = function() {
    editorView.render();
  }

  // event bus
  var bus = _.extend({}, Backbone.Events);

  var widgets = new Widgets();
  // editor view
  var editorView = new EditorView({bus: bus, collection: widgets});

  return { 
    refresh: _refresh
  };

}();
module.exports = Rules;