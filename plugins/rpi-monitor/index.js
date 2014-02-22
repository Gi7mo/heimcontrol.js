if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(['http'], function(http) {
	var RPiMonitor = function(app) {
		this.name = 'RPi-Monitor';
		this.collection = 'RPiMonitor';
		this.icon = 'icon-desktop';
		this.excludeFromHomeListing = true;

		this.app = app;
		this.id = this.name.toLowerCase();

		var that = this;
		
	};

	RPiMonitor.prototype.api = function(req, res, next) {
		var that = this;
		var collectedData = {};
		if(req.method == 'GET') {
			if(req.query.mode == 'json') {
				var options = {
					host: 'localhost',
					port: 8888,
					path: '/' + req.query.type + '.json',
					method: 'GET'
				};
				http.get(options).on('response', function(response) {
					response.on('data', function(data) {
						that.beforeRender(data, function() {
							res.send(200, data);
						});
					});
				});
			} else if(req.query.mode == 'rrd') {
				var options = {
					host: 'localhost',
					port: 8888,
					path: '/stat/' + req.query.type + '.rrd',
					method: 'GET'
				};
				collectedData[req.query.type] = null;
				http.get(options).on('response', function(response) {
					response.on('end', function() {
						var data = collectedData[req.query.type];
						that.beforeRender(data, function() {
							res.setHeader('Content-Type', 'application/octet-stream');
							res.send(200, data);
						});
					});
					response.on('data', function(chunk) {
						if(collectedData[req.query.type] == null) {
							collectedData[req.query.type] = chunk;
						} else {
							collectedData[req.query.type] = Buffer.concat([collectedData[req.query.type], chunk]);
						}
					});
				});
			} else {
				next();
			}
		} else {
			next();
		}
	};

	RPiMonitor.prototype.beforeRender = function(items, callback) {
		return callback(null, items);
	};

	var exports = RPiMonitor;

	return exports;
});