// in client/code/app/rules.js

var models = require('./widgets')
  , Sensor = models.Sensor
  , Widgets = models.Widgets;

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

  // -------------------------------------------------------
  // View: EditorView
  // -------------------------------------------------------
  EditorView = Backbone.View.extend({
    el: $('#editor-view'),

    events: {

    },

    initialize: function(options) {
      // FIXME: see if we can load jqueryui on demand instead
      /*ss.load.code('/editor', function() {
        console.log('all code is loaded');
      });*/

      _.bindAll(this, 'render', 'addOne', 'removeOne', 'save', 'clear');

      var col = this.collection;

      col.bind('add', this.addOne);
      col.bind('remove', this.removeOne);

      $('.ed-toolbar-item').draggable({
        appendTo: '#editor-view',
        helper: 'clone'
      });

      $('#editor-view').droppable({
        drop: function (event, ui) {
          var o = {position: ui.position};

          switch(ui.draggable[0].innerHTML) {
            case "Sensor":

              col.add(new Sensor(), o);
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


  // -------------------------------------------------------
  // View: WidgetView
  // -------------------------------------------------------
  WidgetView = Backbone.View.extend({
    tagName: 'div',
    className: 'ed-widget',
    position: {},

    initialize: function (options) {
      _.bindAll(this, 'connected', 'disconnected', 'validated', 
        'valid', 'invalid', 'showErrors', 'hideErrors');
      this.position = options.position;

      // set uid
      this.model.set('uid', options.uid);
      $(this.el).attr('id', options.uid);

      this.model.bind('destroy', this.remove);



      // make it draggable
      jsPlumb.draggable(this.el);

      // can't put in events - bind to view el
      $(this.el).bind('ed:connected', this.connected);
      $(this.el).bind('ed:disconnected', this.disconnected);

      // can't put in events - bind to model
      this.model.bind('validated', this.validated);
      Backbone.Validation.bind(this, {
        valid: this.valid,
        invalid: this.invalid
      });
    },

    render: function () {
      // add it to the canvas
      $('#ed-canvas').append(this.el);

      // set the position where they dropped it
      $(this.el).position({
        of: $('#ed-canvas'),
        my: 'left top',
        at: 'left top',
        offset: this.position.left + ' ' + this.position.top
      });
    },

    connected: function (e, info) {
      e.stopImmediatePropagation();

      // initialize the connections array if it doesn't exist
      var c = this.model.get('connections');
      if (c === undefined) {
        c = [];
      }
      c.push({src: info.sourceId, tgt: info.targetId});
      this.model.set({connections: c}, {forceUpdate: true});

      console.log('connected =>', JSON.stringify(this.model.toJSON()));
      return false;
    },

    disconnected: function (e, info) {
      e.stopImmediatePropagation();
      var c = this.model.get('connections');
      c.splice(c.indexOf({src: info.sourceId, tgt: info.targetId}), 1);
      this.model.set('connections', c);

      console.log('disconnected =>', JSON.stringify(this.model.toJSON()));
      return false;
    },

    remove: function () {
      var me = $(this.el), conns = jsPlumb.getConnections({source: me}), i=0;
      for (i = 0; i < conns.length; i += 1) {
        jsPlumb.detach(conns[i]);
      }
      jsPlumb.removeAllEndpoints(me);
      me.hide('explode', 1000, function () {
        me.remove();
      });
    },

    deleteModel: function () {
      this.model.destroy();
    },

    valid: function (view, attr) {
      console.log($(view.el).attr('id') + '\tvalid => ' + attr);
    },

    invalid: function (view, attr, error) {
      console.log($(view.el).attr('id') + '\tinvalid => ' + attr + ' \t=> ' + error);
      this.errors.push(error);
    },

    validated: function (isValid, model, attrs) {
      console.log($(this.el).attr('id') + '\tvalidated => ' + isValid + '\n\n');
      this.$('.ed-widget-invalid').toggle(!isValid);
      if (!isValid && attrs.length > 0) {
        var ul = this.$('.ed-widget-errors');
        // clear out errors ul li items
        ul.empty();
        _.each(this.errors, function (e) {
          ul.append('<li>' + e + '</li>');
        });
      }
      // clear the array
      this.errors.length = 0;
    },

    showErrors: function (e) {
      return _.throttle(this.$('.popup').fadeToggle(300), 5000);
    },

    hideErrors: function (e) {
      return _.throttle(this.$('.popup').slideToggle(300), 5000);
    }
  });

  SensorView = WidgetView.extend({
    template: ss.tmpl['rules-widget'].render({title:"If the Sensor"}),
    errors: [],

    events: {
      'click .ui-dialog-titlebar-close': 'deleteModel',
      'multiselectclick .daisy': 'selectDaisy',
      'multiselectclick .sensor': 'selectSensor',
      'click .ed-widget-invalid': 'showErrors'
    },

    innerview: undefined,

    initialize: function (options) {
      _.bindAll(this, 'render', 'remove', 'deleteModel', 'selectDaisy',
        'selectSensor', 'showErrors', 'hideErrors');

      options.uid = 'sensor-' + this.model.cid;
      this.constructor.__super__.initialize.call(this, options);

      // add multiselects
 /*     this.$('.sensor').multiselect({
        multiple: false,
        header: 'Choose a Sensor',
        noneSelectedText: 'No Sensor Selected',
        selectedList: 1
      });

      // todo fetch daisies and fill in

      this.$('.daisy').multiselect({
        multiple: false,
        header: 'Choose a Daisy',
        noneSelectedText: 'No Daisy Selected',
        selectedList: 1
      }); */
    },

    render: function () {
      this.constructor.__super__.render.call(this);

      $(this.el).addClass('ui-dialog')
        .addClass('ui-widget-content')
        .addClass('ui-corner-all')
        .attr('tabIndex', '-1')
        .html(this.template);

      // add endpoint
      //jsPlumb.addEndpoint(this.el, Plumbing.actionSourceEndpoint);
    },

    selectDaisy: function () {
      this.model.set('daisy', this.$('.daisy').multiselect('getChecked').val());

    },

    selectSensor: function () {

    }
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