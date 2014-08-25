var util = require('util');
var EventEmitter = require('events').EventEmitter;

var osc = require("osc");
var Q = require("q");

var config = require("./config");
var colors = require("./colors.js");

// Create an osc.js UDP Port listening on port 57121.
var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8998
});

// Listen for incoming OSC messages.
udpPort.on("bundle", function (oscBundle) {
    console.log("OSC IN:", oscBundle);
});
udpPort.on("message", function(msg){
    console.log("OSC IN:", msg);
});

// Open the socket.
udpPort.open();
console.log("listening for OSC on UDP port 8998");



//var i = 0;
//var j = 0;
//var lastTime;
//var startTime;
//
//var buffer = new Buffer(NUM_ADDRESSES);
//
//function writeit() {
//    for(i = 0; i < NUM_ADDRESSES; i++){
//        buffer[i] = j;
//    }
//    serialPort.write(buffer, function () {
//        serialPort.drain(function () {
//            var thisTime = new Date().getTime();
//            console.log("this time: ", thisTime - lastTime);
//            lastTime = thisTime;
//            if(j == 255){
//                var end = new Date().getTime();
//                var diff = end - startTime;
//                console.log("test took " + diff + " ms or " + (diff / 256));
//                return;
//            }
//            j++;
//            writeit();
//        });
//    });
//}
//
//function runTest() {
//    console.log("starting test");
//    startTime = lastTime = new Date().getTime();
//    writeit();
//}



function average(prev, cur, count){
    return ((prev * (count - 1)) + cur) / count; 
}

function Show(){
    //console.log("creating Show", process.hrtime());
    this.startTime = Date.now();
    this.lastTime = this.startTime;
    this.frameRate = 40;
    this.framePeriod = 1000 / this.frameRate;
    this.running = true;
    this.frameCount = 1;
    this.avgFrameTime = 0;
    this.effects = [];
    this.networks = [];
}
Show.prototype.beginRun = function(){
};
Show.prototype.endRun = function(){
    //console.log("Show.endRun", process.hrtime());
    var frameDoneTime = Date.now();
    var frameTime = frameDoneTime - this.frameStartTime;

    this.avgFrameTime = average(this.avgFrameTime, frameTime, this.frameCount);

    var frameDiff = this.framePeriod - frameTime;

    if(frameDiff < 0){
        console.log("SLOW: frameTime: %d, framePeriod: %d, diff: %d", frameTime, this.framePeriod, frameDiff);
    } else {
        //console.log("frameDiff: %d ", frameDiff);
        Q.delay(frameDiff).then(this.run.bind(this));
    }

//    console.log("frameTime: %d ", frameTime);
    
    if(this.frameCount == 40){
        this.frameCount = 0;
        console.log("avg frame time: %d ", this.avgFrameTime);
    }
    this.frameCount++;
    
    
    
    //console.log("avg frame time: %d ", this.avgFrameTime);
    //TODO call this.run() again in some amount of time
    
};
Show.prototype.run = function(){

    if (!this.running) {
        return;
    }
    
    //console.log("Show.run starting", process.hrtime());
    
    this.frameStartTime = Date.now();
    this.targetTime = this.frameStartTime + this.framePeriod;
    
    var promise = Q(this)
        //.then(this.updateEffects())
        .then(this.sendData.bind(this))
        .then(this.endRun.bind(this))
        .done(function(){
            //console.log("Show.run finished", process.hrtime());
            
        });
//    .catch(function(err){
//            console.log("error in Show.run: ", err.toString());
//        });
//        .then(null, function(err){
//            console.log("Show.run ERROR: ", err);
//        });
};
Show.prototype.addEffect = function(effect){
    this.effects.push(effect);
};
Show.prototype.addNetwork = function(network){
    this.networks.push(network);
};
Show.prototype.updateEffects = function(){
    //console.log("update effects", process.hrtime());
};
Show.prototype.sendData = function(){
    var n = this.networks.length;
    
    //console.log("sending data to %s networks", n, process.hrtime());
    
    var promise = this.networks[0].sendData();

//    var result = Q();
//    this.networks.forEach(function(net){
//        result = result.then(net.sendData);
//    });
    
//    function get_all_the_things(things) {
//        return Q.all(this.networks.map(function(network) {
//            var deferred = Q.defer();
//            get_a_thing(thing, function(result) {
//                deferred.resolve(result);
//            });
//            return deferred.promise;
//        }));
//    }
    
//    return this.networks.reduce(function (soFar, net) {
//        return soFar.then(net.sendData);
//    }, Q())
    
//    return promise.then(function(){
//        console.log("done with networks");
//    }, function(err){
//        console.log("err in Show.sendData: ", err);
//    });
    
//    var resCount = 0;
//    for(var i = 0; i < n; i++){
//        var promise = this.networks[i].sendData();
//        
//    }
    return promise;
};

function Network(maxAddress, driver){
    this.buffer = new Buffer(maxAddress);
    this.lights = {};
    this.driver = driver;
    this.count = 0;
}
Network.prototype.addLight = function(light){
    this.lights[light.startAddress] = light;
    this.count++;
};
Network.prototype.sendData = function(){
    //console.log("network sending data to %s lights", this.count);
    for (var i in this.lights){
        var light = this.lights[i];
        // test for change
        if(!light.changed)
            continue;
        light.updateData(this.buffer);
        light.changed = false;
    }
    return this.driver.sendData(this.buffer);
};
Network.prototype.getByName = function(name){
    for (var i in this.lights){
        if(this.lights[i].name == name)
            return this.lights[i];
    }
    return null;
};

