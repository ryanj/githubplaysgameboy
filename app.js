var express = require('express');
var app = express();
var path = require('path')
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , fs = require('fs');

var cc = require('config-multipaas');
var config = cc().addFile('config.json');

var allowedInputs = config.get('allowed_inputs');
var rom = __dirname + '/' + config.get('rom');

server.listen(config.get('PORT'), config.get('IP'));

app.set('view engine', 'ejs');
app.get('/', function(req, res) {
  res.render('index', {title: config.get('title'), url: config.get('HOSTNAME')});
});
app.get('/master', function(req, res) {
  res.render('master', {title: config.get('title'), url: config.get('HOSTNAME')});
});
app.use(express.static(path.join(__dirname, 'public')));

io.sockets.on('connection', function (socket) {
	socket.on('master:ready', function (data) {
		fs.readFile(rom, function(err, original_data){
		    var rom = original_data.toString('base64');
		    socket.emit('master:loadgame', {
		    	file: rom
		    });
		});
	});
	socket.on('keypress', function (data) {
		if (allowedInputs.indexOf(data.key) <= -1)
			return socket.disconnect();
		socket.get('username', function (err, name) {
			if (err) {
				return socket.disconnect();
			}
			socket.broadcast.emit('master:push', {name: name, key: data.key});
		});
	});
	socket.emit('io:askusername', {});
	socket.on('io:username', function (data) {
		if (!data.name || !data.name.trim().length)
			return socket.disconnect();
		socket.set('username', data.name, function () {
			socket.emit('io:launchPlay', {name: data.name, inputs: allowedInputs});
		});
	})
});
