// in client/code/app/devices.js

var Devices = function() {

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

  /***********************************************************
   * Model: Daisy
   ***********************************************************/
  DC.m.Daisy = Backbone.Model.extend();

  /***********************************************************
   * Model: Sensor
   ***********************************************************/
  DC.m.Sensor = Backbone.Model.extend();

  /***********************************************************
   * Sensor Model constants
   ***********************************************************/
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

  /***********************************************************
   * Collection: Daisies
   ***********************************************************/
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
        if (err) { return options.error(err); }
        return options.success(arr);
      })
      return;
    }
  });

  /**********************************************************
   * Collection: Sensors
   **********************************************************/
  DC.c.Sensors = Backbone.Collection.extend({
    model: DC.m.SensorData,

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

    // convert raw data to format flot expects
    // @param array of sensor names e.g. ['AD1', 'AD2']
    // returns object with array of coordinates by timestamp
    flotData: function (arr) {
      var data = [], i, j, info,
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
            lines: { show: true, steps: true }
          });
        } else {
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            yaxis: info.yaxis
          });
        }
      }
      return data;
    }
  });

  /**********************************************************
   * View: TableView
   **********************************************************/
  DC.v.TableView = Backbone.View.extend({
    el: $('#table-view'),

    events: {
      'click #daisiesTable tbody tr': 'selectRow'
    },

    initialize: function(options) {
      _.bindAll(this, 'render', 'selectRow');
      this.bus = options.bus;

      // create dataTable once
      this.table = $('#daisiesTable').dataTable({
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
          { "mDataProp": "online" },
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
      // broadcast event about daisy that is selected
      this.bus.trigger('daisySelected', this.table._('.row_selected'));
    }
  });

  /**********************************************************
   * View: ChartView
   **********************************************************/
  DC.v.RealTimeView = Backbone.View.extend({
    el: $('#realtime-view'),

    events: { 
      'plothover #chart': 'plotHover',

    },

    initialize: function(options) {
      this.bus = options.bus;
      _.bindAll(this, 'render', 'daisySelected', 'plotHover');
      this.bus.bind('daisySelected', this.daisySelected);
    },

    render: function() {

    },

    daisySelected: function(daisy) {
      if (daisy) {
        this.model = daisy;
        this.collection.fetch({mac: daisy.get('mac'), 
          success: this.render});
      }
    },

    plotHover: function() {
      
    }

  });

  /********************************************************
   * View: RegisterView
   ********************************************************/
  DC.v.RegisterView = Backbone.View.extend({
    el: $('#register-view'),

    events: { },

    initialize: function(options) {
      _.bindAll(this, 'render');
    },

    render: function() {

    }

  });

  /********************************************************
   * View: SidebarView
   ********************************************************/
  DC.v.SidebarView = Backbone.View.extend({
    el: $('#sidebar-view'),

    events: { 
      'change .sensor-cb': 'sensorSelected'
    },

    initialize: function(options) {
      this.bus = options.bus;
      _.bindAll(this, 'render', 'sensorSelected');
    },

    render: function() {

    },

    sensorSelected: function() {

    }
  })


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
  });

  // register a new daisy with secret key
  $('#registerDaisy').click(function(e) {
    e.preventDefault();
    var secret = $('#daisySecretKey').val();
    if(!secret) {
      return;
    } else {
      ss.rpc('devices.register', secret, function(err) {
        if (err) alert(err);
        else {
          _refresh();
        }
      });
    }
  }); */

  // initialize daisies DataTable
/*  var table = $('#myDaisiesTable').dataTable( {
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
      { "mDataProp": "online" },
      { "mDataProp": "mac" }
    ]
  });

  // select a table row
  $('#myDaisiesTable tbody tr').live('click', function (e) {
    if ($(this).hasClass('row_selected')) {
      $(this).removeClass('row_selected');
      sensors.reset();
      sensorsView.render();
      return;
    } else {
      table.$('tr.row_selected').removeClass('row_selected');
      $(this).addClass('row_selected');
    }
    // find the td with the mac address
    var td = $(this).find('td:last')[0];
    if(td) {
      // get the mac address text
      var mac = $(td).text();
      // rpc call to get sensors for that mac address
      ss.rpc('sensors.get', mac, function(err, data) {
        if(err) { alert("failed to get sensor data "+err); return; }
        else {
          console.log('fetched '+data.length+' sensors');
          sensors.reset();
          _.each(data, function(datum) {
            sensors.add(new DC.m.Sensor(datum));
          });
          sensorsView.render();
        }
      });
    }
  }); */

  // refresh function
  var _refresh = function() {
    // fetch the latest daisies
    daisies.fetch({success: tableView.render});

    /*ss.rpc('devices.get', function(err, devices) {
      if (err) alert(err);
      else {
        // clear the table and add new data
        table.fnClearTable();
        table.fnAddData(devices);
        // add jEditable to table data
        // only columns with the .canEdit class can be edited
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
            submit: 'OK' 
          }); // end .editable 
      } 
    }); */
  }

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


