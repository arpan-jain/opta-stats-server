'use strict';

var app = require('../../server/server');
var modelUtils = require('../modelUtils');
var _ = require('underscore');
var redisCache = require('../redisCache');

module.exports = (function() {

  /* to use the power of mysql caching
   we are fetching historical data (eg. match details/past innings)
   in a separate query*/

  // get the match details
  var getMatchDetails = function(matchId, callback) {
    var sql = "select  cm.id as matchId, cm.tournament_id as tournamentId, ct.name as tournamentName,  " +
      "cm.match_type_id as matchTypeId, cmtm.type as matchType,cm.game_date_time as gameDateTime, cm.description as matchDescription, cm.result_string as matchSummary," +
      "cm.home_team_id as homeTeamId, ct1.name as homeTeam, cm.away_team_id as awayTeamId, ct2.name as awayTeam, " +
      "cm.result_id as resultId, cmrm.match_result as result, cm.win_type_id as winTypeId, cmwtm.win_type as winType, " +
      "cm.win_margin as winMargin, cm.toss_result as tossResult, cm.player_of_the_match as pomId, " +
      "cp.name as playerOfTheMatch, cm.venue_id as venueId, cv.name as venueName,  cv.city as venueCity,  " +
      "cv.country as venueCountry,  cm.home_captain as homeCaptainId, cp2.name as homeCaptain, " +
      "cm.away_captain as awayCaptainId, cp3.name as awayCaptain, cm.first_umpire as firstUmpireId, " +
      "co1.first_name as firstUmpireFirstName, co1.last_name as firstUmpireLastName, cm.second_umpire as secondUmpireId, " +
      "co2.first_name as secondUmpireFirstName, co2.last_name as secondUmpireLastName, cm.third_umpire as thirdUmpireId, " +
      "co3.first_name as thirdUmpireFirstName, co3.last_name as thirdUmpireLastName, cm.match_referee as matchRefereeId, " +
      "co4.first_name as matchRefereeFirstName, co4.last_name as matchRefereeLastName from cricket_match cm  " +
      "left join  cricket_tournament ct on cm.tournament_id = ct.id " +
      "left join cricket_match_type_master cmtm on cm.match_type_id=cmtm.id " +
      "join cricket_team ct1 on cm.home_team_id=ct1.id join cricket_team ct2 on cm.away_team_id=ct2.id " +
      "left join cricket_match_result_master cmrm on cm.result_id=cmrm.id " +
      "left join cricket_match_win_type_master cmwtm on cm.win_type_id=cmwtm.id " +
      "left join cricket_player cp on cm.player_of_the_match = cp.id " +
      "left join cricket_venue cv on cm.venue_id=cv.id left join cricket_player cp2 on cm.home_captain=cp2.id " +
      "left join cricket_player cp3 on cm.away_captain=cp3.id left join cricket_official co1 on cm.first_umpire=co1.id " +
      "left join cricket_official co2 on cm.second_umpire=co2.id left join cricket_official co3 on cm.third_umpire=co3.id " +
      "left join cricket_official co4 on cm.match_referee=co4.id where cm.id=? and cm.deleted=0";
    var params = [matchId];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, matchDetails) {
      if (err) {
        return callback(err);
      } else if (matchDetails.length) {
        return callback(null, matchDetails[0]);
      } else {
        return callback(null, null);
      }
    });
  };

  var getMatchSquad = function(matchId, callback) {
    var sql = "select cms.id, match_id as matchId, team_id as teamId, ct.name as teamName, player_id as playerId, cp.name as playerName," +
      " cms.is_captain as isCaptain, cms.is_keeper as isKeeper" +
      " from" +
      " cricket_match_squad cms " +
      " join cricket_team ct on cms.team_id = ct.id " +
      " join cricket_player cp on cms.player_id = cp.id " +
      " where cms.match_id = ? and cms.deleted=0";
    var params = [matchId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, matchSquads) {
      if (err) {
        return callback(err);
      }
      console.log(matchSquads);
      return callback(null, matchSquads);
    });

  };

  // get the latest/in-progress inning of a match
  var getLatestInning = function(matchId, callback) {
    var sql = "select ci.`id` as `id`,`match_id` as `matchId`,`order`, " +
      "`batting_team_id` as battingTeamId,bat.name as battingTeam, " +
      "`bowling_team_id` as bowlingTeamId,bowl.name as bowlingTeam, " +
      "`declared` ,`forfeited`,`follow_on` as followOn,`dl_overs` as dlOvers," +
      "`dl_target` as dlTarget, `overnight_runs` as overnightRuns," +
      "`overnight_wickets` as overnightWickets, `total_runs` as totalRuns,`total_wickets` as totalWickets," +
      "`total_overs` as totalOvers, `required_runs` as requiredRuns,`required_run_rate` as requiredRunRate, `remaining_balls` as remainingBalls  from " +
      "cricket_inning ci  join cricket_team bat on ci.batting_team_id=bat.id join cricket_team bowl on ci.bowling_team_id=bowl.id " +
      "where match_id = ? and ci.deleted=0 order by `order` desc limit 1";
    var params = [matchId];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, inning) {
      if (err) {
        return callback(err);
      } else if (inning.length) {
        return callback(null, inning[0]);
      } else {
        return callback(null, null);
      }
    });
  };

  // get the on crease batsmen
  var getOnCreaseBatsmen = function(inningId, callback) {
    var sql = 'select cbs.id,' +
      'cbs.inning_id as inningId,' +
      'cbs.team_id as teamId,' +
      'cbs.player_id as playerId,' +
      'cp.name as playerName, ' +
      'cbs.`order`,' +
      'cbs.runs,' +
      'cbs.balls_faced as ballsFaced,' +
      'cbs.minutes,' +
      'cbs.fours,' +
      'cbs.sixes,' +
      'cbs.batting_day as battingDay,' +
      'cbs.dismissal_id as dismissalId,' +
      'cbs.bowled_by as bowledBy,' +
      'cbs.fielded_by as fieldedBy,' +
      'cbs.how_out as howOut,' +
      'cbs.non_strike as nonStrike,' +
      'cbs.on_strike as onStrike ' +
      'from cricket_batting_scorecard cbs join cricket_player cp on cbs.player_id=cp.id ' +
      'where cbs.inning_id=? and (cbs.on_strike=1 or cbs.non_strike=1) and cbs.deleted=0 and cp.deleted=0';
    var params = [inningId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, batsmen) {
      if (err) {
        return callback(err);
      }
      return callback(null, batsmen);
    });

  };

  // get the on strike bowler
  var getOnStrikeBowler = function(inningId, callback) {
    var sql = 'select cbs.id as id,' +
      'cbs.inning_id as inningId,' +
      'cbs.team_id as teamId,' +
      'cbs.player_id as playerId,' +
      'cp.name as playerName, ' +
      'cbs.`order`,' +
      'cbs.overs_bowled as oversBowled,' +
      'cbs.balls_bowled as ballsBowled,' +
      'cbs.dot_balls as dotBalls,' +
      'cbs.maiden_overs as maidenOvers,' +
      'cbs.wickets as wickets,' +
      'cbs.wides as wides,' +
      'cbs.runs_conceded as runs,' +
      'cbs.non_strike as nonStrike,' +
      'cbs.on_strike as onStrike ' +
      'from cricket_bowling_scorecard cbs join cricket_player cp on cbs.player_id=cp.id ' +
      'where cbs.inning_id=? and (cbs.on_strike=1) and cbs.deleted=0 and cp.deleted=0';
    var params = [inningId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, bowler) {
      if (err) {
        return callback(err);
      } else if (bowler.length) {
        return callback(null, bowler[0]);
      } else {
        return callback(null, null);
      }
    });

  };

  // get the latest session details
  var getLatestSession = function(matchId, callback) {
    var sql = "select match_id as matchId, `order`, match_status as matchStatus, status,  " +
      "match_day as matchDay from cricket_session cs left join cricket_match_status_master cmsm on cs.match_status = cmsm.id " +
      "where match_id=? and cs.deleted=0 order by `order` desc limit 1";
    var params = [matchId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, session) {
      if (err) {
        return callback(err);
      } else if (session.length) {
        return callback(null, session[0]);
      } else {
        return callback(null, null);
      }
    });
  };

  // get all innings
  var getInnings = function(matchId, callback) {
    var sql = "select ci.`id` as `id`,`match_id` as `matchId`,`order`, " +
      "`batting_team_id` as battingTeamId,bat.name as battingTeam, " +
      "`bowling_team_id` as bowlingTeamId,bowl.name as bowlingTeam, " +
      "`declared` ,`forfeited`,`follow_on` as followOn,`dl_overs` as dlOvers," +
      "`dl_target` as dlTarget, `overnight_runs` as overnightRuns," +
      "`overnight_wickets` as overnightWickets, `total_runs` as totalRuns,`total_wickets` as totalWickets," +
      "`total_overs` as totalOvers, `required_runs` as requiredRuns,`required_run_rate` as requiredRunRate, `remaining_balls` as remainingBalls  from " +
      "cricket_inning ci  join cricket_team bat on ci.batting_team_id=bat.id join cricket_team bowl on ci.bowling_team_id=bowl.id " +
      "where match_id = ? and ci.deleted=0 order by `order`";
    var params = [matchId];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, innings) {
      if (err) {
        return callback(err);
      }
      return callback(null, innings);
    });
  };

  // get batting scorecard for an inning
  var getBattingScorecard = function(inningId, callback) {
    var sql = "select  cbs.id, cbs.inning_id as inningId, cbs.team_id as teamId, " +
      "cbs.player_id as playerId, cp.name as playerName,  cbs.`order`, cbs.runs, " +
      "cbs.balls_faced as ballsFaced, cbs.minutes, cbs.fours, cbs.sixes, cbs.batting_day as battingDay, " +
      "cbs.dismissal_id as dismissalId, cdtm.type as dismissalType, cbs.bowled_by as bowledBy, bowl.name as bowlerName,bowl.initials as bowlerInitials, " +
      "cbs.fielded_by as fieldedBy,field.name as fielderName,field.initials as fielderInitials, cbs.how_out as howOut,cbs.non_strike as nonStrike," +
      "cbs.on_strike as onStrike  from cricket_batting_scorecard cbs  join cricket_player cp on cbs.player_id=cp.id  " +
      "left join cricket_player bowl on cbs.bowled_by=bowl.id " +
      "left join cricket_player field on cbs.fielded_by=field.id " +
      "left join cricket_dismissal_type_master cdtm on cbs.dismissal_id=cdtm.id " +
      "where cbs.inning_id=? and cbs.deleted=0 and cp.deleted=0 order by cbs.`order`";
    var params = [inningId];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, batsmen) {
      if (err) {
        return callback(err);
      }
      return callback(null, batsmen);
    });

  };

  // get bowling scorecard for an inning
  var getBowlingScorecard = function(inningId, callback) {
    var sql = 'select cbs.id as id,' +
      'cbs.inning_id as inningId,' +
      'cbs.team_id as teamId,' +
      'cbs.player_id as playerId,' +
      'cp.name as playerName, ' +
      'cbs.`order`,' +
      'cbs.overs_bowled as oversBowled,' +
      'cbs.balls_bowled as ballsBowled,' +
      'cbs.dot_balls as dotBalls,' +
      'cbs.maiden_overs as maidenOvers,' +
      'cbs.wickets as wickets,' +
      'cbs.wides as wides,' +
      'cbs.runs_conceded as runs,' +
      'cbs.non_strike as nonStrike,' +
      'cbs.on_strike as onStrike ' +
      'from cricket_bowling_scorecard cbs join cricket_player cp on cbs.player_id=cp.id ' +
      'where cbs.inning_id=? and cbs.deleted=0 and cp.deleted=0 order by cbs.`order`';
    var params = [inningId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, bowler) {
      if (err) {
        return callback(err);
      }
      return callback(null, bowler);
    });

  };

  // get fall of wickets for an inning
  var getFallOfWickets = function(inningId, callback) {
    var sql = "select cfw.id , wicket_order as wicketOrder,player_id as playerId, cp.name, " +
      "over_ball as overBall, total_runs as totalRuns from cricket_fall_of_wicket cfw " +
      "join cricket_player cp on cp.id=cfw.player_id where inning_id=? and cfw.deleted=0 order by wicket_order";

    var params = [inningId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, fallOfWickets) {
      if (err) {
        return callback(err);
      }
      return callback(null, fallOfWickets);
    });
  };

  // get last 6 balls
  var getLastSixBalls = function(matchId, callback) {
    var sql = "select inning_order as inningOrder, over, over_ball," +
      " dismissal_id, case when d.opta_id = 0 then 0 else 1 end as isWicket," +
      " batsman_runs_of_ball as batsmanRuns, is_boundary as isBoundary, byes,leg_byes as legByes, " +
      " no_balls as noBall, wides, free_hit as freeHit, team_runs_from_ball as totalRuns from ball_feed b " +
      " left join cricket_dismissal_type_master d on b.dismissal_id=d.id " +
      " where match_id=? and b.deleted is null order by b.id desc limit 6";
    var params = [matchId];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, deliveries) {
      if (err) {
        return callback(err);
      }
      return callback(null, deliveries);
    });
  };

  // get current over deliveries
  var getCurrentOverDetails = function(matchId, inningOrder, over, callback) {
    var sql = "select inning_order as inningOrder, over, over_ball," +
      " dismissal_id, case when d.opta_id = 0 then 0 else 1 end as isWicket," +
      " batsman_runs_of_ball as batsmanRuns, is_boundary as isBoundary, byes,leg_byes as legByes, " +
      "no_balls as noBall, wides, free_hit as freeHit, team_runs_from_ball as totalRuns from ball_feed b " +
      "left join cricket_dismissal_type_master d on b.dismissal_id=d.id " +
      "where match_id=? and inning_order=? and over = floor(?) and b.deleted is null order by b.id desc";
    var params = [matchId, inningOrder, over];
    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, deliveries) {
      if (err) {
        return callback(err);
      }
      return callback(null, deliveries);
    });
  };

  var getInningExtras = function(inningId, callback) {
    var sql = "select id, inning_id as inningId, byes, leg_byes as legByes, no_balls as noBalls, penalty_runs as penaltyRuns, " +
      " wides, total_runs as totalRuns from cricket_extras where inning_id = ? and deleted=0";
    var params = [inningId];
    modelUtils.nativeSQL({sql: sql, params: params}, function(err, extras) {
      if (err) {
        return callback(err);
      } else if (extras.length) {
        return callback(null, extras[0]);
      } else {
        return callback(null, null);
      }
    });
  };

  var getFixtures = function(toDate, teamAnnounced, callback) {

    var params = [],
      toDateSql = '',
      teamAnnouncedSql = '';
    if (toDate) {
      toDateSql = ' and game_date_time <= ? ';
      params.push(toDate);
    }
    if (teamAnnounced) {
      teamAnnouncedSql = ' and t2.name!="TBC" and t3.name!="TBC" ';
    }


    var sql = ' select t1.id, t2.name as homeTeamName, t2.id as homeTeamId,  t3.name as awayTeamName, t3.id as awayTeamId,  ' +
      't1.game_date_time as startTime,  t4.type,sendbird_channel_url as sendbirdChannelUrl  ' +
      'from cricket_match t1 ' +
      'left join cricket_team t2 on t1.home_team_id=t2.id ' +
      'left join cricket_team t3 on t1.away_team_id=t3.id ' +
      'left join cricket_match_type_master t4 on t1.match_type_id=t4.id ' +
      'where game_date_time >= date(now()) ' + toDateSql + teamAnnouncedSql + ' and t1.deleted=0 order by game_date_time ';

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, fixtures) {
      if (err) {
        return callback(err);
      }
      return callback(null, fixtures);
    });
  };

  /***
   * get over by over details
   * @param matchId
   * @param inningOrder
   * @param currentOver
   * @param overLimit
   * @param callback
   */
  var getLastOvers = function(matchId, inningOrder, currentOver, overLimit, callback) {

    var sql = 'select inning_order as inningOrder, over, over_ball as overBall,  pos.name as onStrikeBatsman,' +
      ' pns.name as nonStrikeBatsman,pb.name as bowler, dismissal_id as dismissalId,  ' +
      'case when d.opta_id = 0 then 0 else 1 end as isWicket, batsman_runs_of_ball as batsmanRuns,  ' +
      'is_boundary as isBoundary, byes,leg_byes as legByes,  no_balls as noBall, wides, free_hit as freeHit,  ' +
      'team_runs_from_ball as totalRuns from ball_feed b   ' +
      'left join cricket_dismissal_type_master d on b.dismissal_id=d.id ' +
      'left join cricket_player pos on b.os_batsman_id = pos.id ' +
      'left join cricket_player pns on b.ns_batsman_id = pns.id ' +
      'left join cricket_player pb on b.bowler_id = pb.id   ' +
      'where match_id=? and inning_order = ? and over < ? and over >= ? and b.deleted is null ' +
      'order by over desc, over_ball ';

    var params = [matchId, inningOrder, currentOver, currentOver - overLimit];

    modelUtils.nativeSQL({sql: sql, params: params}, function(err, lastOverDetails) {
      if (err) {
        return callback(err);
      }

      // group balls acc to the over num
      lastOverDetails = _.groupBy(lastOverDetails, function(element) {
        return element.over;
      });

      var resultArr = [];

      // convert object into arr of over objects also containing the over summary along with the balls
      for (var key in lastOverDetails) {
        if (lastOverDetails.hasOwnProperty(key)) {
          var totalRuns = 0,
            totalwickets = 0;
          lastOverDetails[key].forEach(function(elem) {
            totalRuns = totalRuns + elem.totalRuns + elem.byes + elem.legByes + elem.noBall + elem.wides;
            totalwickets = totalwickets + elem.isWicket;
          });
          resultArr.push({
            over: key,
            balls: lastOverDetails[key],
            totalRuns: totalRuns,
            totalWickets: totalwickets
          });
        }
      }

      resultArr = _.sortBy(resultArr, function(element) {
        return -1 * element.over;
      });
      return callback(null, resultArr);
    });
  };

  var getPartnerships = function(inningId, callback) {
    var sql = 'select inning_id as inningId, `order`, player1 as player1Id, p1.name as player1, ' +
      'player2 as player2Id, p2.name as player2, total_runs as totalRuns, total_balls as totalBalls ' +
      'from cricket_partnership cp  join cricket_player p1 on cp.player1 = p1.id ' +
      'join cricket_player p2 on cp.player2 = p2.id where inning_id=? and cp.deleted=0 order by `order`';

    var params = [inningId];

    return modelUtils.nativeSQL({sql: sql, params: params}, function(err, partnerships) {
      if (err) {
        return callback(err);
      }
      return callback(null, partnerships);
    });
  };

  var getLiveTodayMatches = function(fromDate, toDate, callback) {
    if (!fromDate || !toDate) {
      var error = new Error('fromDate and toDate are required parameters');
      error.statusCode = 400;
      return callback(error);
    }

    return redisCache.getCachedValue('live', 'cricket:' + fromDate + ':' + toDate, function(redisErr, redisValue) {
      if (redisErr) {
        return callback(redisErr);
      }
      else if (redisValue) {
        return callback(null, redisValue);
      }
      else {
        // either in between time zone provided or live match
        var sql = 'select id from cricket_match where (date(game_date_time)>=? or result_id=8)  and date(game_date_time)<=? and deleted=0';
        var params = [fromDate, toDate];
        return modelUtils.nativeSQL({sql: sql, params: params}, function(err, matchIds) {
          if (err) {
            return callback(err);
          }
          return redisCache.cacheValue('live', 'cricket:' + fromDate + ':' + toDate, matchIds, function(cachingErr, cachingResult) {
            if (cachingErr) {
              return callback(cachingErr);
            }
            return callback(null, matchIds);
          });
        });
      }
    });
  };

  var getCommentary = function(matchId, messageId, pageType, callback) {
    var error;
    if (!matchId || !messageId || !pageType) {
      error = new Error('matchId ,messageId and pageType are required parameters');
      error.statusCode = 400;
      return callback(error);
    }
    if (pageType.toLowerCase() !== 'next' && pageType.toLowerCase() !== 'last') {
      error = new Error('Unsupported pageType');
      error.statusCode = 400;
      return callback(error);
    }

    return redisCache.getCachedValue('commentary', 'cricket:' + matchId + ':' + messageId + ':' + pageType, function(redisErr, redisValue) {
      if (redisErr) {
        return callback(redisErr);
      }
      else if (redisValue) {
        return callback(null, redisValue);
      }
      else {
        // either in between time zone provided or live match
        var sql;
        if (pageType.toLowerCase() === 'next') {
          sql = 'select id, inning_order as inningOrder,over_num as overNum, type, text from cricket_commentary cc join (select opta_id from cricket_match where id=? and deleted=0)m ' +
            'on cc.opta_match_id=m.opta_id where cc.id>? and cc.deleted=0 order by id limit 6';
        } else {
          sql = 'select id, inning_order as inningOrder,over_num as overNum, type, text from cricket_commentary cc join (select opta_id from cricket_match where id=? and deleted=0)m ' +
            'on cc.opta_match_id=m.opta_id where cc.id<? and cc.deleted=0 order by id desc limit 6';
        }
        var params = [matchId, messageId];
        return modelUtils.nativeSQL({sql: sql, params: params}, function(err, commentary) {
          if (err) {
            return callback(err);
          }
          return redisCache.cacheValue('commentary', 'cricket:' + matchId + ':' + messageId + ':' + pageType, commentary, function(cachingErr, cachingResult) {
            if (cachingErr) {
              return callback(cachingErr);
            }
            return callback(null, commentary);
          });
        });
      }
    });
  }

  var getLiveCommentary = function(matchId, callback) {
    var error;
    if (!matchId) {
      error = new Error('matchId is a required parameter');
      error.statusCode = 400;
      return callback(error);
    }

    return redisCache.getCachedValue('commentary', 'cricket:' + matchId, function(redisErr, redisValue) {
      if (redisErr) {
        return callback(redisErr);
      }
      else if (redisValue) {
        return callback(null, redisValue);
      }
      else {
        // either in between time zone provided or live match
        var sql = 'select id, inning_order as inningOrder,over_num as overNum, type, text from cricket_commentary cc join (select opta_id from cricket_match where id=? and deleted=0)m ' +
          'on cc.opta_match_id=m.opta_id where cc.deleted=0 order by id desc limit 6';
        var params = [matchId];
        return modelUtils.nativeSQL({sql: sql, params: params}, function(err, commentary) {
          if (err) {
            return callback(err);
          }
          return redisCache.cacheValue('commentary', 'cricket:' + matchId, commentary, function(cachingErr, cachingResult) {
            if (cachingErr) {
              return callback(cachingErr);
            }
            return callback(null, commentary);
          });
        });
      }
    });
  };

  return {
    getLatestInning: getLatestInning,
    getOnCreaseBatsmen: getOnCreaseBatsmen,
    getOnStrikeBowler: getOnStrikeBowler,
    getMatchDetails: getMatchDetails,
    getLatestSession: getLatestSession,
    getInnings: getInnings,
    getBowlingScorecard: getBowlingScorecard,
    getBattingScorecard: getBattingScorecard,
    getFallOfWickets: getFallOfWickets,
    getLastSixBalls: getLastSixBalls,
    getCurrentOverDetails: getCurrentOverDetails,
    getMatchSquad: getMatchSquad,
    getInningExtras: getInningExtras,
    getFixtures: getFixtures,
    getLastOvers: getLastOvers,
    getPartnerships: getPartnerships,
    getLiveTodayMatches: getLiveTodayMatches,
    getCommentary: getCommentary,
    getLiveCommentary: getLiveCommentary
  };
})();
