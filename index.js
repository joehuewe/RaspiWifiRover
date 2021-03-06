var { execFile } = require('child_process');
var http = require('http');
var os = require('os');
var fs = require('fs');
var port = 80;
var websocket = require('ws');
var url = require('url');
var SerialPort = require('serialport');

var rover = {
	propel: {
		y: 64,
		x: 64,
	},
	cam: {
		x: 0,
		y: 0,
	}
};
var serial = new SerialPort('/dev/serial0', {
	baudRate: 9600,
});

class saberToothPacketSerial {
	constructor (address){
		this.address = address;
		this.mask = 127;
	}
	update (command, data) {
		this.command = command;
		this.data = data;
		let checksum = ((this.address + this.command + this.data) & this.mask);
		let newUpdate = Buffer.from([this.address, this.command, this.data, checksum]);
		serial.write(newUpdate);
	}
	setMinVolt (data) {
		this.command = 2;
		this.data = (data - 6) * 5;
		console.log(this.data);
	}
}

var server = http.createServer((req, res) => {
	var q = url.parse(req.url, true);
	var filename;
	if (q.pathname === '/') {
		filename = 'index.html';
	} else { filename = '.' + q.pathname;
	}
	fs.readFile(filename, function(err, data) {
		if (err) {
			res.writeHead(404, {'Content-Type': 'text/html'});
			return res.end('404 Not Found');
		}
    	res.writeHead(200, {'Content-Type': 'text/html'});
    	res.write(data);
    	res.end();
	});
});
var wss = new websocket.Server({server});

wss.on('connection', function open(ws) {
	var saber = new saberToothPacketSerial(128);
	saber.setMinVolt(9.2);
	//console.log('connection established');
	ws.send('connected');
	ws.on('message', function incoming(message) {
		try {
			rover = JSON.parse(message);
		} catch(e) {
			return;
		}
		console.log(rover);
		this.send('Acknowledged command: ' + JSON.stringify(rover));
		saber.update(12, rover.propel.y * 1.26 + 64);
		saber.update(13, rover.propel.x * 1.26 + 64);

	});
});



server.listen(port);
process.on("SIGINT", () => {
      server.close();
      process.exit();
});
