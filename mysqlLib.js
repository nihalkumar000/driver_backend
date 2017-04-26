var mysql = require('mysql');
var config = require('config');



var db_config_driver = config.get('db_config.db_config_driver');




function handleDisconnect_driver() {
    connection = mysql.createPool(db_config_driver);     // creating a connection pool.

    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {  // Connection to the MySQL server is usually
            handleDisconnect_driver();                         // lost due to either server restart, or a
        } else {                                        // connection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect_driver();
