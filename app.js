
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

var logger          = require('./logging');
var redis           = require('./redis');
var utils           = require('./controllers/utils');
var mysqlLib        = require('./mysqlLib');
var driver          = require('./routes/driver');

connection = undefined;

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


// development only
if ('development' == app.get('env')) {
    app.use(errorhandler());
}

var httpServer = http.createServer(app).listen(config.get('port'), function() {
    console.log('Express HTTP server listening on port ' + config.get('port'));
});

