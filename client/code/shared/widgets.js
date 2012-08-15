// models for rule editor
module.exports = (function () {

  var SensorWidget = Backbone.Model.extend({
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

  var Widgets = Backbone.Collection.extend({

  });

  return {
    SensorWidget: SensorWidget,
    Widgets: Widgets
  };

}());