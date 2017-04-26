'use strict';

var logging         = require("../logging");
var read          = require("../controllers/read");

exports.get_driver_app_data        = get_driver_app_data;


function get_driver_app_data(req,res){
    var handlerInfo = {
        apiModule : 'read',
        apiHandler: 'getDriverAppData'};
    logging.trace(handlerInfo, {REQUEST: req.body});

    read.getDriverAppData(req, res);
}