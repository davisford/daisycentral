// in client/code/admin/entry.js

window.ss = require('socketstream');

ss.server.on('disconnect', function () {
  console.log('Connection down :-(');
  $('#warning').modal('show');
});

ss.server.on('reconnect', function () {
  console.log('Connection back up :-)');
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