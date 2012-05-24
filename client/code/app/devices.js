// in client/code/app/devices.js

var Devices = function() {

  ss.event.on('sensorData', function(data, channelName) {
    console.log('Message received on the '+channelName+' channel', data);
    sensors.add(new DC.m.Sensor(data));
    sensorsView.render();
 /*   if (_.any(sensors, function(sensor) {
      return data.mac === sensor.mac;
    })) {
      sensors.add(new DC.m.Sensor(datum));
      sensorView.render();
    } */
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
  });

  // initialize daisies DataTable
  var table = $('#myDaisiesTable').dataTable( {
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
      { "mDataProp": "mac" },
      { "mDataProp": "key", "sClass": "canEdit", "bVisible": false },
      { "mDataProp": "lastMod", "bVisible": false },
      { "mDataProp": "owners", "bVisible": false }
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
  });

  // refresh function
  var _refresh = function() {
    ss.rpc('devices.get', function(err, daisies) {
      if (err) alert(err);
      else {
        table.fnClearTable();
        console.log(daisies);
        table.fnAddData(daisies);
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
    });
  }



 // DC is global object
 DC = {
    /* models */
    m: {},
    /* collections */
    c: {},
    /* views */
    v: {},
    /* templates */
    t: {}
  };

  DC.m.Daisy = Backbone.Model.extend({

  });

  DC.m.Sensor = Backbone.Model.extend({

  });

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

  DC.c.Sensors = Backbone.Collection.extend({
    model: DC.m.Sensor,

    // sort by time
    comparator: function (sensor) {
      return sensor.get('timestamp');
    },

    // convert raw data to format flot expects
    flotData: function (arr) {
      console.log('array length: '+arr.length);
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

    chartOptions: {
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
        twelveHourClock: true
      },
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
            date.getHours() + ":" +
            date.getMinutes() + ":" +
            date.getSeconds() + ":" +
            date.getMilliseconds() +
            " = " + y);
        }
      } else {
        $("#tooltip").remove();
        this.previousPoint = null;
      }
    },

    showTooltip: function (x, y, contents) {
      $("<div id='tooltip'>" + contents + "</div>").css({
        position: 'absolute',
        'font-family': 'Helvetica,Arial,sans-serif',
        'font-size': '0.75em',
        display: 'none',
        top: y + 5,
        left: x + 5,
        border: '1px solid #fdd',
        padding: '2px',
        'background-color': '#fee',
        opacity: 0.80
      }).appendTo("body").fadeIn(200);
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
      var arr = _.pluck($('#sensorButtons :checked'), 'id');
      console.log(arr);
      var plot, data = this.collection.flotData(arr);
      
      $("#chart").width($('#chart').parent().width() - 25);
      plot = $.plot($("#chart"), data, this.chartOptions);
      this.updateAxes(plot);
    }

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