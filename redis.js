var config = require("config");


var options = {
    host: config.get('redisSettings.host'),
    port: config.get('redisSettings.port')
};

var redis = require('redis').createClient(options);

redis.on("connect", function(err) {
    redis.connected = true;
    console.log("redis connected");
});

redis.on("error", function(err) {
    redis.connected = false;
    console.error("redis error in connection");
});

module.exports = redis;
