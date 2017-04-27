'use strict';

var logging     = require("../logging");
var Promise     = require("bluebird");
var async       = require("async");
var redis       = require("../redis");
var constants   = require("../constants");


exports.completeRides     = completeRides;



function completeRides(req, res) {
    var handlerInfo = {
        apiModule: 'cron',
        apiHandler: 'completeRides'
    };

    logging.trace(handlerInfo, {REQUEST: req.body});
    var tasks = [];
    tasks.push(markRidesCompleted.bind(null, handlerInfo));

    async.series(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.status(500).send(asyncErr)
        }
        res.status(200).send("Successfully marked completed!!");
    });
}

function markRidesCompleted(handlerInfo, cb){
    var markComp = "UPDATE tb_drivers AS a " +
        "JOIN tb_requests AS b " +
        "ON a.driver_id = b.driver_id " +
        "JOIN tb_sessions AS c " +
        "ON b.session_id = c.session_id " +
        "SET a.is_available = ?, b.complete_time = NOW(), b.status = ?, c.status = ? " +
        "WHERE TIMESTAMPDIFF(MINUTE, b.pickup_time, NOW()) >= ? ";
    var values = [1, constants.rideStatus.COMPLETED, constants.rideStatus.COMPLETED, constants.maxRideTime];
    var markCompQ = connection.query(markComp, values, function(err, markCompD){
        logging.logDatabaseQuery(handlerInfo, 'Marking rides completed', err, markCompD, markCompQ.sql);
        if(err){
            return cb(err);
        }
        cb();
    });
}