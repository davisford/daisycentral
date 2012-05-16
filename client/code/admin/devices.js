// in client/code/admin/devices.js

var Devices = function() {

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
      { "mDataProp": "owners" }
    ]
  });

  // refresh data from server
  var _refresh = function() {
    ss.rpc('devices.get', function(err, daisies) {
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
          ss.rpc('devices.save', obj, function(ok) {
            if (ok === false) { 
              alert("update failed"); 
              _refresh();
            }
          });
          return (val);
        }, {type: 'textarea', submit: 'OK' })
      }
    })
  }

  return {
     refresh: _refresh
  }

}();
module.exports = Devices;