function RgbLight(startAddress, name){
    // required by Network
    this.startAddress = startAddress || 1;
    this.changed = true;
    
    this.name = name;
    this.channels = { };
    this.channels[startAddress] = {name: 'r', value: 0.0};
    this.channels[startAddress + 1] = {name: 'g', value: 0.0};
    this.channels[startAddress + 2] = {name: 'b', value: 0.0};
//    this.r = 0.0;
//    this.g = 0.0;
//    this.b = 0.0;
    this.gamma = colors.DIYC_DIM;
    this.intensity = 1.0;
    
}
// called by Network.sendData()
RgbLight.prototype.updateData = function(buffer){
    for(i in this.channels){
        buffer.writeUInt8(Math.floor(this.channels[i].value * this.intensity * 255), i - 1);
        //buffer[i - 1] = Math.floor(this.channels[i].value * this.intensity * 255);
    }
}
RgbLight.prototype.setIntensity = function(intensity){
    // use a gammafied intensity
    // intensity = this.gamma[Math.floor(intesity * 255)] / 255; 
    this.intensity = intensity;
    this.changed = true;
}
RgbLight.prototype.setValue = function(address, value){
    this.channels[address].value = value;
    this.changed = true;
}


//"/dev/ttyATH0"
function SolDriver(serialPort){
    var SerialPort = require("serialport").SerialPort;
    this.port = new SerialPort(serialPort, {
        baudrate: 115200
    });
    
//    var write = Q.denodeify(this.port.write);
//    var drain = Q.denodeify(this.port.drain);
    
//    this.sendData = function(buffer){
//        console.log("driver.sendData");
//        
//        var deferred = Q.defer();
//        this.port.write(b, function(err, result){
//            if(err) deferred.reject(new Error(err));
//            else deferred.resolve(result);
//            //console.log(err, result);
//        });
//        return deferred.promise;
//
////        return write(buffer)
////            .then(function(){
////                console.log("driver.wrote");
////            })
////            .then(drain)
////            .then(function(){
////                console.log("driver.drained");
////            });
//        
////        this.port.write(buffer, function (err, res) {
////            if(err) def.reject(newError(err));
////            console.log("driver.wrote");
////            this.port.drain(function(){
////                console.log("drained");
////                cb();
////            });
////        });
//    };
}
SolDriver.prototype.sendData = function(buffer){
    var self = this;
    
    //console.log("driver.sendData", process.hrtime());

    var deferred = Q.defer();
    self.port.write(buffer, function(err, result){
        //console.log("driver.wrote", process.hrtime());
        if(err) deferred.reject(new Error(err));
        else {
            self.port.drain(function(err, result){
                //console.log("driver.drained", process.hrtime());
                if(err) deferred.reject(new Error(err));
                else deferred.resolve(result);
            });
        }
    });
    return deferred.promise;

};


/////// APP ///////

var NUM_CHANNELS = 31;
var NUM_ADDRESSES = 93;

var CHANNEL_NAMES = {
    1: 'nose_front',
    2: 'nose_mid',
    3: 'nose_rear',
    4: 'nose_sides_lower',
    5: 'nose_sides_upper',
    6: 'wings',
    7: '',
    8: '',
    9: 'windshield',
    10: 'beak_front',
    11: 'beak_rear',
    12: 'ray_mid_inner',
    13: 'ray_midleft_inner',
    14: 'ray_midright_inner',
    15: 'ray_left_inner',
    16: 'ray_right_inner',
    17: 'ray_mid_outer',
    18: 'ray_midleft_outer',
    19: 'ray_midright_outer',
    20: 'ray_left_outer',
    21: 'ray_right_outer',
    22: 'arc',
    23: 'sides_front',
    24: 'sides_mid',
    25: 'sides_rear',
    26: 'rails_front',
    27: 'rails_mid',
    28: 'rails_rear',
    29: 'canopy_front',
    30: 'canopy_rear',
    31: 'stairs'
};


SolDriver.prototype.writeit = function() {

    var self = this;
    var b = new Buffer(93);
    var deferred = Q.defer();
    console.log("driver.writing", process.hrtime());
    self.port.write(b, function(err, result){
        console.log("driver.wrote", process.hrtime());
        if(err) deferred.reject(new Error(err));
        else {
            self.port.drain(function(err, result){
                console.log("driver.drained", process.hrtime());
                if(err) deferred.reject(new Error(err));
                else deferred.resolve(result);
            });
        }
        //console.log(err, result);
    });
    var q = deferred.promise;
    return q;

}

var solDriver = new SolDriver(config.SERIAL_PORT);
solDriver.port.on("open", function () {
    console.log('serial open');
    main();
    //runTest();
});



function main () {
    var solNet = new Network(NUM_ADDRESSES, solDriver);

    var ls = {};

    for (var i = 1; i <= NUM_CHANNELS; i++){
        var l = new RgbLight(i * 3 - 2);
        l.name = CHANNEL_NAMES[i];
        solNet.addLight(l);
    }

    var show = new Show();
    show.addNetwork(solNet);
    show.addEffect();
    show.run();
    
//    solDriver.port.write("hello arduino", function(){
//        console.log("wrote");
//    });
    
    //console.log("reached the end of main()");
}

function runTest(){
    solDriver.writeit();
//    var q = Q.fcall(solDriver.port.write, b)
//    .done(function(result){
//        return console.log("driver.wrote", result);
//    });
//
//    
//    solDriver.port.write(b, function(err, result){
//        console.log(err, result);
//    });
//    var promise = solDriver.sendData(b)
//    .done(function(result){
//        return console.log("driver.wrote", result);
//    });
//    
//    console.log("promise?",Q.isPromise(q));
//    
//    q.done(function(result){
//        return console.log("driver.wrote", result);
//    });
}


