// in client/code/app/rules.js

var widgetModels = require('./widgets'),
  daisyModels = require('./models'),
  Daisies = daisyModels.Daisies,
  SensorWidget = widgetModels.SensorWidget,
  Widgets = widgetModels.Widgets;

var Rules = (function () {

  var SideBarView = Backbone.View.extend({
    el: $('#rules-sidebar-view'),

    events: {
      'click a': 'menuClicked'
    },

    initialize: function (options) {
      this.bus = options.bus;
      _.bindAll(this, 'render');
    },

    render: function () {

    },

    menuClicked: function (e) {

    }

  });

  // -------------------------------------------------------
  // View: EditorView
  // -------------------------------------------------------
  var EditorView = Backbone.View.extend({
    el: $('#editor-view'),

    events: {

    },

    initialize: function (options) {
      // FIXME: see if we can load jqueryui on demand instead
      ss.load.code('/editor', function () {
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

          switch (ui.draggable[0].innerHTML) {
          case "Sensor":
            col.add(new SensorWidget(), o);
            break;
          }
        }
      });
    },

    render: function () {

    },

    addOne: function (model, el, options) {
      switch (model.get('type')) {
      case 'Sensor':
        new SensorView({model: model, position: options.position}).render();
        break;
      }
    },

    removeOne: function () {

    },

    save: function () {

    },

    clear: function () {

    }

  });

  var SensorView = Backbone.View.extend({
    tagName: 'div',
    //className: 'ui-widget-content',
    position: {},
    template: ss.tmpl['rules-sensor'].render({title: "If the Sensor"}),

    initialize: function (options) {
      this.position = options.position;
      this.model.set('uid', options.uid);
      $(this.el).attr('id', options.uid);
      _.bindAll(this, 'render');

      options.uid = 'sensor-' + this.model.cid;

    },

    render: function () {

      $(this.el).html(this.template);
      $(this.el).css('position', 'absolute');
      $(this.el).position({
        of: $('#ed-canvas'),
        my: 'left top',
        at: 'left top',
        offset: this.position.left + ' ' + this.position.top
      });

      // dynamically build the <option> for Daisy <select>
      var i, m, html;
      for (i = 0; i<daisies.models.length; i++) {
        m = daisies.models[i];
        html = ss.tmpl['rules-daisyOption'].render(m.toJSON());
        this.$('.daisy').append(html);
      }

      $('#ed-canvas')
        .append(this.el);

      jsPlumb.draggable(this.el);

    }

  });

  // event bus
  var bus = _.extend({}, Backbone.Events),
    widgets = new Widgets(),
    daisies = new Daisies({url: 'devices.get'}),
    editorView = new EditorView({bus: bus, collection: widgets});

  var _refresh = function () {
    editorView.render();
    // fetch the list of daisies
    daisies.fetch({success: function () {}});
  };

  return {
    refresh: _refresh
  };

}());
module.exports = Rules;