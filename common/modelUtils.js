'use strict';

var app = require('../server/server');

module.exports = {
  nativeSQL: function (options, sqlcallback) {
    var sql, params, dbName;
    try {
      sql = options.sql;
      params = options.params || false;
      dbName = options.db || 'stats';
    } catch (err) {
      return sqlcallback(err);
    }
    if (!params) {
      app.datasources[dbName].connector.query(sql, function (err, result) {
        if (err) {
          return sqlcallback(err);
        }

        return sqlcallback(null, result);
      });
    } else {
      app.datasources[dbName].connector.query(sql, params, function (err, result) {
        if (err) {
          return sqlcallback(err);
        }

        return sqlcallback(null, result);
      });
    }
  }
};
