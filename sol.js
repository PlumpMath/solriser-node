var osc = require("osc");
var SerialPort = require("serialport").SerialPort
var serialPort = new SerialPort("/dev/ttyATH0", {
  baudrate: 115200
});

// Create an osc.js UDP Port listening on port 57121.
var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 8998
});

// Listen for incoming OSC bundles.
udpPort.on("bundle", function (oscBundle) {
    console.log("OSC IN:", oscBundle);
});

udpPort.on("message", function(msg){
   console.log("OSC IN:", msg);
});

// Open the socket.
udpPort.open();
console.log("listening for OSC on UDP port 8998");

serialPort.on("open", function () {
  console.log('open');
  serialPort.on('data', function(data) {
    console.log('data received: ' + data);
  });
  serialPort.write("hello arduino!\n", function(err, results) {
    console.log('err ' + err);
    console.log('results ' + results);
  });
});

// Send an OSC message to, say, SuperCollider
//udpPort.send({
//    address: "/s_new",
//    args: ["default", 100]
//}, "127.0.0.1", 57110);

