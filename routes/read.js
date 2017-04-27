'use strict';

var logging         = require("../logging");
var read          = require("../controllers/read");

exports.get_driver_app_data        = get_driver_app_data;
exports.get_dashboard_data        = get_dashboard_data;


function get_driver_app_data(req,res){
    res.header("Access-Control-Allow-Origin", "*");
    
    var handlerInfo = {
        apiModule : 'read',
        apiHandler: 'getDriverAppData'};
    logging.trace(handlerInfo, {REQUEST: req.body});

    read.getDriverAppData(req, res);
}


function get_dashboard_data(req,res){
    res.header("Access-Control-Allow-Origin", "*");

    var handlerInfo = {
        apiModule : 'read',
        apiHandler: 'getDashboardData'};
    logging.trace(handlerInfo, {REQUEST: req.body});

    read.getDashboardData(req, res);
}