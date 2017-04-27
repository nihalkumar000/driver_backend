'use strict';

var logging         = require("../logging");
var cron            = require("../controllers/cron");

exports.complete_rides       = complete_rides;

function complete_rides(req, res){
    res.header("Access-Control-Allow-Origin", "*");

    var handlerInfo = {
        apiModule : 'cron',
        apiHandler: 'completeRides'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});

    cron.completeRides(req, res);
    
}