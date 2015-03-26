var redis = require("redis"),
        redisClient = redis.createClient();
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var lockTimeout = 5;

redis.RedisClient.prototype.lock = function (key, type) {

        var lockKey = key + ':' + type;
        this.lockTimeout = Date.now() + lockTimeout + 1;

        var self = this;
        console.log('Locking ' + lockKey + ' for ' + lockTimeout);

        this.setnx(lockKey, self.lockTimeout, function (err1, res1)
        {
                if (err1)
                {
                        console.log('err1: ' + err1);
                }
                console.log('res: ' + res1);
                if (res1 == 0)
                {
                        self.get(lockKey, function (err2, res2) {

                                if (err2)
                                {
                                        console.log('err2: ' + err2);
                                }
                                console.log('res2: ' + res2);
                                if (!res2)
                                {
                                        console.log('trying again');
                                        self.lock(key, type);
                                }
                                else
                                {
                                        console.log('Comparing..');
                                        if (res2 && Date.now() > res2)
                                        {
                                                console.log('there is a new timestamp... trying getset');
                                                self.lockTimeout = Date.now() + lockTimeout + 1;
                                                self.getset(lockKey, self.lockTimeout, function (err3, res3) {

                                                        if (err3)
                                                        {
                                                                console.log('err3: ' + err3);
                                                        }

                                                        console.log('res3: ' + res3);

                                                        if (res3 == res2)
                                                        {
                                                                //success
                                                                self.locked = true;
                                                                self.emit('locked');
                                                                return true;
                                                        }
                                                        else
                                                        {
                                                                self.lock(key, type);
                                                        }
                                                });
                                        }
                                        else
                                        {
                                                console.log('locktimeout: ' + self.lockTimeout);
                                                console.log('was not greater, dude.');
                                                self.lock(key, type);
                                        }
                                }
                        });
                }
                else
                {
                        self.locked = true;
                        self.emit('locked');
                }
        });

};


redis.RedisClient.prototype.unlock = function (key, type) {
        var lockKey = key + ':' + type;
        var success = true;
        var self = this;
        this.get(lockKey, function (err, res) {
                if (res == self.lockTimeout)
                {
                        self.del(lockKey, function (err, res) {
                                self.locked = false;
                                self.emit('unlock');
                                return true;
                        });
                }
                else
                {
                        self.locked = false;
                        self.emit('unlock');
                        return;
                }
        });
};

redis.RedisClient.prototype.isLocked = function (key, type) {
        return this.locked;
};


util.inherits(redis.RedisClient, EventEmitter);