
var Models = function() {

  Sensor = Backbone.Model.extend({
    defaults: {
      type: 'Sensor'
    },
    validation: {
      daisy: { required: true, msg: "Error" },
      sensor: { required: true, msg: "Error" },
      value: { required: true, msg: "Error" },
      connections: function (val) {
        if (!val || val.length === 0) { return "Error"; }
      }
    }
  });

  Widgets = Backbone.Collection.extend({

  });

}();

exports.Widgets = Widgets;
exports.Sensor = Sensor;