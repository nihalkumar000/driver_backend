'use strict';

var logging     = require("../logging");
var Promise     = require("bluebird");
var async       = require("async");
var redis       = require("../redis");
var constants   = require("../constants");

exports.getDriverAppData     = getDriverAppData;
exports.getDashboardData     = getDashboardData;


function getDriverAppData(req, res){
    var handlerInfo = {
        apiModule: 'read',
        apiHandler: 'getDriverAppData'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});
    var driver_id = parseInt(req.body.driverId);
    
    var tasks = [];
    tasks.push(getDriverTasks.bind(null, handlerInfo, driver_id));
    
    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.status(500).send(asyncErr)
        }
        res.status(200).send(asyncData);
    });
}


function getDashboardData(req, res){
    var handlerInfo = {
        apiModule: 'read',
        apiHandler: 'getDashboardData'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});

    var tasks = [];
    tasks.push(getCustomerRides.bind(null, handlerInfo));

    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.status(500).send(asyncErr)
        }
        res.status(200).send(asyncData);
    });
}

function getDriverTasks(handlerInfo, driverId, cb) {
    var tasks = "SELECT request_id, status, customer_id, TIMESTAMPDIFF(MINUTE, request_time, NOW()) as request_mins, " +
        "TIMESTAMPDIFF(MINUTE , pickup_time, NOW()) as pickup_mins, " +
        "TIMESTAMPDIFF(MINUTE, complete_time, NOW()) as complete_mins " +
        "FROM tb_requests " +
        "WHERE driver_id IN (?, 0)  AND status IN (?)";
    var validStatus = [constants.rideStatus.ACCEPTED, constants.rideStatus.COMPLETED,
        constants.rideStatus.PICKUP, constants.rideStatus.REQUESTED];
    var tasksQ = connection.query(tasks, [driverId, validStatus], function(err, tasksD){
        logging.logDatabaseQuery(handlerInfo, 'Getting all tasks for drivers', err, tasksD, tasksQ.sql);
        if(err){
            return cb(err);
        }
        var waiting = [], ongoing = [], complete = [];
        for(var i=0; i<tasksD.length; i++){
            if(tasksD[i].status == constants.rideStatus.COMPLETED){
                complete.push(tasksD[i]);
            }
            else if(tasksD[i].status == constants.rideStatus.ACCEPTED || tasksD[i].status == constants.rideStatus.PICKUP){
                ongoing.push(tasksD[i]);
            }
            else if(tasksD[i].status == constants.rideStatus.REQUESTED){
                waiting.push(tasksD[i]);
            }
        }
        var tasksObj = {
            "waiting" : waiting,
            "ongoing" : ongoing,
            "completed" : complete
        };
        cb(null, tasksObj);
    });
}

function getCustomerRides(handlerInfo, cb){
    var tasks = "SELECT request_id, status, driver_id, customer_id, " +
        "TIMESTAMPDIFF(MINUTE, request_time, NOW()) as request_mins " +
        "FROM tb_requests " +
        "WHERE status IN (?)";
    var validStatus = [constants.rideStatus.ACCEPTED, constants.rideStatus.COMPLETED,
        constants.rideStatus.PICKUP, constants.rideStatus.REQUESTED];
    var tasksQ = connection.query(tasks, [validStatus], function(err, tasksD){
        logging.logDatabaseQuery(handlerInfo, 'Getting all tasks for drivers', err, tasksD, tasksQ.sql);
        if(err){
            return cb(err);
        }
        cb(null, tasksD);
    });
}