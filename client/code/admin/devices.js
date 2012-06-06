// in client/code/admin/devices.js

var Devices = function() {

 // Backbone namespace DC is global object
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

 DC.m.SelectedDaisy = Backbone.Model.extend({
  commandStack: []
 });

 DC.c.Daisies = Backbone.Collection.extend({
  model: DC.m.Daisy,

  "fetch": function(options) {
    var collection = this;
    var success = options.success;
    options.success = function(resp, status, xhr) {
      collection.reset(resp, options);
      if (success) success(collection, resp);
    };
    options.error = Backbone.wrapError(options.error, collection, options);
    ss.rpc('admin.devices.get', function(err, arr) {
      if (err) { return options.error(err); }
      return options.success(arr);
    })
    return;
  }
 });

 /* ________________________________________________________
  * View: TableView
  * ________________________________________________________*/
 DC.v.TableView = Backbone.View.extend({
  el: $('#daisies'),

  events: {
    'click #daisiesTable tbody tr': 'selectRow'
  },

  render: function() {
    var table = this.table;

    table.fnClearTable();
    table.fnAddData(this.collection.toJSON());

    // add jEditable to table data; only .canEdit class are editable
    $('.canEdit', table.fnGetNodes()).editable(function (val, settings) {
      // get the object for this row
      var obj = table.fnGetData(table.fnGetPosition(this)[0]);
      // we know it is the key property; FIXME: this.collection.models is out of sync
      obj.key = val;
      ss.rpc('admin.devices.update', obj, function(ok) {
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
      submit: 'OK' }
    );
  },

  initialize: function(options) {
    _.bindAll(this, 'render', 'selectRow');
    this.bus = options.bus;

    this.table = $('#daisiesTable').dataTable({
      "bPaginate": true,
      "bLengthChange": true,
      "bFilter": true,
      "bSort": true,
      "bInfo": true,
      "bAutoWidth": true,
      "bProcessing": true,
      "sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
      "sPaginationType": "bootstrap",
      "oLanguage": {
        "sLengthMenu": "_MENU_ records per page"
      },
      "aoColumns": [
        { "mDataProp": "_id" },
        { "mDataProp": "did" },
        { "mDataProp": "mac" },
        { "mDataProp": "key", "sClass": "canEdit" },
        { "mDataProp": "lastMod" },
        { "mDataProp": "online" },
        { "mDataProp": "owners" }
      ]
    });
  },

  selectRow: function(e) {
    var row = $(e.currentTarget);
    if (row.hasClass('row_selected')) {
      row.removeClass('row_selected');
    } else {
      this.table.$('tr.row_selected').removeClass('row_selected');
      row.addClass('row_selected');
    }
    // broadcast event about the daisy that is selected
    this.bus.trigger('daisySelected', this.table._('.row_selected')[0]);
  }
 })

 /* ________________________________________________________
  * View: ConsoleView
  * ________________________________________________________*/
 DC.v.ConsoleView = Backbone.View.extend({
  el: $('#console-form'),

  events: {
    'keydown #command': 'keydown'
  },

  render: function(e) {
    
  },

  initialize: function(options) {
    this.bus = options.bus;
    _.bindAll(this, 'keydown', 'render', 'daisySelected');
    this.bus.bind('daisySelected', this.daisySelected);
  },

  keydown: function(e) {    
    // Enter was pressed?
    if (e.originalEvent.keyCode == 13) {
      // please don't submit the form, sir...
      e.preventDefault();
      var me = this,
          cmd = this.$('#command').val();
      ss.rpc('admin.devices.sendCommand', this.model.mac, cmd, function (err, res) {
        // append response to the console textarea
        var console = me.$('#response');
        if (err) {
          console.append(err.toString());
        } else {
          console.append(res);
        }
        // scroll down
        console.scrollTop(console[0].scrollHeight - console.height());
        // clear cmd input 
        me.$('#command').val('').focus();
      });
    }
  },

  daisySelected: function(daisy) {
    if (daisy && daisy.online) {
      this.model = daisy;
      this.$('input,textarea').removeClass('.disabled').attr('disabled', false);
    } else {
      this.$('input,textarea').addClass('.disabled').attr('disabled', true).html('');
      this.model = undefined;
    }
  }

 });

 $('#send-button').click(function (e) {
 /* e.preventDefault();
    // find the td with the mac address
    var selected = table.$('.row_selected');
    if (!selected) { return; }

    var td = $(selected).find('td:nth-child(3)')[0];
    if(td) {
      // get the mac address text
      var mac = $(td).text();
      var cmd = $('#command-input').val();
      ss.rpc('admin.devices.sendCommand', mac, cmd, function (err, res) {
        console.log('sendCommand rpc callback: err, res =>', err, res);
        $('#command-response').val(res);
      });
    } */
 });

  ss.event.on('admin:daisy:status', function (daisy, channelName) {
    // todo find table row, and update status
    console.log('daisy status => ',daisy);
  });

  var printStack = function() {
    try { i.dont.exist += 0; }
    catch(e) {
      console.log(e.stack);
    }
  }

  // refresh data from server
  var _refresh = function() {
    var p = daisies.fetch({success: tableView.render});
  }

  var bus = _.extend({}, Backbone.Events);
  var daisies = new DC.c.Daisies();
  var tableView = new DC.v.TableView({collection: daisies, bus: bus});
  var consoleView = new DC.v.ConsoleView({bus: bus}).render();

  return {
     refresh: _refresh
  }

}();
module.exports = Devices;

