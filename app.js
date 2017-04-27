
/**
 * Module dependencies.
 */
var express         = require('express');
var http            = require('http');
var https           = require('https');
var path            = require('path');
var bodyParser      = require('body-parser');
var favicon         = require('serve-favicon');
var errorhandler    = require('errorhandler');
var methodOverride  = require('method-override');
var fs              = require('fs');
var config          = require('config');
var compression     = require('compression');

connection = undefined;

var logger          = require('./logging');
var mysqlLib        = require('./mysqlLib');
var redis           = require('./redis');
var utils           = require('./controllers/utils');
var driver          = require('./routes/driver');
var read            = require('./routes/read');
var cron            = require('./routes/cron');



var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(bodyParser.json({
    extended: true
    }
));
app.use(bodyParser.urlencoded({
      extended: true
}));

app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', function(req, res){res.send('Ping Pong!!')});

app.post('/requestRide',                   driver.request_ride);
app.post('/acceptRequest',                 driver.accept_request);
app.post('/getDriverAppData',              read.get_driver_app_data);
app.post('/getDashboardData',              read.get_dashboard_data);

app.post('/completeRides',                 cron.complete_rides);



// development only
if ('development' == app.get('env')) {
    app.use(errorhandler());
}

var httpServer = http.createServer(app).listen(config.get('port'), function() {
    console.log('Express HTTP server listening on port ' + config.get('port'));
});

