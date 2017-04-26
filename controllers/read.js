'use strict';

var logging     = require("../logging");
var Promise     = require("bluebird");
var async       = require("async");
var redis       = require("../redis");
var constants   = require("../constants");

exports.getDriverAppData     = getDriverAppData;


function getDriverAppData(req, res){
    var handlerInfo = {
        apiModule: 'read',
        apiHandler: 'getDriverAppData'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});
    var driver_id = parseInt(req.body.driverId);
    
    var tasks = [];
    tasks.push(getDriverTasks.bind(null, handlerInfo, driverId));
    
    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.send(asyncErr)
        }
        res.send("Request Recieved");
    });
}

function getDriverTasks(handlerInfo, driverId, cb) {
    var tasks = "SELECT request_id, customer_id, DATE_FORMAT((NOW() - request_time), '') FROM tb_requests WHERE driver_id = ?";
    var tasksQ = connection.query(tasks, [driverId], function(err, tasksD){
        logging.logDatabaseQuery(handlerInfo, 'Getting all tasks for drivers', err, tasksD, tasksQ.sql);
        if(err){
            return cb(err);
        }
        var waiting = [], ongoing = [], complete = [];
        for(var i=0; i<tasks.length; i++){

        }
        cb(null, tasksD);
    });
}