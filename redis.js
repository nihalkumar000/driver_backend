var config = require("config");


var redis_config = {
    host: config.get('redisSettings.host'),
    port: config.get('redisSettings.port')
};

var redis = require('redis').createClient(redis_config.port, redis_config.host);

redis.on("connect", function(err) {
    redis.connected = true;
});

redis.on("error", function(err) {
    redis.connected = false;
});

module.exports.redis = redis;
