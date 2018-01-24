'use strict';

var cricketMatchDao = require('../dao/cricket-match-dao');
var async = require('async');
var redisCache = require('../redisCache');
var modelUtils = require('../modelUtils');
var app = require('../../server/server');

module.exports = function(CricketMatch) {

  CricketMatch.summary = function(matchIdString, callback) {
    if (!matchIdString) {
      var error = new Error('matchIdString is a required parameter');
      error.statusCode = 404;
      return callback(error);
    } else {
      var totalSummary = [],
        matchIds = [],
        matchesSummary = [];

      matchIds = matchIdString.split(',');
      //console.log(matchIds);

      try {
        matchIds.forEach(function(matchId) {
          
          matchesSummary.push(function(outerCallback) {

            // return outerCallback(null, null);
            return redisCache.getCachedValue('summary', matchId, function(redisErr, redisValue) {
              if (redisErr) {
                return outerCallback(redisErr);
              }
              else if (redisValue) {
                totalSummary.push(redisValue);
                return outerCallback(null, null);
              }
              else {
                var asyncTasks = [],
                  summaryObject = {};

                try {
                  // get matchDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getMatchDetails(matchId, function(err, matchDetails) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      summaryObject.currentMatch = matchDetails;
                      return asyncCallback(null);
                    });
                  });

                  // get sessionDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getLatestSession(matchId, function(err, session) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      //console.log('\n\n', session);
                      //console.log('\n\nasyncCallback', asyncCallback);
                      summaryObject.currentSession = session;
                      return asyncCallback(null);
                    });
                  });

                  // get last 6 deliveries
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getLastSixBalls(matchId, function(err, deliveries) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      //console.log('\n\n', session);
                      //console.log('\n\nasyncCallback', asyncCallback);
                      summaryObject.lastDeliveries = deliveries;
                      return asyncCallback(null);
                    });
                  });

                  //get inningDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getInnings(matchId, function(err, innings) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      summaryObject.innings = innings;
                      return asyncCallback(null, innings[innings.length - 1]);
                    });
                  });

                  //get batting scorecard
                  asyncTasks.push(function(inning, asyncCallback) {
                    if (!inning) {
                      return asyncCallback(null, null);
                    }
                    return cricketMatchDao.getOnCreaseBatsmen(inning.id, function(err, currentBatsmen) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      summaryObject.currentBatsmen = currentBatsmen;
                      return asyncCallback(null, inning);
                    });
                  });

                  //get bowling scorecard
                  asyncTasks.push(function(inning, asyncCallback) {
                    if (!inning) {
                      return asyncCallback(null, null);
                    }
                    return cricketMatchDao.getOnStrikeBowler(inning.id, function(err, currentBowler) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      summaryObject.currentBowler = currentBowler;
                      return asyncCallback(null, inning);
                    });
                  });
                } catch (ex) {
                  return outerCallback(ex);
                }

                return async.waterfall(asyncTasks, function(err, result) {
                  if (err) {
                    return outerCallback(err);
                  }
                  totalSummary.push(summaryObject);
                  return redisCache.cacheValue('summary', matchId, summaryObject, function(cachingErr, cachingResult) {
                    if (cachingErr) {
                      return outerCallback(cachingErr);
                    }
                    return outerCallback(null, summaryObject);
                  });
                });
              }
            });
          });
        });
      } catch (ex) {
        return callback(ex);
      }

      return async.parallel(matchesSummary, function(err, result) {
        if (err) {
          return callback(err);
        }
        return callback(null, totalSummary);
      });
    }
  };

  CricketMatch.scorecard = function(matchIdString, callback) {
    if (!matchIdString) {
      var error = new Error('matchIdString is a required parameter');
      error.statusCode = 404;
      return callback(error);
    } else {
      var totalScorecard = [],
        matchIds = [],
        matchesScorecard = [];

      matchIds = matchIdString.split(',');


      try {
        matchIds.forEach(function(matchId) {
          matchesScorecard.push(function(outerCallback) {

            return redisCache.getCachedValue('scorecard', matchId, function(redisErr, redisValue) {
              if (redisErr) {
                return outerCallback(redisErr);
              } else if (redisValue) {
                totalScorecard.push(redisValue);
                return outerCallback(null, null);
              } else {
                var asyncTasks = [],
                  scorecardObject = {};

                try {
                  // get matchDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getMatchDetails(matchId, function(err, matchDetails) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      scorecardObject.currentMatch = matchDetails;
                      return asyncCallback(null);
                    });
                  });

                  // get sessionDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getLatestSession(matchId, function(err, session) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      //console.log('\n\n', session);
                      //console.log('\n\nasyncCallback', asyncCallback);
                      scorecardObject.currentSession = session;
                      return asyncCallback(null);
                    });
                  });

                  //get inningDetails
                  asyncTasks.push(function(asyncCallback) {
                    return cricketMatchDao.getInnings(matchId, function(err, innings) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      scorecardObject.innings = innings;

                      //attaching scorecards to all of the inning objects
                      innings.forEach(function(inning) {
                        //get batting scorecard
                        asyncTasks.push(function(asyncCallback) {
                          if (!inning) {
                            return asyncCallback(null);
                          }
                          return cricketMatchDao.getBattingScorecard(inning.id, function(err, batsmen) {
                            if (err) {
                              return asyncCallback(err);
                            }
                            inning.batsmen = batsmen;
                            return asyncCallback(null);
                          });
                        });

                        //get bowling scorecard
                        asyncTasks.push(function(asyncCallback) {
                          if (!inning) {
                            return asyncCallback(null);
                          }
                          return cricketMatchDao.getBowlingScorecard(inning.id, function(err, bowlers) {
                            if (err) {
                              return asyncCallback(err);
                            }
                            inning.bowlers = bowlers;
                            return asyncCallback(null);
                          });
                        });


                        //get fall of wickets
                        asyncTasks.push(function(asyncCallback) {
                          if (!inning) {
                            return asyncCallback(null);
                          }
                          return cricketMatchDao.getFallOfWickets(inning.id, function(err, fallOfWickets) {
                            if (err) {
                              return asyncCallback(err);
                            }
                            inning.fallOfWickets = fallOfWickets;
                            return asyncCallback(null);
                          });
                        });

                        //get extras
                        asyncTasks.push(function(asyncCallback) {
                          if (!inning) {
                            return asyncCallback(null);
                          }
                          return cricketMatchDao.getInningExtras(inning.id, function(err, extras) {
                            if (err) {
                              return asyncCallback(err);
                            }
                            inning.extras = extras;
                            return asyncCallback(null);
                          });
                        });

                        //get partnerships
                        asyncTasks.push(function(asyncCallback) {
                          if (!inning) {
                            return asyncCallback(null);
                          }
                          return cricketMatchDao.getPartnerships(inning.id, function(err, partnerships) {
                            if (err) {
                              return asyncCallback(err);
                            }
                            inning.partnerships = partnerships;
                            return asyncCallback(null);
                          });
                        });
                      });
                      return asyncCallback(null, innings[innings.length - 1]);
                    });
                  });

                  //get Current Over deliveries
                  asyncTasks.push(function(inning, asyncCallback) {
                    if (!inning || !inning.order || !inning.totalOvers) {
                      return asyncCallback(null);
                    }
                    return cricketMatchDao.getCurrentOverDetails(matchId, inning.order, inning.totalOvers, function(err, deliveries) {
                      if (err) {
                        return asyncCallback(err);
                      }
                      scorecardObject.currentOver = deliveries;
                      return asyncCallback(null);
                    });
                  });
                } catch (ex) {
                  return outerCallback(ex);
                }

                return async.waterfall(asyncTasks, function(err, result) {
                  if (err) {
                    return outerCallback(err);
                  }
                  totalScorecard.push(scorecardObject);
                  return redisCache.cacheValue('scorecard', matchId, scorecardObject, function(cachingErr, cachingResult) {
                    if (cachingErr) {
                      return outerCallback(cachingErr);
                    }
                    return outerCallback(null, cachingResult);
                  });
                });
              }
            });
          });
        });
      } catch (ex) {
        return callback(ex);
      }

      return async.parallel(matchesScorecard, function(err, result) {
        if (err) {
          return callback(err);
        }
        return callback(null, totalScorecard);
      });
    }
  };

  CricketMatch.fixtures = function(toDate, teamsAnnounced, callback) {
    return cricketMatchDao.getFixtures(toDate, teamsAnnounced, function(err, fixtures) {
      if (err) {
        return callback(err);
      }
      return callback(null, fixtures);
    });
  };

  CricketMatch.overDetails = function(matchId, inningOrder, currentOver, callback) {

    // get over by over details of last 10 overs
    return cricketMatchDao.getLastOvers(matchId, inningOrder, currentOver, 10, function(err, overDetails) {
      if (err) {
        return callback(err);
      }
      return callback(null, overDetails);
    });
  };

  CricketMatch.tagCommentary = function(options, callback) {
    try {
      var error, matchId, sendBirdChannelUrl, commentaryType;
      if (!options.matchId || !options.sendBirdChannelUrl) {
        error = new Error('matchId and sendBirdChannelUrl are required parameters');
        error.statusCode = 400;
        return callback(error);
      }
      matchId = options.matchId;
      sendBirdChannelUrl = options.sendBirdChannelUrl;
      commentaryType = options.commentaryType || 'ALL';

      if (commentaryType !== 'ALL' && commentaryType !== 'EVENTS' && commentaryType !== 'WICKETS' && commentaryType !== 'BOUNDARIES') {
        error = new Error('Unknown Commentary Type');
        error.statusCode = 400;
        return callback(error);
      }
    } catch (ex) {
      console.log('An exception occurred', ex);
      return callback(ex);
    }
    var sql = 'update cricket_match set sendbird_channel_url=?, commentary_type=? where id=?';
    var params = [sendBirdChannelUrl, commentaryType, matchId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, result) {
      if (err) {
        console.log('err', err);
        return callback(err);
      }
      return callback(null, 1);
    });
  };

  CricketMatch.liveMatches = function(fromDate, toDate, callback) {
    if (!fromDate && !toDate) {
      var error = new Error('fromDate and toDate are required arguments');
      error.statusCode = 400;
      return callback(error);
    }
    return cricketMatchDao.getLiveTodayMatches(fromDate, toDate, function(err, result) {
      if (err) {
        return callback(err);
      }
      if (result && result.length) {
        var matchIdString = '';
        result.forEach(function(element) {
          if (element.id) {
            matchIdString = matchIdString + element.id + ',';
          }
        });
        matchIdString = matchIdString.slice(0, -1);

        return app.models.CricketMatch.summary(matchIdString, function(summaryErr, summary) {
          if (summaryErr) {
            return callback(summaryErr);
          }
          return callback(null, summary);
        });
      } else {
        return callback(null, null);
      }
    });
  };

  CricketMatch.commentary = function(matchId, messageId, pageType, callback) {
    if (!matchId) {
      var error = new Error('matchId is a required parameter');
      error.statusCode = 400;
      return callback(error);
    }
    if (messageId && pageType) {
      return cricketMatchDao.getCommentary(matchId, messageId, pageType, function(err, commentary) {
        if (err) {
          return callback(err);
        }
        return callback(null,commentary);
      });
    }
    else {
      return cricketMatchDao.getLiveCommentary(matchId, function(err, commentary) {
        if (err) {
          return callback(err);
        }
        return callback(null, commentary);
      });
    }
  };

  CricketMatch.remoteMethod('summary', {
    accepts: [{
      arg: 'matchIds',
      type: 'string',
      description: ['comma separated string of matchIds'],
      required: false,
      http: {
        source: 'query'
      }
    }],
    returns: {root: true, type: 'object'},
    description: ['get scorecard summary of a cricket match'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/summary'
    }
  });

  CricketMatch.remoteMethod('scorecard', {
    accepts: [{
      arg: 'matchIds',
      type: 'string',
      description: ['comma separated string of matchIds'],
      required: false,
      http: {
        source: 'query'
      }
    }],
    returns: {root: true, type: 'object'},
    description: ['get detailed scorecard of cricket matches'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/scorecard'
    }
  });

  CricketMatch.remoteMethod('fixtures', {
    accepts: [{
      arg: 'toDate',
      type: 'string',
      description: ['date till which fixtures are required'],
      required: false,
      http: {
        source: 'query'
      }
    },
      {
        arg: 'teamsAnnounced',
        type: 'boolean',
        description: ['fixtures for unannounced teams'],
        required: false,
        http: {
          source: 'query'
        }
      }],
    returns: {root: true, type: 'object'},
    description: ['get fixtures of all upcoming matches'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/fixtures'
    }
  });

  CricketMatch.remoteMethod('overDetails', {
    accepts: [{
      arg: 'matchId',
      type: 'number',
      description: ['matchId of the current Match'],
      required: true,
      http: {
        source: 'query'
      }
    }, {
      arg: 'inningOrder',
      type: 'number',
      description: ['order of the inning eg. 2 of second inning of the match'],
      required: true,
      http: {
        source: 'query'
      }
    }, {
      arg: 'currentOver',
      type: 'number',
      description: ['current over number'],
      required: true,
      http: {
        source: 'query'
      }
    }],
    returns: {root: true, type: 'object'},
    description: ['get over by over details for the last 10 overs from the current over'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/overDetails'
    }
  });

  CricketMatch.remoteMethod('tagCommentary', {
    accepts: [{
      arg: 'options',
      type: 'object',
      description: ['matchId, sendBirdChanelUrl, commentaryType'],
      required: true,
      http: {
        source: 'body'
      }
    }],
    returns: {root: true, type: 'object'},
    description: ['tag commentary for a particular match'],
    http: {
      verb: 'POST',
      status: 200,
      errorStatus: 500,
      path: '/tagCommentary'
    }
  });

  CricketMatch.remoteMethod('liveMatches', {
    accepts: [
      {
        arg: 'fromDate',
        type: 'string',
        description: ['date from which matches are required'],
        required: true,
        http: {
          source: 'query'
        }
      },
      {
        arg: 'toDate',
        type: 'string',
        description: ['date till which matches are required'],
        required: true,
        http: {
          source: 'query'
        }
      }],
    returns: {root: true, type: 'object'},
    description: ['get cards of all live matches or matches in the give time range'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/live'
    }
  });

  CricketMatch.remoteMethod('commentary', {
    accepts: [
      {
        arg: 'matchId',
        type: 'number',
        description: ['matchId'],
        required: true,
        http: {
          source: 'query'
        }
      },
      {
        arg: 'messageId',
        type: 'number',
        description: ['commentary message id'],
        required: false,
        http: {
          source: 'query'
        }
      }, {
        arg: 'pageType',
        type: 'string',
        description: ['pagination type'],
        required: false,
        http: {
          source: 'query'
        }
      }],
    returns: {root: true, type: 'object'},
    description: ['get live commentary of match'],
    http: {
      verb: 'GET',
      status: 200,
      errorStatus: 500,
      path: '/commentary'
    }
  });
};