/*
  DC.c.Sensors = Backbone.Collection.extend({
    model: DC.m.Sensor,

    // sort models by timestamp
    comparator: function (sensor) {
      return sensor.get('timestamp');
    },

    // convert raw data to format flot expects
    // @param array of sensor names e.g. ['AD1', 'AD2']
    // returns object with array of coordinates by timestamp
    flotData: function (arr) {
      var data = [], i, j, info,
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
            lines: { show: true, steps: true }
          });
        } else {
          data.push({
            color: info.color,
            label: info.name,
            data: _.zip(timestamps, vals),
            yaxis: info.yaxis
          });
        }
      }
      return data;
    }
  }); */

  DC.v.Sensors = Backbone.View.extend({

    events: {
      'plothover #chart': 'plotHover',
      'change .sensor-cb': 'updateChart'
    },

    el: $('#devices'),

    initialize: function (options) {
      _.bindAll(this, 'render', 'updateChart', 'plotHover', 'showTooltip');
    },

    render: function () {
      this.updateChart();
      return this;
    },

    weekendAreas: function(axes) {
      var markings = [];
      var d = new Date(axes.xaxis.min);
      // go to the first Saturday
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7))
      d.setUTCSeconds(0);
      d.setUTCMinutes(0);
      d.setUTCHours(0);
      var i = d.getTime();
      do {
          // when we don't set yaxis, the rectangle automatically
          // extends to infinity upwards and downwards
          markings.push({ xaxis: { from: i, to: i + 2 * 24 * 60 * 60 * 1000 } });
          i += 7 * 24 * 60 * 60 * 1000;
      } while (i < axes.xaxis.max);

      return markings;
    },

    chartOptions: {
      legend: {
        show: true,
        margin: 10,
        backgroundOpacity: 0.5
      },
      grid: { hoverable: true, clickable: true, markings: this.weekendAreas },
      points: {
        show: true,
        radius: 3
      },
      lines: {
        show: true
      },
      xaxis: {
        mode: 'time',
        twelveHourClock: true
      },
      selection: { mode: 'xy' },
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
      ]
    },

    previousPoint: undefined,
    plotHover: function (event, pos, item) {
      if (item) {
        if (this.previousPoint !== item.dataIndex) {
          this.previousPoint = item.dataIndex;
          $("#tooltip").remove();
          var date = new Date(item.datapoint[0]),
            y = item.datapoint[1].toFixed(2);
          this.showTooltip(item.pageX, item.pageY, item.series.label + " at " +
            date.toLocaleString() + " = " + y);
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
    }, // end updateAxes

    updateChart: function() {
      // figure out which sensors are checked
      var arr = _.pluck($('#sensorButtons :checked'), 'id');
      // get the raw flot data
      var plot, data = this.collection.flotData(arr);
      console.log('updateChart => ', data);
      // resize #chart accordingly
      $("#chart").width($('#chart').parent().width() - 25);
      // plot it
      plot = $.plot($("#chart"), data, this.chartOptions);

      // create plot overview
      var overview = $.plot($("#overview"), data, {
        series: {
            lines: { show: true, lineWidth: 1 },
            shadowSize: 0
        },
        legend: { show: false },
        xaxis: { mode: "time", twelveHourClock: true },
        yaxis: { ticks: []},
        grid: { color: "#999" },
        selection: { mode: "xy" }
      });

      // now connect the two
    
      $("#chart").bind("plotselected", function (event, ranges) {
        // do the zooming
        plot = $.plot($("#chart"), data,
            $.extend(true, {}, this.chartOptions, {
                xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }
        }));

        // don't fire event on the overview to prevent eternal loop
        overview.setSelection(ranges, true);

        // do fancy axes
        //this.updateAxes(plot);
      });
    
      $("#overview").bind("plotselected", function (event, ranges) {
        plot.setSelection(ranges);
      });

      // do fancy axes
      this.updateAxes(plot);

    } // end updateChart

  });

  var sensors = new DC.c.Sensors();
  var sensorsView = new DC.v.Sensors({collection: sensors, el: $('#devices')});

  $(window).resize(_.throttle(sensorsView.updateChart, 100));

  // functions we export
  return {
    refresh: _refresh
  }
  
}();
module.exports = Devices;