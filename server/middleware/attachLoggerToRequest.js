/**
 * Created by @rpan on 05/04/17.
 */

'use strict';

var uuid = require('uuid');

module.exports = function () {
  console.log('logger attaching middleware was found');
  return function (req, res, next) {
    // attach a child logger to the request
    req.log = req.app.log.child({reqId: uuid()});
    console.log('attaching log to the request to : ', req.originalUrl);
    next();
  };
};
