// in client/app/entry.js

// Make 'ss' available to all modules and the browser console
window.ss = require('socketstream');

ss.server.on('disconnect', function () {
  $('#warning').modal('show');
});

ss.server.on('reconnect', function () {
  $('#warning').modal('hide');
});

ss.server.on('ready', function () {

  // Wait for the DOM to finish loading
  jQuery(function () {

    // client modules -- order matters here
    require('datatables-bootstrap');
    require('/login');
    require('/router');

    $("#tabs").tab();
  });

});
