

SensorWidget = Backbone.Model.extend({
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

console.log(this);
console.log(module);


exports.Widgets = Widgets;
exports.SensorWidget = SensorWidget;