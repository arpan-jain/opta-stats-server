'use strict';

var redis = require('redis');

module.exports = function (app) {
  var host = app.settings.redis.host;
  var port = app.settings.redis.port;
  console.log('connecting redis to: ', host, ':', port);
  var redisCache = redis.createClient({
    host: host,
    port: port,
    retry_strategy: function (options) {
      console.log('retry options:', options);
      if (options.error && options.error.code === 'ECONNREFUSED') {
        // End reconnecting on a specific error and flush all commands with a individual error
        console.log('con refused received')
        return new Error('The server refused the connection');
      }

      if (options.error && options.error.code === 'ETIMEDOUT') {
        // End reconnecting on a specific error and flush all commands with a individual error
        console.log('timeout received');
        return new Error('Connection is timing out from redis');
      }

      if (options.total_retry_time > 1000 * 5 * 60) {
        // End reconnecting after a specific timeout and flush all commands with a individual error
        return new Error('Retry time exhausted');
      }
      if (options.times_connected > 3) {
        // End reconnecting with built in error
        console.log('tried connecting 2 times. Couldn\'t connect');
        // process.exit(0);
      }
      // reconnect after
      return Math.min(options.attempt * 100, 3000);
    }
  });

  app.redisCache = redisCache;

  redisCache.on('connect', function () {
  });

  redisCache.on('ready', function () {
    console.log('redis is ready to accept connections');
    app.emit('redisReady');
  });

  redisCache.on('error', function (err) {
    console.log('redis error received');
    console.log(err);
    console.log(process.exit(0));
  });

  redisCache.on('reconnecting', function (err) {
    console.log('reconnecting');
  });
};
