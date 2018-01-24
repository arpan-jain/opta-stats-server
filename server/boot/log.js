/**
 * Created by @rpan on 5/4/2017.
 */

'use strict';

var bunyan = require('bunyan');
var fs = require('fs');
var path = require('path');
var CoralogixBunyan = require('coralogix-bunyan');
var hostname = require('os').hostname();

function checkForFile(fileName) {
  fs.exists(fileName, function (exists) {
    if (!exists) {
      fs.writeFile(fileName, {flag: 'wx'}, function (err, data) {
        return 1;
      });
    }
  });
}


var environmentVariables = process.env;

if (!environmentVariables.NODE_ENV) {
  console.log('environment variables not found');
  process.exit(0);
}


module.exports = function (app) {
  var name = 'opta-stats-server-' + environmentVariables.NODE_ENV;
  checkForFile('../opta-stats-server-info.log');
  checkForFile('../opta-stats-server-error.log');
  checkForFile('../opta-stats-server-fatal.log');

  app.log = bunyan.createLogger({
    name: name,
    streams: [{
      stream: new CoralogixBunyan({
        privateKey: 'bbeadc9c-a6ba-bc9d-2754-11fcad1a821e',
        applicationName: name,
        subsystemName: 'stats-server',
        computerName: hostname
      }),
      type: 'raw'
    }, {
      level: 'fatal',
      path: '../opta-stats-server-fatal.log',
      type: 'rotating-file',
      period: '1w',
      count: 3
    }, {
      level: 'info',
      path: '../opta-stats-server-info.log',
      type: 'rotating-file',
      period: '1d',
      count: 2
    }, {
      level: 'error',
      path: '../opta-stats-server-error.log',
      type: 'rotating-file',
      period: '1d',
      count: 4
    }
    ],
    serializers: {
      req: bunyan.stdSerializers.req,
      res: bunyan.stdSerializers.res,
      err: bunyan.stdSerializers.err
    }
  });
};
