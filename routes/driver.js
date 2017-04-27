'use strict';

var logging         = require("../logging");
var driver          = require("../controllers/driver");

exports.request_ride        = request_ride;
exports.accept_request      = accept_request;


function request_ride(req, res) {
    res.header("Access-Control-Allow-Origin", "*");

    var handlerInfo = {
        apiModule : 'driver',
        apiHandler: 'requestRide'
    };
    logging.trace(handlerInfo, {REQUEST: req.body});

    driver.rideRequest(req, res);
};

function accept_request(req, res){
    res.header("Access-Control-Allow-Origin", "*");

    var handlerInfo = {
        apiModule : 'driver',
        apiHandler: 'acceptRequest'};
    logging.trace(handlerInfo, {REQUEST: req.body});

    driver.acceptRequest(req, res);
}