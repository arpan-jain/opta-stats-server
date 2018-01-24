/**
 * Created by @rpan on 05/04/17.
 */

'use strict';

var util = require('util');

module.exports = function () {
  return function (req, res, next) {
    console.log('request logging middleware called');
    // log all details of the request

    res.on('finish', function () {
      if (process.env.NODE_ENV !== 'prod') {
        console.log('/***************************');
        console.log('logging request info in info middleware');
        console.log('Accessed URL: ' + req.originalUrl);
        console.log('Method: ' + req.method);
        console.log('Request query: ' + util.inspect(req.query, false, null));
        console.log('Request body: ' + util.inspect(req.body, false, null));
        console.log('Request headers: ' + util.inspect(req.headers, false, null));
        console.log('sent statusCode: ' + res.statusCode);
        console.log('******************************/');
      }
//       if (res.statusCode && parseInt(res.statusCode) < 300) {
//         var authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization))
//           ? (req.headers.authorization) ? 'authorization' : 'Authorization'
//           : null;  // if headers exists, get the authorization header key
//         req.log.info(JSON.stringify({
//           URL: req.originalUrl,
//           method: req.method,
//           query: req.query,
//           params: req.params,
//           body: req.body,
//           authToken: (authHeader) ? req.headers[authHeader] : null,
//           statusCode: res.statusCode,
//           header: req.headers
//         }));
//       }
    });
    next();
  };
};
