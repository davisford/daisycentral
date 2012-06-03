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

 DC.c.Daisies = Backbone.Collection.extend({
  model: DC.m.Daisy
 });

 DC.v.ConsoleView = Backbone.View.extend({
  el: $('#console-form')
 });

 $('#send-button').click(function (e) {
  e.preventDefault();
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
    }
 });

  ss.event.on('admin:daisy:status', function (daisy, channelName) {
    // todo find table row, and update status
    console.log('daisy status => ',daisy);
  });

  // initialize daisies DataTable
  var table = $('#daisiesTable').dataTable( {
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

  // select a table row
  $('#daisiesTable tbody tr').live('click', function (e) {
    if ($(this).hasClass('row_selected')) {
      $(this).removeClass('row_selected');
    } else {
      table.$('tr.row_selected').removeClass('row_selected');
      $(this).addClass('row_selected');
    }


  });

  var printStack = function() {
    try { i.dont.exist += 0; }
    catch(e) {
      console.log(e.stack);
    }
  }

  // refresh data from server
  var _refresh = function() {
    ss.rpc('admin.devices.get', function(err, daisies) {
      printStack();
      if (err) alert(err);
      else {
        table.fnClearTable();
        table.fnAddData(daisies);
        // add jEditable to table data
        // only columns with .canEdit class can be edited
        $('.canEdit', table.fnGetNodes()).editable(function (val, settings) {
          // get the object for this row
          var obj = table.fnGetData(table.fnGetPosition(this)[0]);
          // we know it is the key property
          obj.key = val;
          console.log(obj);
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
          submit: 'OK' })
      }
    })
  }

  return {
     refresh: _refresh
  }

}();
module.exports = Devices;

