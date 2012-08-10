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
    //className: 'ui-widget-content',
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
      $(this.el).css('position', 'absolute');
      $(this.el).position({
        of: $('#ed-canvas'),
        my: 'left top',
        at: 'left top',
        offset: this.position.left + ' ' + this.position.top
      }); 

      this.$('.sensor').multiselect({
        multiple: false,
        header: "Choose a Sensor",
        noneSelectedText: "No Sensor Selected",
        selectedList: 1
      });

      $('#ed-canvas')
        .append(this.el);

      jsPlumb.draggable(this.el);

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

  /* #########################################
 *           PLUMBING
 * #########################################*/
jsPlumb.Defaults.Connector = ["Bezier", {curviness: 200}];
jsPlumb.Defaults.DragOptions = { cursor: "pointer", zIndex: 2000 };
jsPlumb.Defaults.DropOptions =
  { tolerance: "touch", hoverClass: "ed-endpoint-drop-hover", activeClass: "ed-endpoint-drag-active"};
//jsPlumb.Defaults.Overlays = [ ["Arrow", {location:0.75}] ];
jsPlumb.Defaults.Endpoint = ["Dot", {radius: 8}];

// connection event is global
jsPlumb.bind('jsPlumbConnection', function (info) {
  // fire our own event on the source and target element to indicate connection
  "use strict";
  $(info.source).trigger("ed:connected", info);
  $(info.target).trigger("ed:connected", info);
});
// disconnect event is global
jsPlumb.bind('jsPlumbConnectionDetached', function (info) {
  // fire our own event on the source and target element to indicate disconnection
  "use strict";
  $(info.source).trigger("ed:disconnected", info);
  $(info.target).trigger("ed:disconnected", info);
});

var PLUMBING = {

  init: function () {
    "use strict";
    // http://www.colourlovers.com/palette/580974/Adrift_in_Dreams
    this.c = [
      'rgba(69,150,206,0.75)',
      'rgba(69,150,206,1.0)',
      'rgba(11,72,107,0.75)',
      'rgba(11,72,107,1.0)',
      'rgba(121,189,154,0.85)',
      'rgba(59,134,134,0.85)'
    ];
    this.sourcePaintStyle =
      {fillStyle: this.c[0], lineWidth: 4, outlineWidth: 1, outlineColor: this.c[3]};
    this.sourceHoverPaintStyle =
      {fillStyle: this.c[1], lineWidth: 4, outlineWidth: 1, outlineColor: this.c[3]};

    this.targetPaintStyle =
      {fillStyle: this.c[2], lineWidth: 4, outlineWidth: 1, outlineColor: this.c[1]};
    this.targetHoverPaintStyle =
      {fillStyle: this.c[3], lineWidth: 4, outlineWidth: 1, outlineColor: this.c[1]};

    this.connectorStyle =
      {lineWidth: 6, strokeStyle: this.c[4],
        gradient: {
          stops: [
            [0.0, this.c[0]],
            [0.6, this.c[2]]
          ]
        }
        };

    this.connectorHoverStyle =
      {lineWidth: 7, strokeStyle: this.c[5],
        gradient: {
          stops: [
            [0.0, this.c[0]],
            [0.2, this.c[2]]
          ]
        }
        };

    this.actionSourceEndpoint = {
      anchor: "BottomCenter",
      paintStyle: this.sourcePaintStyle,
      hoverPaintStyle: this.sourceHoverPaintStyle,
      maxConnections: 1,
      isSource: true,
      connectorStyle: this.connectorStyle,
      connectorHoverStyle: this.connectorHoverStyle
    };

    this.logicSourceEndpoint = {
      anchor: [0.8, 1.0, 0, 1],
      paintStyle: this.sourcePaintStyle,
      hoverPaintStyle: this.sourceHoverPaintStyle,
      maxConnections: -1,
      isSource: true,
      connectorStyle: this.connectorStyle,
      connectorHoverStyle: this.connectorHoverStyle
    };

    this.logicTargetEndpoint = {
      anchor: "TopCenter",
      paintStyle: this.targetPaintStyle,
      hoverPaintStyle: this.targetHoverPaintStyle,
      maxConnections: -1,
      isTarget: true,
      connectorStyle: this.connectorStyle,
      connectorHoverStyle: this.connectorHoverStyle
    };

    this.actionTargetEndpoint = {
      anchor: "TopCenter",
      paintStyle: this.targetPaintStyle,
      hoverPaintStyle: this.targetHoverPaintStyle,
      maxConnections: 1,
      isTarget: true,
      connectorStyle: this.connectorStyle,
      connectorHoverStyle: this.connectorHoverStyle
    };
    return this;
  }

}; // end PLUMBING

}();
module.exports = Rules;