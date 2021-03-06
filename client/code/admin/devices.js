// in client/code/admin/devices.js

var models = require('./models'),
  Daisy = models.Daisy,
  Daisies = models.Daisies;

var Devices = (function () {

  /***********************************************************
   * View: TableView
   ***********************************************************/
  var TableView = Backbone.View.extend({
    el: $('#daisies'),

    events: {
      'click #daisiesTable tbody tr': 'selectRow'
    },

    initialize: function (options) {
      _.bindAll(this, 'render', 'selectRow');
      this.bus = options.bus;

      // create dataTable once
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
          { "mDataProp": "key", "sClass": "canEdit", "sDefaultContent": "" },
          { "mDataProp": "lastMod" },
          { "mDataProp": "online", "sDefaultContent": "false"},
          { "mDataProp": "owners" }
        ]
      });
    },

    render: function () {
      var table = this.table;
      table.fnClearTable();
      table.fnAddData(this.collection.toJSON());

      // add jEditable to table data; only .canEdit class are editable
      $('.canEdit', table.fnGetNodes()).editable(function (val, settings) {
        // get the object for this row
        var obj = table.fnGetData(table.fnGetPosition(this)[0]);
        // we know it is the key property; FIXME: this.collection.models is out of sync
        obj.key = val;
        ss.rpc('admin.devices.update', obj, function (ok) {
          if (ok === false) {
            alert("update failed");
            this._refresh();
          }
        });
        return (val);
      }, {
        type: 'textarea',
        event: 'dblclick',
        tooltip: 'Doubleclick to edit...',
        submit: 'OK'
      }); // end .editable
    },

    selectRow: function (e) {
      var row = $(e.currentTarget);
      // toggle selected style on row
      if (row.hasClass('row_selected')) {
        row.removeClass('row_selected');
      } else {
        this.table.$('tr.row_selected').removeClass('row_selected');
        row.addClass('row_selected');
      }
      // broadcast event about the daisy that is selected
      this.bus.trigger('daisySelected', this.table._('.row_selected')[0]);
    }
  });

  /***********************************************************
   * View: ConsoleView
   ***********************************************************/
  var ConsoleView = Backbone.View.extend({
    el: $('#console-form'),

    events: {
      'keydown #command': 'keydown'
    },

    render: function (e) {

    },

    initialize: function (options) {
      this.bus = options.bus;
      _.bindAll(this, 'keydown', 'render', 'daisySelected');
      this.bus.bind('daisySelected', this.daisySelected);
    },

    keydown: function (e) {
      // Enter was pressed?
      if (e.originalEvent.keyCode == 13) {
        // please don't submit the form, sir...
        e.preventDefault();
        var me = this,
          cmd = this.$('#command').val();
        // send the command to the device
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

    daisySelected: function (daisy) {
      if (daisy && daisy.online) {
        this.model = daisy;
        // enable the console
        this.$('input,textarea').removeClass('.disabled').attr('disabled', false);
      } else {
        // disable the console
        this.$('input,textarea').addClass('.disabled').attr('disabled', true).html('');
        this.model = undefined;
      }
    }

  });

  // TODO: this is not tied in yet
  ss.event.on('admin:daisy:status', function (daisy, channelName) {
    // todo find table row, and update status
    console.log('daisy status => ', daisy);
  });

  var bus = _.extend({}, Backbone.Events),
    daisies = new Daisies({url: 'admin.devices.get'}),
    tableView = new TableView({collection: daisies, bus: bus}),
    consoleView = new ConsoleView({bus: bus}).render();

  // refresh data from server
  var _refresh = function () {
    // fetch the latest daisies
    daisies.fetch({success: tableView.render});
  };

  // public module API
  return {
    refresh: _refresh
  };

}());
module.exports = Devices;

