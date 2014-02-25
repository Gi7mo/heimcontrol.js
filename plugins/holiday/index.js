if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(['duino', 'cron', 'suncalc'], function(duino, cron, suncalc) {
	var Holiday = function(app) {

		this.name = 'Holiday';
		this.collection = 'Holiday';
		this.icon = 'fa fa-plane';
		this.excludeFromHomeListing = true;

		this.activeActorIds = {};
		this.actors = [];
		this.sensors = [];
		this.actorsOn = false;
		this.debug = false;

		this.app = app;
		this.id = this.name.toLowerCase();

		this.init();
		var that = this;
		app.get('events').on('settings-saved', function() {
			that.init();
		});
	};

	Holiday.prototype.init = function() {
		var that = this;
		var init = arguments.callee;

		// reset all arrays as we recall init() when
		// something changed in our settings
		this.activeActorIds = {};
		this.actors = [];
		this.sensors = [];

		var arduinoPlugin;
		this.app.get('plugin helper').getPluginList(function(err, plugins) {
			for(var i in plugins) {
				if(plugins[i].id == 'arduino') {
					arduinoPlugin = plugins[i];
				}
			}
			// wait for the arduino plugin be inited
			if(!arduinoPlugin) {
				setTimeout(function() {init.call(that); }, 500);
				return false;
			}

			that.app.get('db').collection(arduinoPlugin.collection, function(err, collection) {
				collection.find({
					method: 'itrcswitch'
				}).toArray(function(err, result) {
					if((!err) && (result.length > 0)) {
						result.forEach(function(item) {
							that.actors.push(item);
						});
					}
				});

				collection.find({
					method: 'sensor',
					graph: 'on'
				}).toArray(function(err, result) {
					if((!err) && (result.length > 0)) {
						result.forEach(function(item) {
							that.sensors.push(item);
						});
					}
				});
			});

			that.app.get('db').collection(that.collection, function(err, collection) {
				collection.find({}).toArray(function(err, result) {
					if((!err) && (result.length == 1)) {
						if(result[0].active == 'on') {
							var cronJob = require('cron').CronJob;
							var ObjectID = require('mongodb').ObjectID;
							//* * * * * * // every second
							new cronJob('*/3 * * * *', function() {
								var times = suncalc.getTimes(new Date(), result[0].lat, result[0].lng);
								var now = new Date();

								var offTimeParts = result[0].off.split('-');
								var offStart = new Date();
								offStart.setHours(offTimeParts[0].split(':')[0]);
								offStart.setMinutes(offTimeParts[0].split(':')[1]);
								offStart.setSeconds(0);

								var offEnd = new Date();
								offEnd.setHours(offTimeParts[1].split(':')[0]);
								offEnd.setMinutes(offTimeParts[1].split(':')[1]);
								offEnd.setSeconds(0);

								var sunsetStart = new Date(Date.parse(times.sunsetStart));
								var night = new Date(Date.parse(times.night));

								var actorIds = [];
								for(var i in result[0].actors) {
									actorIds.push(new ObjectID(i));
								}

								if(that.debug) {
									var logData = {
										now: now,
										offStart: offStart,
										offEnd: offEnd,
										sunsetStart: sunsetStart,
										night: night,
										actorIds: actorIds,
										timeAllowedToSwitchOn: false,
										switchedOn: false,
										timeAllowedToSwitchOff: false,
										switchedOff: false,
										avg: 0,
										rescue: false,
										items: [],
										sensor: result[0].sensor
									};
								}

								var switchActors = function(on) {
									// don't do this more than once!
									if(that.actorsOn != on) {
										that.actorsOn = on;
										for(var i in actorIds) {
											arduinoPlugin.itrcswitch({
												id: actorIds[i],
												value: (on) ? 1 : 0
											});
										}
									}
								}

								if(sunsetStart < now && night > now && !that.actorsOn) {
									if(that.debug) {
										logData.timeAllowedToSwitchOn = true;
									}
									that.app.get('db').collection(arduinoPlugin.dataCollection, function(err, sensorCollection) {
										sensorCollection.find({'id': new ObjectID(result[0].sensor)}).sort({ms: -1}).limit(10).toArray(function(err, items) {
											if(!err) {
												if(that.debug) {
													logData.data = items;
												}
												var total = 0;
												for(var i in items) {
													total += parseFloat(items[i].value);
												}
												var avg = total / items.length;
												if(that.debug) {
													logData.avg = avg;
												}
												if(avg <= parseInt(result[0].on)) {
													if(that.debug) {
														logData.switchedOn = true;
													}
													switchActors(true);
												}
											}
											if(that.debug) {
												that.app.get('db').collection('log_data').insert(logData);
											}
										})
									});
								} else if(that.actorsOn && now > night && offStart < now && offEnd > now) {
									if(that.debug) {
										logData.timeAllowedToSwitchOff = true;
									}
									var rand = Math.round(Math.random() * 100);
									if(rand % 5 == 0) {
										if(that.debug) {
											logData.switchedOff = true;
										}
										switchActors(false);
									}
									if(that.debug) {
										that.app.get('db').collection('log_data').insert(logData);
									}
								} else if(that.actorsOn && now > offEnd) {
									if(that.debug) {
										logData.rescue = true;
									}
									switchActors(false);
									if(that.debug) {
										that.app.get('db').collection('log_data').insert(logData);
									}
								} else if(that.debug) {
									that.app.get('db').collection('log_data').insert(logData);
								}
								
							}, function() {}, true);
						}
					}
				});
			});
		});

		this.app.get('db').collection(this.collection, function(err, collection) {
			collection.find({}).toArray(function(err, result) {
				if((!err) && (result.length == 1)) {
					for(var i in result[0].actors) {
						that.activeActorIds[i] = true;
					}
				}
			})
		});
	};

	/**
	 * Manipulate the items array before render
	 *
	 * @method beforeRender
	 * @param {Array} items An array containing the items to be rendered
	 * @param {Function} callback The callback method to execute after manipulation
	 * @param {String} callback.err null if no error occured, otherwise the error
	 * @param {Object} callback.result The manipulated items
	 */
	Holiday.prototype.beforeRender = function(items, callback) {
		var that = this;
		if(items.length == 0) {
			items.push({});
		}

		var actors = that.actors;
		for(var i in actors) {
			if(typeof that.activeActorIds[actors[i]._id] != 'undefined') {
				actors[i].active = true;
			} else {
				actors[i].active = false;
			}
		}

		return callback(null, items, {'actors': actors, 'sensors': that.sensors});
	}

	var exports = Holiday;

	return exports;
});