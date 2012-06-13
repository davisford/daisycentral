// in client/code/app/devices.js

var Devices = function() {

  // TODO TIE IN SS EVENT HANDLERS
    // handler for pub/sub coming from server
  // on user channel; any devices we claim 
  // ownership to that are live, the server will
  // relay live messages to us here
/*  ss.event.on('daisy:sensors', function(data, channelName) {
    // if we received data with mac for the daisy currently selected, we
    // add it to the collection and refresh the chart
    if ( sensors.find(function(s) {
      return s.get('mac') === data.mac;
    }) ) {
      sensors.add(new DC.m.Sensor(data));
      sensorsView.render();
    }
  });

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

  // Backbone namespace DC 
  DC = {
    /* models */
    m: {},
    /* collections */
    c: {},
    /* views */
    v: {},
    /* templates */
    t: {}
  }


  /*---------------------------------------------------------------------------
     Model: Daisy
   --------------------------------------------------------------------------*/
  DC.m.Daisy = Backbone.Model.extend();


  /*---------------------------------------------------------------------------
     Model: Sensor
   --------------------------------------------------------------------------*/
  DC.m.Sensor = Backbone.Model.extend();


  /*---------------------------------------------------------------------------
     SensorInfo: constants; could move this somewhere else
   --------------------------------------------------------------------------*/
  DC.m.SensorInfo = {
    AD0: { name: "RX-I", bool: false, yaxis: -1, color: "#000" },
    AD1: { name: "Power", bool: true, yaxis: 1, color: "#CB4B4B" },
    AD2: { name: "Leak Detection", bool: true, yaxis: 1, color: "#4DA74D" },
    AD3: { name: "Magnetic Switch", bool: true, yaxis: 1, color: "#9440ED" },
    AD4: { name: "Humidity", bool: false, yaxis: 2, color: "#BD9B33" },
    AD5: { name: "Temperature", bool: false, yaxis: 3, color: "#8CACC6" },
    AD6: { name: "Moisture", bool: false, yaxis: 4, color: "#A23C3C" },
    AD7: { name: "Battery", bool: false, yaxis: 5, color: "#3D853D" }
  };


  /*---------------------------------------------------------------------------
     Collection: Daisies
       Holds the collection of Daisies assigned to this user
   --------------------------------------------------------------------------*/
  DC.c.Daisies = Backbone.Collection.extend({
    
    model: DC.m.Daisy,

    // override Backbone.Collection.fetch()
    "fetch": function(options) {
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection.reset(resp, options);
        if (success) success(collection, resp);
      };
      options.error = Backbone.wrapError(options.error, collection, options);
      ss.rpc('devices.get', function(err, arr) {
        console.log('fetched daisies: ', err, arr);
        if (err) { return options.error(err); }
        return options.success(arr);
      })
      return;
    }
  });


  /*---------------------------------------------------------------------------
     Collection: Sensors
       Holds the sensor data for a particular Daisy
   --------------------------------------------------------------------------*/
  DC.c.Sensors = Backbone.Collection.extend({
    model: DC.m.Sensor,

    comparator: function (sensor) {
      return sensor.get('timestamp');
    },

    "fetch": function(options) {
      var collection = this;
      var success = options.success;
      options.success = function(resp, status, xhr) {
        collection.reset(resp, options);
        if (success) success(collection, resp);
      }; 
      options.error = Backbone.wrapError(options.error, collection, options);
      ss.rpc('sensors.get', options.mac, function(err, arr) {
        if (err) { return options.error(err); }
        return options.success(arr);
      });
      return;
    },

    getCached: function () {
      return this.cached || [];
    },

    /**
     * Converts the models in this collection to a format flot expects
     * @param {Array} [arr] an array naming the sensors that should be shown; other
     *    sensors will be filtered out.  e.g. ['AD0', 'AD1']
     * @return an array of data for flot
     */
    flotData: function (arr) {
      var arr, data = [], i, j, info,
          vals, boolSensor, 
          timestamps = _.map(this.pluck('timestamp'), function (num) {
            // convert GMT time to local timestamp
            var localNow = new Date().getTimezoneOffset(),
            min = num / 1000 / 60;
            return (min - localNow) * 1000 * 60;
          });

      for (i = 0; i < arr.length; i += 1) {
        info = DC.m.SensorInfo[arr[i]];
        vals = this.pluck(arr[i]);
        boolSensor = _.any(["Power", "Leak Detection", "Magnetic Switch"], function (sensor) {
          return sensor === info.name;
        });

        if (boolSensor) {
          // boolean sensors have the raw values converted to 0 or 1 based on midpoint between 0-65534
          for (j = 0; j < vals.length; j += 1) {
            if (vals[j] > (65534 / 2)) {
              vals[j] = 1;
            } else { vals[j] = 0; }
          }
          // boolean sensors all share the same yaxis, and have line steps
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            yaxis: info.yaxis,
            clickable: true,
            hoverable: true,
            lines: { show: true, steps: true }
          });
        } else {
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            clickable: true,
            hoverable: true,
            yaxis: info.yaxis
          });
        }
      }
      this.cached = data;
      return data;
    }
  });


  /*---------------------------------------------------------------------------
     View: SideBarView
       Handles sidebar navigation and checkbox selection
   --------------------------------------------------------------------------*/
  DC.v.SideBarView = Backbone.View.extend({
    el: $('#sidebar-view'),

    events: { 
      'change .sensor-cb': 'sensorSelected',
      'click a': 'submenuClick'
    },

    initialize: function(options) {
      this.bus = options.bus;
      _.bindAll(this, 'render', 'sensorSelected');
    },

    render: function() {

    },

    sensorSelected: function() {
      console.log('sensorSelected');
      // broadcast event about sensors that are checked
      var arr = _.pluck($('#sensorButtons :checked'), 'id');
      this.bus.trigger('sensorSelected', arr);
    },

    submenuClick: function(e) {
      var sensorButtons$ = this.$('#sensorButtons');
      if (e.currentTarget.hash === "#registerDaisy") {
        sensorButtons$.fadeTo(500, 0.25);
      } else {
        sensorButtons$.fadeTo(500, 1.0);
      }
    }
  });


  /*---------------------------------------------------------------------------
     View: RegisterView
       Handles registration of secret key for user to claim Daisy ownership
   --------------------------------------------------------------------------*/
  DC.v.RegisterView = Backbone.View.extend({
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
      var secret = $('#daisySecretKey').val();
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
  DC.v.TableView = Backbone.View.extend({
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
  DC.v.RealTimeView = (function() {

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
          color: DC.m.SensorInfo.AD4.color,
          tickFormatter: function (n, obj) { return n + "%"; } },  // humidity
        { labelWidth: 40,
          position: "left",
          sensor: "AD5",
          color: DC.m.SensorInfo.AD5.color,
          tickFormatter: function (n, obj) { return n + "F"; } },  // temp
        { labelWidth: 40,
          position: "left",
          sensor: "AD6",
          color: DC.m.SensorInfo.AD6.color },  // moisture
        { labelWidth: 40,
          position: "left",
          sensor: "AD7",
          color: DC.m.SensorInfo.AD7.color,
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
        checkedSensors = _.pluck($('#sensorButtons :checked'), 'id');

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

      showTooltip: function (x, y, contents) {
        $(ss.tmpl['devices-tooltip'].render({contents: contents }))
          .css('top', y + 5)
          .css('left', x + 5)
          .appendTo('body')
          .fadeIn(200);
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
          color = DC.m.SensorInfo[axis.options.sensor].color;
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
    // fetch the latest daisies
    daisies.fetch({success: tableView.render});
  };

  // event bus
  var bus = _.extend({}, Backbone.Events);
  // collection of daisies
  var daisies = new DC.c.Daisies();
  // daisies table view
  var tableView = new DC.v.TableView({collection: daisies, bus: bus});
  // collection of sensors
  var sensors = new DC.c.Sensors();
  // realtime charting view
  var realtimeView = new DC.v.RealTimeView({collection: sensors, bus: bus});
  // register view
  var registerView = new DC.v.RegisterView();
  // sidebar nav view
  var sidebarView = new DC.v.SideBarView({bus: bus});

  /*---------------------------------------------------------------------------
    This module's public methods 
   --------------------------------------------------------------------------*/
  return {
    refresh: _refresh
  };
  
}();
module.exports = Devices;