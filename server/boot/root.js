'use strict';

var blocked = require('blocked');

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);

  blocked(function (ms) {
    console.log('BLOCKED FOR %sms', ms | 0);
  });
};
