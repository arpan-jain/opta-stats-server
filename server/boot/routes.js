/** Created by arpan on 06/04/2017 */

'use strict';

var modelUtils = require('../../common/modelUtils');
module.exports = function (app) {
  app.get('/healthCheck', function (req, res, next) {
    var sql;
    try {
      sql = 'select 1';
    } catch (ex) {
      return res.status(500).send(ex).end();
    }

    modelUtils.nativeSQL({sql: sql}, function (err, result) {
      if (err) {
        return res.status(500).send(err).end();
      }
      return res.status(200).send(result).end();
    });
  });
}
