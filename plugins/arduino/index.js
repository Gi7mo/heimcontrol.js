if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define([ 'duino' ], function(duino) {

  /**
   * Arduino Plugin. This plugin is able to control an Arduino that is attached to the USB port of the Raspberry PI
   *
   * @class Arduino
   * @param {Object} app The express application
   * @constructor 
   */
  var Arduino = function(app) {

    this.name = 'Arduino';
    this.collection = 'Arduino';
    this.dataCollection = 'sensor_data';
    this.icon = 'fa fa-external-link';

    this.app = app;
    this.id = this.name.toLowerCase();
    this.board = new duino.Board();

    this.pins = {};
    this.pluginHelper = app.get('plugin helper');

    this.values = {};

    this.sensorList = [];
    this.sensors = {};

    this.init();

    this.collectedSensorData = {}

    var that = this;

    app.get('events').on('settings-saved', function() {
      that.init();
    });
    
    app.get('sockets').on('connection', function(socket) {
      // Arduino toggle
      socket.on('arduino-rcswitch', function(data) {
        that.rcswitch(data);
      });
      socket.on('arduino-itrcswitch', function(data) {
        that.itrcswitch(data);
      });
      // Arduino toggle
      socket.on('arduino-irremote', function(data) {
        that.irremote(data);
      });
      // Arduino toggle
      socket.on('arduino-led', function(data) {
        that.led(data);
      });
    });
    
  };

  /**
   * Toggle an Arduino port
   * 
   * @method rcswitch
   * @param {Object} data The websocket data from the client
   * @param {String} data.id The ID of the database entry from the RC switch to use
   * @param {String} data.value The value to set (0 or 1)
   */
  Arduino.prototype.rcswitch = function(data) {

    var that = this;
    this.pluginHelper.findItem(that.collection, data.id, function(err, item, collection) {
      if ((!err) && (item)) {
        // Inform clients over websockets
        that.app.get('sockets').emit('arduino-rcswitch', data);

        item.value = (parseInt(data.value));
        that.values[item._id] = item.value;

        // Create RC object
        if (!that.pins[item.pin]) {
          that.pins[item.pin] = new duino.RC({
            board: that.board,
            pin: parseInt(item.pin)
          });
        }

        // Send RC code
        if (item.value) {
          return that.pins[item.pin].triState(item.code + "FF0F");
        } else {
          return that.pins[item.pin].triState(item.code + "FF00");
        }
      } else {
        console.log(err);
      }
    });
  };

  /**
   * Toggle an Arduino port
   * 
   * @method rcswitch
   * @param {Object} data The websocket data from the client
   * @param {String} data.id The ID of the database entry from the RC switch to use
   * @param {String} data.value The value to set (0 or 1)
   */
  Arduino.prototype.itrcswitch = function(data) {

    var that = this;
    this.pluginHelper.findItem(that.collection, data.id, function(err, item, collection) {
      if ((!err) && (item)) {
        // Inform clients over websockets
        that.app.get('sockets').emit('arduino-itrcswitch', data);

        item.value = (parseInt(data.value));
        that.values[item._id] = item.value;

        // Create RC object
        if (!that.pins[item.pin]) {
          that.pins[item.pin] = new duino.RC({
            board: that.board,
            pin: parseInt(item.pin)
          });
        }

				var houseCodes = {
					'A': '0000',
					'B': 'F000',
					'C': '0F00',
					'D': 'FF00',
					'E': '00F0',
					'F': 'F0F0',
					'G': '0FF0',
					'H': 'FFF0',
					'I': '000F',
					'J': 'F00F',
					'K': '0F0F',
					'L': 'FF0F',
					'M': '00FF',
					'N': 'F0FF',
					'O': '0FFF',
					'P': 'FFFF'
				};

				var deviceCodes = {
					1: '0000',
					2: 'F000',
					3: '0F00',
					4: 'FF00',
					5: '00F0',
					6: 'F0F0',
					7: '0FF0',
					8: 'FFF0',
					9: '000F',
					10: 'F00F',
					11: '0F0F',
					12: 'FF0F',
					13: '00FF',
					14: 'F0FF',
					15: '0FFF',
					16: 'FFFF'
				};

        if(item.led) {
          led = new duino.Led({
            board: that.board,
            pin: parseInt(item.led)
          });

          // uhm, yeah... don't ask me why this is
          // but the led turns on!
          led.off();
        }

        // Send RC code
        if (item.value) {
          that.pins[item.pin].triState(houseCodes[item.housecode] + deviceCodes[item.devicecode] + "0FFF");
        } else {
          that.pins[item.pin].triState(houseCodes[item.housecode] + deviceCodes[item.devicecode] + "0FF0");
        }
        if(item.led) {
          // uhm, yeah... don't ask me why this is
          // but the led turns off!
          led.on();
        }

      } else {
        console.log(err);
      }
    });
  };

  /**
   * Send an IR remote code
   * 
   * @method irremote
   * @param {Object} data The websocket data from the client
   * @param {String} data.id The ID of the database entry from the IR to use
   * @param {String} data.value The value to set (0 or 1)
   */
  Arduino.prototype.irremote = function(data) {

    var that = this;
    this.pluginHelper.findItem(that.collection, data.id, function(err, item, collection) {
      if ((!err) && (item)) {
        var ir = new duino.IR({
          board: that.board
        });
        ir.send(item.irtype, item.ircode, item.irlength);
      } else {
        console.log(err);
      }
    });
  };

  /**
   * Turn an LED light on
   * 
   * @method led
   * @param {Object} data The websocket data from the client
   * @param {String} data.id The ID of the database entry from the LED to use
   * @param {String} data.value The value to set (0 (off) or 1 (on))
   */
  Arduino.prototype.led = function(data) {

    var that = this;
    this.pluginHelper.findItem(that.collection, data.id, function(err, item, collection) {
      if ((!err) && (item)) {
        // Inform clients over websockets
        that.app.get('sockets').emit('arduino-led', data);

        item.value = (parseInt(data.value));
        that.values[item._id] = item.value;

        // Create LED object
        if (!that.pins[item.pin]) {
          that.pins[item.pin] = new duino.Led({
            board: that.board,
            pin: parseInt(item.pin)
          });
        }

        // Change LED status
        if(item.value == "1"){
          that.pins[item.pin].on();
        }else {
          that.pins[item.pin].off();
        }
      } else {
        console.log(err);
      }
    });
  };

  Arduino.prototype.api = function(req, res, next) {
    var that = this;
    var ObjectID = require('mongodb').ObjectID;
    if(req.method == 'GET') {
      if(req.query.type == 'graph') {
        if(typeof req.query.sensor != 'undefined') {
          that.app.get('db').collection(that.dataCollection, function(err, collection) {
            collection.find({"id": new ObjectID(req.query.sensor)}).sort({ms: 1}).limit(60 * 60 * 24).toArray(function(err, items) {
              if(!err) {
                for(var i in items) {
                  items[i].v = parseFloat(items[i].value);
                }
                that.beforeRender(items, function() {
                  res.send(200, items);
                });
              } else {
                res.send(500, '[]');
              }
            })
          });
        } else {
          next();
        }
      } else {
        next();
      }
    } else {
      next();
    }
  };

  /**
   * Initialize the sensors attached to the Arduino
   * 
   * @method init
   */
  Arduino.prototype.init = function() {

    var that = this;
    this.sensorList.forEach(function(sensor) {
      sensor.removeAllListeners();
    });
    this.sensorList = [];

    this.sensors = {};
    return this.app.get('db').collection(that.collection, function(err, collection) {
    this.app.get('db').collection(that.collection, function(err, collection) {
      collection.find({
        method: 'sensor'
      }).toArray(function(err, result) {
        if ((!err) && (result.length > 0)) {
          result.forEach(function(item) {
            that.sensors[item._id] = item;
            var sensor = new duino.Sensor({
              board: that.board,
              pin: item.pin,
              throttle: 500
            });
            sensor._id = item._id;
            sensor.on('read', function(err, value) {
              item = that.sensors[this._id + ''];
              if (isNaN(item.value)) {
                item.value = 0;
              }
              var val = parseFloat(eval(item.formula.replace('x', +value)));
              item.value = parseFloat(((item.value + val) / 2).toFixed(2));
              that.values[item._id] = item.value;

              if(item.graph) {
                if(typeof that.collectedSensorData[item._id] == 'undefined') {
                  that.collectedSensorData[item._id] = [];
                }

                that.collectedSensorData[item._id].push(item.value);
                // collect for a howl minute
                if(that.collectedSensorData[item._id].length >= 120) {
                   var median = function(ab) {
                     ab.sort(function(a,b) {return a - b;});
                     var half = Math.floor(ab.length/2);
                     if(ab.length % 2) {
                       return ab[half];
                     } else {
                       return (ab[half-1] + ab[half]) / 2.0;
                     }
                   };

                   for(var i in that.collectedSensorData[item._id]) {
                     var tmp = parseFloat(that.collectedSensorData[item._id][i]);
                     if(!isNaN(tmp)) {
                       that.collectedSensorData[item._id][i] = tmp;
                     } else {
                       delete that.collectedSensorData[item._id][i];
                     }
                   }
                   // use median to flatten peaks
                   var avg = median(that.collectedSensorData[item._id]).toFixed(2);
                   that.collectedSensorData[item._id] = [];
                   that.app.get('db').collection(that.dataCollection).insert({
                     id: item._id,
                     now: new Date().toLocaleString(),
                     value: avg,
                     ms: new Date().getTime()
                   });
                }
              }

              that.app.get('sockets').emit('arduino-sensor', {
                id: item._id,
                value: item.value
              });
            });
            that.sensorList.push(sensor);
          });
        }
      });
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
  Arduino.prototype.beforeRender = function(items, callback) {
    var that = this;
    items.forEach(function(item) {
      item.value = that.values[item._id] ? that.values[item._id] : 0;
    });
    return callback(null, items);
  }

  var exports = Arduino;

  return exports;

});
