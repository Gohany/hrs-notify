var Broker = require('pigato').Broker;
var Worker = require('pigato').Worker;
var Client = require('pigato').Client;
var fs = require('fs');
var net = require('net');
var crypto = require('crypto');
var client = require('twilio')('AC742c7e3dbde640741c1e8e7dedced9b4', '6a4f2c76c6f8899dc56d31ddafbd64a4');
var redis = require("redis"),
        redisClient = redis.createClient();
require('./redisUtilities.js');
var humans = require('./humans.js');
var heapdump = require('heapdump');

module.exports = (function () {

        notify = function (type)
        {
                // what's it gonna do?
                // ghostbusters!
                // 
                // graphite - stuff
                // xmpp
                // email
                // grab snmp or somesuch
                // 
                // what about monitor?
                // what is going to call this... running as a service
                // monitor the alerts from the servers... trigger rules
                console.log('PID: ' + process.pid);
                this.conf = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'UTF-8'));
                this.sendEvery = 15;

                if (typeof type !== 'undefined' && typeof this[type] === 'function')
                {
                        this[type]();
                }

                return this;

        }

        notify.asBroker = function ()
        {
                return new notify('broker');
        }

        notify.asLogger = function ()
        {
                return new notify('logger');
        }

        notify.asTTH = function ()
        {
                return new notify('tth');
        }

        notify.asClient = function ()
        {
                return new notify('client');
        }

        notify.prototype = {
                tth: function ()
                {
                        console.log('loading tth');
                        this.worker = new Worker('tcp://' + this.conf.broker.host + ':' + this.conf.broker.port, 'tth')
                        this.worker.start();

                        var requests = {};
                        var self = this;
                        this.worker.on('request', function (inp, rep) {
                                // code.message.location.severity
                                // 500.Internal Server Error.wf12:app1:enterprise.severity
                                console.log('Got: ' + inp);

                                var explode = inp.split('.');
                                var code = explode[0] || '500';
                                var message = explode[1] || 'Error';
                                var location = explode[2] || 'Location:Unknown';
                                var severity = explode[3] || '100';

                                var locationExplode = location.split(':');

                                var tsd = '';
                                for (var counter = locationExplode.length - 1; counter >= 0; counter--) {
                                        tsd += locationExplode[counter] + '.';
                                }
                                tsd += code;

                                rep.write('received');

                                this.client = new Client('tcp://' + self.conf.broker.host + ':' + self.conf.broker.port);
                                this.client.start();
                                this.client.request(
                                        'tsdLog', tsd,
                                        function (err, data) {
                                        },
                                        function (err, data) {
                                        }, {timeout: 10000}
                                );


                                var humanSet = humans.all();
                                humanSet.text(message, severity);
                                humanSet.email('HRS Notification', message, severity);
                                humanSet.phone(message, severity);
                                rep.end('SUCCESS');
                        });

                },
                logger: function ()
                {
                        console.log('loading logger');
                        this.worker = new Worker('tcp://' + this.conf.broker.host + ':' + this.conf.broker.port, 'tsdLog')
                        this.worker.start();

                        var echos = [];
                        var incrementValue = 1;
                        this.worker.on('request', function (inp, rep) {

                                var explode = inp.split(' ');
                                if (explode[1])
                                {
                                        incrementValue = explode[1];
                                        inp = explode[0];
                                }

                                redisClient.incrby('logger:' + inp, incrementValue, function (err, res) {
                                        if (err)
                                                console.log(err);
                                });

                                if (echos.indexOf(inp) == -1)
                                {
                                        echos.push(inp);
                                }

                                rep.end('SUCCESS');
                        });

                        var self = this;
                        setInterval(function ()
                        {

                                var check = new Date();
                                if (check.getSeconds() > 1)
                                {
                                        return;
                                }

                                for (var key in echos)
                                {

                                        var date = new Date(Date.now());
                                        var loggerTS = 'LOG.SETNX:' + date.getDay() + ':' + date.getHours() + ':' + date.getMinutes();

                                        var entryKey = echos[key];
                                        redisClient.setnx(loggerTS, '1', function (err1, res1) {
                                                if (res1)
                                                {
                                                        redisClient.getset('logger:' + entryKey, 0, function (err2, res2) {
                                                                var entry = entryKey + " " + res2 + " " + Math.floor(Date.now() / 1000) + "\n";
                                                                var carbon = new net.Socket({readable: false});
                                                                carbon.connect(2003, '127.0.0.1', function ()
                                                                {
                                                                        console.log('WRITING: ' + entry);
                                                                        carbon.write(entry);
                                                                });

                                                                carbon.on('data', function (data)
                                                                {
                                                                        console.log('DATA: ' + data);
                                                                        carbon.destroy();
                                                                });

                                                                carbon.on('close', function () {
                                                                        console.log('Connection closed');
                                                                });
                                                                delete carbon;
                                                        });
                                                        redisClient.expire(loggerTS, 900, function (err3, res3) {
                                                                if (res3)
                                                                {
                                                                        console.log('set expire');
                                                                }
                                                        });
                                                }
                                        });
                                }
                                echos = [];
                        }, 1000);

                        //return this.worker;
                },
                client: function ()
                {
                        console.log('loading client');
                        this.client = new Client('tcp://' + this.conf.broker.host + ':' + this.conf.broker.port);
                        this.client.start();

                        // CALLBACK MODE
                        var count = 0;
                        console.log("CLIENT SEND REQUEST (callback mode)");
                        console.time('1-requests');

                        for (i = 0, c = 1; i < c; i++)
                        {
                                this.client.request(
                                        //error code, message, location, and severity (scale 0-100)
                                        'tth', '500.Internal Server Error.wf12:app1:enterprise.100',
                                        //'tsdLog', 'enterprise.notifications.worker.loadtest',
                                        function (err, data) {
                                                console.log("PARTIAL", err, data);
                                        },
                                        function (err, data) {
                                                console.log("FINAL", err, data);
                                        }, {timeout: 10000}
                                );
                        }

                        console.timeEnd('1-requests');
                        return this.client;
                },
                broker: function ()
                {
                        this.broker = new Broker("tcp://*:" + this.conf.broker.port);
                        this.broker.start(function (err) {
                                console.log('doing stuff...');
                                //console.log(self.broker);
                                if (err) {
                                        console.log(err);
                                        process.exit(0);
                                }
                        });
                        return this.broker;
                },
        }

        return notify;

})();

//                        redisClient.lock('lock:' + md5, 'tth');
//                        redisClient.on('locked', function () {
//                                redisClient.unlock('someunique', 'tth');
//                                redisClient.on('unlock', function () {
//                                        console.log('unlocked');
//                                });
//                        });