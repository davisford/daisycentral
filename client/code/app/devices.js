// in client/code/app/devices.js

var Devices = function() {

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
  var table = $('#daisiesTable').dataTable( {
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
      { "mDataProp": "lastMod" },
      { "mDataProp": "owners", "bVisible": false }
    ]
  });

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
  			}, {type: 'textarea', submit: 'OK' })
  		}
  	});
  }

  return {
  	refresh: _refresh
  }
  
}();
module.exports = Devices;