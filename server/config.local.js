/**
 * Created by @rpan on 05/04/17.
 */

'use strict';

var util = require('util');
var configObject = require('config');

module.exports = {
  remoting: {
    errorHandler: {
      handler: function (err, req, res, next) {

        try {
          if (err.statusCode && !err.developerMessage) {
            switch (err.statusCode) {
              case 500 : {
                err.developerMessage = 'Internal server error';
                break;
              }
              case 400 : {
                err.developerMessage = 'Bad Request';
                break;
              }
              case 401 : {
                err.developerMessage = 'Unauthorized';
                break;
              }
              case 403 : {
                err.developerMessage = 'Forbidden';
                break;
              }
              case 404 : {
                err.developerMessage = 'Entity not found';
                break;
              }
              case 422 : {
                try {
                  if (err.details && err.details.messages && typeof err.details.messages === 'object') {
                    err.userMessage = Object.keys(err.details.messages)[0] + ' ' + err.details.messages[Object.keys(err.details.messages)[0]][0];
                  }
                } catch (ex) {
                  console.log(ex);
                }
                err.developerMessage = 'UnProcessable entity';
                break;
              }
              default : {
                err.developerMessage = err.message || 'Unknown Error Occurred';
              }
            }
          }
          if (!err.userMessage && err.message) {
            err.userMessage = err.message;
          }

          var authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization))
            ? (req.headers.authorization) ? 'authorization' : 'Authorization'
            : null;  // if headers exists, get the authorization header key
        } catch (ex) {
          return next(err);
        }

        req.log.error(JSON.stringify({
          URL: req.url,
          method: req.method,
          body: req.body,
          query: req.query,
          params: req.params,
          authToken: (authHeader) ? req.headers[authHeader] : null,
          statusCode: res.statusCode,
          err: err
        }));

        next(err);
      }
    }
  },
  redis: configObject.redis
};
