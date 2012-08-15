// in client/code/admin/entry.js

window.ss = require('socketstream');

ss.server.on('disconnect', function () {
  $('#warning').modal('show');
});

ss.server.on('reconnect', function () {
  $('#warning').modal('hide');
});

ss.server.on('ready', function () {

  jQuery(function () {

    // load client modules; order matters here
    require('datatables-bootstrap');
    require('/router');

    // decorate bootstrap tabs
    $('#tabs').tab();
  });

});