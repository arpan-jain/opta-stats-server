'use strict';

var app = require('../server/server');

module.exports = (function () {
  const _DEFAULT_TTL = 6; // seconds
  const _F1_RACE_DETAILS_ = 10; // seconds
  const _F1_GRID_ = 100; // seconds
  const _F1_STANDINGS_ = 3; // seconds
  const _F1_WEATHER_ = 10; // seconds
  const _F1_FASTEST_LAP_ = 10; // seconds
  const _F1_PITSTOPS_ = 6; // seconds
  const _LIVE_ = 60; // seconds


  var getTTL = function(type){
    switch (type.toLowerCase()){
      case 'f1racedetails':
            return _F1_RACE_DETAILS_;
      case 'f1raceweather':
        return _F1_WEATHER_;
      case 'f1racestandings':
        return _F1_STANDINGS_;
      case 'f1racegrid':
        return _F1_GRID_;
      case 'f1fastestlap':
        return _F1_FASTEST_LAP_;
      case 'f1pitstops':
        return _F1_PITSTOPS_;
      case 'live':
            return _LIVE_;
      default:
            return _DEFAULT_TTL;
    }
  };

  var cacheValue = function(type,matchId,value,callback){
    var key,ttl,error;
    if (!callback) {
      if (typeof ttl === 'function') {
        // if user is not provided and the 2nd argument is a function, it's a callback
        callback = ttl;
        ttl = _DEFAULT_TTL;
      } else {
        error = new Error('callback function not defined');
        error.statusCode = 400;
        return callback(error);
      }
    }

    if (!(callback instanceof Function)) {
      error = new Error('callback function not defined');
      error.statusCode = 400;
      return callback(error);
    }
    try{
      key = type.toLowerCase()+":"+matchId;
      value = JSON.stringify(value);
      ttl = getTTL(type);
    }
    catch (ex){
      return callback(ex);
    }
    return app.redisCache.setex(key,ttl,value,function(redisErr,redisString){
      if(redisErr){
        return callback(redisErr);
      }
      return callback(null, redisString);
    })
  };

  var getCachedValue = function(type, matchId, callback){
    var key, error;
    if (!callback) {
      error = new Error('callback function not defined');
      error.statusCode = 400;
      return error;
    }

    if (!(callback instanceof Function)) {
      error = new Error('callback function not defined');
      error.statusCode = 400;
      return error;
    }
    try{
      key = type.toLowerCase()+":"+matchId;
    }
    catch(ex){
      return callback(ex);
    }
    return app.redisCache.get(key,function(redisErr, redisValue){
      if(redisErr){
        return callback(redisErr);
      }
      try{
        redisValue = JSON.parse(redisValue);
      }
      catch(ex){
        return callback(ex);
      }
      return callback(null, redisValue);
    });
  };

  var deleteKeys = function (keys, callback) {
    var error;

    if (keys.constructor !== Array) {
      error = new Error('keys should be an array');
      error.statusCode = 400;
      return callback(error);
    }

    console.log('deleting keys');
    console.log(keys);
    app.redisCache.del(keys, function (deleteKeysErr, deletedCount) {
      if (deleteKeysErr) {
        return callback(deleteKeysErr);
      }
      return callback(null, true);
    });
  };

  return {
    cacheValue:cacheValue,
    getCachedValue:getCachedValue,
    deleteKeys: deleteKeys
  }
}());
