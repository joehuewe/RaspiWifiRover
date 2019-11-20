const { execFile } = require('child_process');
const http = require('http');
const os = require('os');
const fs = require('fs');
const port = 80;
const websocket = require('ws');
const url = require('url');
const SerialPort = require('serialport');
var rover = {
	y: 64,
	x: 64,
};
const serial = new SerialPort('/dev/ttyUSB0', {
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
	stop () {
		update (12, 64);
		update (13, 64);
	}
}

const child = execFile('/usr/local/bin/mjpg_streamer', ['-i', 'input_uvc.so', '-o', 'output_http.so -p 8090 -w ./home/pi/raspiRover/webcam/'], (error, stdout, stderr) => {
	if (error) {
		console.log(error);
		return;
	}
	console.log(stdout);
});

const server = http.createServer((req, res) => {
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

const wss = new websocket.Server({server});

wss.on('connection', function open(ws) {
	let saber = new saberToothPacketSerial(128);
	//console.log('connection established');
	ws.send('connected');
	ws.on('message', function incoming(message) {
		try {
			rover = JSON.parse(message);
		} catch(e) {
			return;
		}
		//console.log(rover);
		saber.update(12, rover.y);
		saber.update(13, rover.x);

	});
});

server.listen(port);
//console.log(`http://${os.hostname()}.local`);
process.on("SIGINT", () => {
      server.close();
      process.exit();
});
