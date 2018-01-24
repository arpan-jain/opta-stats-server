'use strict';

var config = require('config');

module.exports = {
  db: {
    "name": "db",
    "connector": "memory"
  },
  stats: {
    "host": config.mysql.host,
    "port": config.mysql.port,
    "database": config.mysql.database,
    "username": config.mysql.user,
    "password": config.mysql.password,
    "name": "stats",
    "connector": "mysql",
    "dateStrings": true,
    "connectTimeout": 200000,
    "acquireTimeout": 200000
  }
};
