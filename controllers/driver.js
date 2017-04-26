'use strict';

var logging     = require("../logging");
var Promise     = require("bluebird");
var async       = require("async");
var redis       = require("../redis");
var constants   = require("../constants");

exports.rideRequest     = rideRequest;
exports.acceptRequest   = acceptRequest;



function rideRequest(req, res) {
    var handlerInfo = {
        apiModule: 'driver',
        apiHandler: 'rideRequest'
    };
    loggingImp.trace(handlerInfo, {REQUEST: req.body});
    var tasks = [];
    tasks.push(getAvailableDrivers.bind(null, handlerInfo));
    tasks.push(putEngagements.bind(null, handlerInfo, customer_id));
    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.send(asyncErr)
        }
        res.send("Request Recieved");
    });
}


function acceptRequest(req, res){
    var handlerInfo = {
        apiModule: 'driver',
        apiHandler: 'acceptRequest'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});

    var requestId = parseInt(req.body.request_id);
    var driver_id = parseInt(req.body.driver_id);
    var tasks = [];

    tasks.push(checkRedisLock.bind(null, handlerInfo, requestId));
    tasks.push(redisLock.bind(null, handlerInfo, requestId));
    tasks.push(updateEngagements.bind(null, handlerInfo, requestId, driver_id));
    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            if(asyncErr == "Exists"){
                return res.status(200).send("Already alloted");
            }
            return res.send(asyncErr);
        }
        res.send("Request Recieved");
    });
}

function getAvailableDrivers(handlerInfo, cb){
    var drivers = "select driver_id from tb_drivers where is_available = ?";
    var driversQ = connection.query(drivers, [constants.rideStatus.REQUESTED], function(err, drivers){
        logging.logDatabaseQuery(handlerInfo, 'Getting all available drivers', err, drivers, driversQ.sql);
        if(err){
            return cb(err);
        }
        cb(null, drivers);
    });
}

function putEngagements(handlerInfo, customer_id, driverIdArr, cb){
    var values = [];
    for(var i=0; i< driverIdArr.length; i++){
        var driver = [driverIdArr.driver_id, customer_id, 1];
        values.push(driver);
    }
    var putEng = "INSERT INTO tb_requests (driver_id, customer_id, status) VALUES ?";
    var engsQ = connection.query(putEng, [values], function(err, engQData){
        logging.logDatabaseQuery(handlerInfo, 'Put', err, engQData, engsQ.sql);
        if(err){
            return cb(err);
        }
        cb();
    });
}


function updateEngagements(handlerInfo, requestId, driverId, cb){
    var tasks = [];
    tasks.push(updateDriverEng.bind(null, handlerInfo, requestId, driverId));
    tasks.push(updateOtherDriverEng.bind(null, handlerInfo, requestId, driverId));
    
    async.series(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.send(asyncErr);
        }
        res.send("Alloted Successfully!!");
    });
    
    function updateDriverEng(handlerInfo, requestId, driverId, cb){
        var driverEng = "UPDATE tb_requests AS a JOIN tb_drivers as b " +
        "ON a.driver_id = b.driver_id " +
        "SET a.status = ?, b.isavailable = 0 " +
        "WHERE a.driver_id = ? AND a.request_id = ?";
        var driverEngQ = connection.query(driverEng, [constants.rideStatus.ACCEPTED, requestId, driverId], function(uErr, uData){
            if(uErr){
                logging.logDatabaseQuery(handlerInfo, 'Updating Eng Err', uErr, uData, driverEngQ.sql); 
                return cb(uErr);
            };
            cb();
        });
    }
    function updateOtherDriverEng(handlerInfo, requestId, driverId, cb){
        var driverEng = "UPDATE tb_requests "+
            "SET status = ? "+
            "WHERE request_id = ? AND driver_id != ?";
        var driverEngQ = connection.query(driverEng, [constants.rideStatus.ALLOTED_TO_OTHER_DRIVER, requestId, driverId], function(uErr, uData){
            if(uErr){
                logging.logDatabaseQuery(handlerInfo, 'Updating Eng Err', uErr, uData, driverEngQ.sql);
                return cb(uErr);
            };
            cb();
        });
    }


}


function checkRedisLock(handlerInfo, requestId, cb){
    redis.exists(requestId, function(eErr, doesExist) {
        if(eErr){
            return cb(eErr);
        }
        cb(null, doesExist);
    });
}


function redisLock(handlerInfo, requestId, doesExist,  cb){
    if(doesExist){
        return cb("Exists");
    }
    redis.set(requestId, "true", function(eErr, result) {
        if(!eErr) {
            redis.expire(requestId, 60);
        }
        cb();
    });
}
/*
function getAvailableDrivers(handlerInfo){
    return newPromise(function(resolve, reject){
        var drivers = "select driver_id from tb_drivers where is_available = ?";
        var driversQ = connection.query(drivers, [1], function(err, drivers){
            loggingImp.logDatabaseQuery(handlerInfo, 'Getting all available drivers', err, drivers, driversQ.sql);
            if(err){
                return reject(err);
            }
            resolve(drivers);
        });
    });
}

function putEngagements(handlerInfo, driverIdArr, customer_id){
    return new Promise(function(resolve, reject){
        var values = [];
        for(var i=0; i< driverIdArr.length; i++){
            var driver = [driverIdArr.driver_id, customer_id, 1];
            values.push(driver);
        }
        var putEng = "INSERT INTO tb_requests (driver_id, customer_id, status) VALUES ?";
        var engsQ = connection.query(putEng, [values], function(err, engQData){
            loggingImp.logDatabaseQuery(handlerInfo, 'Put', err, engQData, engsQ.sql);
            if(err){
                return reject(err);
            }
            resolve();
        });
    });
}
*/

