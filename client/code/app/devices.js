// in client/code/app/devices.js

var Devices = function() {

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
    } else {
      table.$('tr.row_selected').removeClass('row_selected');
      $(this).addClass('row_selected');
    }
    var td = $(this).find('td:last')[0];
    if(td) {
      var mac = $(td).text();
      ss.rpc('sensors.get', mac, function(err, data) {
        if(err) { alert("failed to get sensor data "+err); return; }
        else {
          console.log('fetched '+data.length+' sensors!');
          _.each(data, function(datum) {
            sensors.add(new DC.m.Sensor(datum));
            sensorsView.render();
          });
        }
      });
    }
  });

  // refresh function
  var _refresh = function() {
    console.log("I AM REFRESHING DAISIES NOW");
    ss.rpc('devices.getmine', function(err, daisies) {
      if (err) alert(err);
      else {
        table.fnClearTable();
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
          submit: 'OK' }) 
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
      return sensor.get('time');
    },

    // convert raw data to format flot expects
    flotData: function (arr) {
      var data = [], i, j, info, vals, boolSensor, timestamps = _.map(this.pluck('time'), function (num) {
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

    initialize: function (options) {
      _.bindAll(this, 'render', 'updateChart');
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

    updateChart: function() {
      var plot, data = this.collection.flotData(["AD0", "AD1"]);
      //$('#chart').width($(document).width() - 100);
      plot = $.plot($('#chart'), data, this.chartOptions);
    }

  });

  var sensors = new DC.c.Sensors();
  var sensorsView = new DC.v.Sensors({collection: sensors});

  // functions we export
  return {
    refresh: _refresh
  }
  
}();
module.exports = Devices;