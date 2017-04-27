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
    logging.trace(handlerInfo, {REQUEST: req.body});
    var customer_id = parseInt(req.body.customerId);
    var tasks = [];
    tasks.push(getAvailableDrivers.bind(null, handlerInfo));
    tasks.push(putRequest.bind(null, handlerInfo, customer_id));
    tasks.push(putSession.bind(null, handlerInfo, customer_id));

    async.waterfall(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return res.status(500).send(asyncErr)
        }
        res.status(200).send("Request Recieved");
    });
}


function acceptRequest(req, res){
    var handlerInfo = {
        apiModule: 'driver',
        apiHandler: 'acceptRequest'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});

    var requestId = parseInt(req.body.requestId);
    var driver_id = parseInt(req.body.driverId);
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
    var driversQ = connection.query(drivers, [1], function(err, drivers){
        logging.logDatabaseQuery(handlerInfo, 'Getting all available drivers', err, drivers, driversQ.sql);
        if(err){
            return cb(err);
        }
        cb(null, drivers);
    });
}

function putRequest(handlerInfo, customerId, driverIdArr, cb){
    var values = [0, customerId, constants.rideStatus.REQUESTED];
    var putReq = "INSERT INTO tb_requests(driver_id, customer_id, status) VALUES (?)";
    var reqQ = connection.query(putReq, [values], function(reqErr, reqD){
        logging.logDatabaseQuery(handlerInfo, 'Put request data', reqErr, reqD, reqQ.sql);
        console.log(reqD);
        if(reqErr){
            return cb(reqErr);
        }
       
        cb(null, {"driverIdArr" : driverIdArr, "requestId" : reqD.insertId});
    });
}


function putSession(handlerInfo, customerId, waterfallObj, cb){
    var driverIdArr = waterfallObj["driverIdArr"];
    var requestId = waterfallObj["requestId"];
    var values = [];
    for(var i=0; i< driverIdArr.length; i++){
        var driver = [driverIdArr[i].driver_id, customerId, requestId, constants.rideStatus.REQUESTED];
        values.push(driver);
    }
    var putEng = "INSERT INTO tb_sessions(driver_id, customer_id, request_id, status)  VALUES ?";
    var engsQ = connection.query(putEng, [values], function(err, engQData){
        logging.logDatabaseQuery(handlerInfo, 'Put session data', err, engQData, engsQ.sql);
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
    tasks.push(engDriver.bind(null, handlerInfo, driverId));
    
    async.series(tasks, function(asyncErr, asyncData){
        if(asyncErr){
            logging.error(handlerInfo, {ERROR : asyncErr.message});
            return cb(asyncErr);
        }
        cb(null, "Alloted Successfully!!");
    });
    
    function updateDriverEng(handlerInfo, requestId, driverId, cb){
        var driverEng = "UPDATE tb_requests AS a "+
        "JOIN tb_sessions as b " +
        "ON a.request_id = b.request_id " +
        "SET a.status = ?, a.pickup_time = NOW(), a.driver_id = ?, a.session_id = b.session_id " +
        "WHERE a.request_id = ? AND b.driver_id = ?";
        var driverEngQ = connection.query(driverEng, [constants.rideStatus.PICKUP, driverId, requestId, driverId], function(uErr, uData){
            logging.logDatabaseQuery(handlerInfo, 'Updating request for driver', uErr, uData, driverEngQ.sql);
            if(uErr){
                return cb(uErr);
            };
            cb();
        });
    }
    
    function updateOtherDriverEng(handlerInfo, requestId, driverId, cb){
        var driverEng = "UPDATE tb_sessions "+
            "SET status = (CASE WHEN driver_id = ? THEN ? ELSE ? END) "+
            "WHERE request_id = ?";
        var driverEngQ = connection.query(driverEng, [driverId, constants.rideStatus.PICKUP,
            constants.rideStatus.ALLOTED_TO_OTHER_DRIVER, requestId], function(uErr, uData){
            logging.logDatabaseQuery(handlerInfo, 'Updating session for other drivers', uErr, uData, driverEngQ.sql);
            if(uErr){
                return cb(uErr);
            };
            cb();
        });
    }

    function engDriver(handlerInfo, driverId, cb){
        var driverEng = "UPDATE tb_drivers " +
            "SET is_available = 0 "+
            "WHERE driver_id = ? ";
        var uDriver = connection.query(driverEng, [driverId], function(uErr, uData){
            logging.logDatabaseQuery(handlerInfo, 'Updating  driver', uErr, uData, uDriver.sql);
            if(uErr){
                return cb(uErr);
            };
            cb();
        });
    }


}


function checkRedisLock(handlerInfo, requestId, cb){
    redis.exists(requestId, function(eErr, doesExist) {
        logging.logDatabaseQuery(handlerInfo, 'Getting redis key', eErr, doesExist);
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
        logging.logDatabaseQuery(handlerInfo, 'Setting redis', eErr, result);
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
            logging.logDatabaseQuery(handlerInfo, 'Getting all available drivers', err, drivers, driversQ.sql);
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
            logging.logDatabaseQuery(handlerInfo, 'Put', err, engQData, engsQ.sql);
            if(err){
                return reject(err);
            }
            resolve();
        });
    });
}
*/

