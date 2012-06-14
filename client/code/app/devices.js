// in client/code/app/devices.js

var models = require('./models')
  , Daisy = models.Daisy
  , Sensor = models.Sensor
  , Daisies = models.Daisies
  , Sensors = models.Sensors;

var Devices = function() {

  // TODO TIE IN SS EVENT HANDLERS
    // handler for pub/sub coming from server
  // on user channel; any devices we claim 
  // ownership to that are live, the server will
  // relay live messages to us here
/*
  ss.event.on('daisy:status', function (daisy, channelName) {
    // todo find table row, and update status
    console.log('daisy status => ',daisy);
    var row = table.$('tr:contains('+daisy.mac+')');
    if(row) {
      var td = $(':nth-child(2)', row);
      $(td).val(daisy.online);
      if(daisy.online === true) {
        $(td).removeClass('daisy-offline').addClass('daisy-online');
      } else {
        $(td).removeClass('daisy-online').addClass('daisy-offline');
      }
    }
  });  */

  /*---------------------------------------------------------------------------
     View: SideBarView
       Handles sidebar navigation and checkbox selection
   --------------------------------------------------------------------------*/
  SideBarView = Backbone.View.extend({
    el: $('#sidebar-view'),

    events: { 
      'change .sensor-cb': 'sensorSelected',
      'click a': 'menuClicked'
    },

    initialize: function(options) {
      this.bus = options.bus;
      _.bindAll(this, 'render', 'sensorSelected', 'fadeSensorButtons');
    },

    render: function() {
      this.fadeSensorButtons(location.hash);
    },

    sensorSelected: function() {
      console.log('sensorSelected');
      // broadcast event about sensors that are checked
      var arr = _.pluck($('#sensor-cb-table :checked'), 'id');
      this.bus.trigger('sensorSelected', arr);
    },

    menuClicked: function(e) {
      this.fadeSensorButtons(e.currentTarget.hash);
    },

    fadeSensorButtons: function(hash) {
      var sensorButtons$ = this.$('#sensor-cb-table');
      if (hash === "#devices/register") {
        // we have to do this b/c they can come in straight on the URL
        this.$('#register-li').addClass('active');
        this.$('#daisies-li').removeClass('active');
        sensorButtons$.fadeTo(500, 0.25);
      } else {
        sensorButtons$.fadeTo(500, 1.0);
        this.$('#register-li').removeClass('active');
        this.$('#daisies-li').addClass('active');
      }
    }

  });


  /*---------------------------------------------------------------------------
     View: RegisterView
       Handles registration of secret key for user to claim Daisy ownership
   --------------------------------------------------------------------------*/
  RegisterView = Backbone.View.extend({
    el: $('#register-view'),

    events: { 
      'click #register-button': 'register'
    },

    initialize: function(options) {
      _.bindAll(this, 'render', 'register');
    },

    render: function() {

    },

    register: function(e) {
      e.preventDefault();
      this.$('.alert').remove();
      var secret = $('#secret-key').val();
      if(!secret) {
        return;
      } else {
        var me = this, html;
        ss.rpc('devices.register', secret, function(err, res) {
          if(true === res) {
            html = ss.tmpl['devices-register-true'].render({message:err});
          } else {
            html = ss.tmpl['devices-register-false'].render({message:err});
          }
          $(html).hide().appendTo(me.el).slideDown();
        });
      }
    }
  });


  /*---------------------------------------------------------------------------
     View: TableView
   --------------------------------------------------------------------------*/
  TableView = Backbone.View.extend({
    el: $('#table-view'),

    events: {
      'click #daisies-table tbody tr': 'selectRow'
    },

    initialize: function(options) {
      _.bindAll(this, 'render', 'selectRow');
      this.bus = options.bus;

      // create dataTable once
      this.table = this.$('#daisies-table').dataTable({
        "bPaginate": true,
        "bLengthChange": true,
        "bFilter": true,
        "bSort": true,
        "bInfo": true,
        "bAutoWidth": false,
        "bProcessing": true,
        "sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
        "sPaginationType": "bootstrap",
        "oLanguage": {
          "sLengthMenu": "_MENU_ records per page"
        },
        "aoColumns": [
          { "mDataProp": "_id", "bVisible": false },
          { "mDataProp": "did", "sClass": "canEdit" },
          { "mDataProp": "key", "sClass": "canEdit", "bVisible": false },
          { "mDataProp": "lastMod", "bVisible": false },
          { "mDataProp": "owners", "bVisible": false },
          { "mDataProp": "online", "sDefaultContent": "false"},
          { "mDataProp": "mac" }
        ]
      });
    },

    render: function() {
      var table = this.table;
      table.fnClearTable();
      table.fnAddData(this.collection.toJSON());

      // add jEditable to table data; only .canEdit class are editable
      $('.canEdit', table.fnGetNodes()).editable(function (val, settings) {
          // get the object for this row
          var obj = table.fnGetData(table.fnGetPosition(this)[0]);
          // we know it is the did property
          obj.did = val;
          console.log(obj);
          ss.rpc('devices.save', obj, function(ok) {
            if (ok === false) {
              alert("update failed");
              _refresh();
            }
          });
          return (val);
        }, {
          type: 'textarea',
          event: 'dblclick',
          tooltip: 'Doubleclick to edit...', 
          submit: 'OK'  }
      ); // end .editable 
    },

    selectRow: function(e) {
      var row = $(e.currentTarget);
      // toggle selected style on row
      if (row.hasClass('row_selected')) {
        row.removeClass('row_selected');
      } else {
        this.table.$('tr.row_selected').removeClass('row_selected');
        row.addClass('row_selected');
      }
      var daisy = this.table._('.row_selected')[0];
      // broadcast event about daisy that is selected
      this.bus.trigger('daisySelected', daisy);
    }
  });

  /*---------------------------------------------------------------------------
     View: RealTimeView - basically a wrapper around a Flot chart for sensors
        We wrap it in a self-invoking closure so we can make use of private
        vars and we don't have to write this.property all the time.
   --------------------------------------------------------------------------*/
  RealTimeView = (function() {

    // current named sensors that are checke on SubNav View
    var checkedSensors = [];

    var bus = null;

    // the div that holds the Flot graph
    var chart = $('#chart');

    // the Flot Plot
    var plot = null;

    // configures Flot
    var chartOptions = {
      legend: {
        show: true,
        margin: 10,
        backgroundOpacity: 0.5
      },
      grid: { hoverable: true, clickable: true },
      points: {
        show: true,
        radius: 3
      },
      lines: {
        show: true
      },
      xaxis: {
        mode: 'time',
        twelveHourClock: true,
        labelAngle: -45
      },
      selection: { mode: 'x' },
      yaxes: [
        { labelWidth: 40,
          position: "right",
          sensor: "shared",
          ticks: [[0.0, "OFF"], [1.0, "ON"]] }, // power,leak,magnet
        { labelWidth: 40,
          position: "left",
          sensor: "AD4",
          color: Sensor.info.AD4.color,
          tickFormatter: function (n, obj) { return n + "%"; } },  // humidity
        { labelWidth: 40,
          position: "left",
          sensor: "AD5",
          color: Sensor.info.AD5.color,
          tickFormatter: function (n, obj) { return n + "F"; } },  // temp
        { labelWidth: 40,
          position: "left",
          sensor: "AD6",
          color: Sensor.info.AD6.color },  // moisture
        { labelWidth: 40,
          position: "left",
          sensor: "AD7",
          color: Sensor.info.AD7.color,
          tickFormatter: function (n, obj) { return n + "V"; } }  // battery
      ],
      zoom: {
        interactive: false,
        trigger: "dblclick", // or "click" for single click
        amount: 0.1       // 2 = 200% (zoom in), 0.5 = 50% (zoom out)
      },
      pan: {
        interactive: false,
        cursor: "move",      // CSS mouse cursor value used when dragging, e.g. "pointer"
        frameRate: 20
      }
    };

    return Backbone.View.extend({
   
      el: $('#realtime-view'),

      events: { 
        'plothover #chart': 'plotHover',
        'plotselected #chart': 'plotSelected',
        'plotunselected #chart': 'plotUnselected'
      },

      initialize: function(options) {
        bus = options.bus;
        _.bindAll(this, 'render', 'daisySelected', 'sensorSelected', 'plotHover', 'plotSelected', 'plotUnselected');
        bus.bind('daisySelected', this.daisySelected);
        bus.bind('sensorSelected', this.sensorSelected);
        chart = this.$('#chart');
        plot = $.plot(chart, [], chartOptions);
        checkedSensors = _.pluck($('#sensor-cb-table :checked'), 'id');

        var me = this;

        ss.event.on('daisy:sensors', function(data, channelName) {
          // if we received data with mac for the daisy currently selected, we
          // add it to the collection and refresh the chart
          if ( me.collection.find( function(s) {
            return s.get('mac') === data.mac;
            }) ) {
            console.log('new datapoint timestamp: '+data.timestamp);
            console.log('adding new datapoint to collection at '+new Date(data.timestamp), data);
            me.collection.add(data);
            me.render();
          }
        });
      },

      render: function() {
        var points = this.collection.flotData(checkedSensors);

        console.log('render: this.ranges', this.ranges);
        if (this.ranges) {
          // keep zoom level the same
          
          var last = this.collection.pluck('timestamp')[this.collection.length-1];
          var xaxis = { xaxis: { min: this.ranges.xaxis.from, max: last + 100 }};
          plot = $.plot(chart, points, 
              $.extend(true, {}, chartOptions, xaxis) );
        } else {
          console.log('NEW PLOT HAPPENS');
          plot = $.plot(chart, points, chartOptions);
          this.updateAxes(plot);
        }
        
      },

      /* daisy was selected in the table, fetch it's sensor data */
      daisySelected: function(daisy) {
        this.ranges = undefined;
        if (daisy) {
          this.model = daisy;
          this.collection.fetch({mac: daisy.mac, 
            success: this.render});
          this.$('#realtime-header').html('Real-Time Data: '+daisy.did);
        } else {
          this.collection.reset();
          plot = $.plot(chart, [], chartOptions);
          this.$('#realtime-header').html('Real-Time Data');
        }
      },

      sensorSelected: function(arr) {
        checkedSensors = arr;
        this.render();
      },

      previousPoint: null,

      plotHover: function (event, pos, item) {
        if (item) {
          if (this.previousPoint !== item.dataIndex) {
            this.previousPoint = item.dataIndex;
            $("#tooltip").remove();
            $(ss.tmpl['devices-tooltip'].render({
              sensor: item.series.label + ': ' + item.datapoint[1].toFixed(2),
              timestamp: new Date(item.datapoint[0])
            }))
            .css('top', item.pageY + 5)
            .css('left', item.pageX + 5)
            .css('background-color', item.series.color)
            .appendTo('body')
            .fadeIn(200);
          }
        } else {
          $("#tooltip").remove();
          this.previousPoint = null;
        }
      },

      plotSelected: function(e, ranges) {
        if (ranges) {
          this.ranges = ranges;
          var xaxis = { xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }};
          plot = $.plot( chart, this.collection.getCached(),
            $.extend(true, {}, chartOptions, xaxis) ); 
        }
      },

      plotUnselected: function(e) {
        console.log('plotUnselected: ', this.ranges);
        var xaxis = { xaxis: { min: this.min, max: this.max } };
        if (this.ranges) {
          plot = $.plot( chart, this.collection.getCached(),
            $.extend(true, {}, chartOptions, xaxis) ); 
        }
      },

      updateAxes: function (plot) {
        $.each(plot.getAxes(), function (i, axis) {
          if (!axis.show || axis.direction === "x" || axis.options.sensor === undefined || axis.options.sensor === "shared") {
            return;
          }

          var left = axis.box.left,
            top = axis.box.top,
            right = left + axis.box.width,
            bottom = top + axis.box.height,
            cls = axis.direction + axis.n + 'Axis',
            box,
            color;

          plot.getPlaceholder().find('.' + cls + ' .tickLabel').each(function () {
            var pos = $(this).position();
            left = Math.min(pos.left, left);
            top = Math.min(pos.top, top);
            right = Math.max(Math.round(pos.left) + $(this).outerWidth(), right);
            bottom = Math.max(Math.round(pos.top) + $(this).outerHeight(), bottom);
          });
          box = {left: left, top: top, width: 50, height: bottom - top};
          color = Sensor.info[axis.options.sensor].color;
          // fixme: first time through box is not right size; resize browser or check/uncheck and it fixes itself
          $('<div class="axisTarget" style="position:absolute;left:' +
             box.left + 'px;top:' +
             box.top + 'px;width:' +
             box.width + 'px;height:' +
             box.height + 'px"></div>')
            .data('axis.direction', axis.direction)
            .data('axis.n', axis.n)
            .css({ backgroundColor: color, opacity: 0, cursor: "pointer" })
            .appendTo(plot.getPlaceholder())
            .hover(
              function () { $(this).css({ opacity: 0.60 }); },
              function () { $(this).css({ opacity: 0 }); }
            );
        }); // end .each function param

        this.minx = plot.getAxes().xaxis.min;
        this.maxx = plot.getAxes().xaxis.max;
      }, // end updateAxes

    });
  })();
  

  /*---------------------------------------------------------------------------
    This module's private methods and variable initialization 
   --------------------------------------------------------------------------*/

  // refresh function
  var _refresh = function() {
    sidebarView.render();
    daisies.fetch({success: tableView.render});
  };

  // event bus
  var bus = _.extend({}, Backbone.Events);
  // collection of daisies
  var daisies = new Daisies({url: 'devices.get'});
  // daisies table view
  var tableView = new TableView({collection: daisies, bus: bus});
  // collection of sensors
  var sensors = new Sensors({url: 'sensors.get'});
  // realtime charting view
  var realtimeView = new RealTimeView({collection: sensors, bus: bus});
  // register view
  var registerView = new RegisterView();
  // sidebar nav view
  var sidebarView = new SideBarView({bus: bus});

  /*---------------------------------------------------------------------------
    This module's public methods 
   --------------------------------------------------------------------------*/
  return {
    refresh: _refresh
  };
  
}();
module.exports = Devices;