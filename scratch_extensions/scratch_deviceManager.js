// Communicate with the Scratch Device Manager through Socket.IO
window.ScratchDeviceManager = new (function () {
    var self = this;

    // device-manager.scratch.mit.edu = 127.0.0.1
    self.deviceManagerHost = 'https://device-manager.scratch.mit.edu:3030';

    // work around https://github.com/socketio/socket.io-client/issues/812
    function connectNamespace(namespace) {
        return io(self.deviceManagerHost + namespace, {forceNew: true});
    }

    self.wedo2_list = function (callback) {
        $.ajax(self.deviceManagerHost + '/wedo2/list', {
            dataType: 'text',
            success: function (data, textStatus, jqXHR) {
                var deviceList = JSON.parse(data);
                if (deviceList.constructor == Array) {
                    callback(deviceList);
                }
            }
        });
    };

    // TODO: handle multiple devices
    self.wedo2_open = function (deviceId, callback) {
        var socket = connectNamespace('/wedo2');
        var pluginDevice = new RawWeDo2(deviceId, socket);
        socket.on('deviceWasOpened', function (event) {
            callback(pluginDevice);
        });
        socket.emit('open', {deviceId: deviceId});
    };

    function RawWeDo2(deviceId, socket) {
        var WeDo = this;
        var eventHandlers = {};

        WeDo.close = function() {
            socket.close();
        };

        WeDo.setMotorOn = function(motorIndex, power) {
            socket.emit('motorOn', {motorIndex:motorIndex, power:power});
        };

        WeDo.setMotorOff = function(motorIndex) {
            socket.emit('motorOff', {motorIndex:motorIndex});
        };

        WeDo.setMotorBrake = function(motorIndex) {
            socket.emit('motorBrake', {motorIndex:motorIndex});
        };

        WeDo.setLED = function(rgb) {
            socket.emit('setLED', {rgb:rgb});
        };

        WeDo.playTone = function(tone, durationMs) {
            socket.emit('playTone', {tone:tone, ms:durationMs});
        };

        WeDo.stopTone = function() {
            socket.emit('stopTone');
        };

        function setHandler(eventName, handler) {
            if (eventHandlers.hasOwnProperty(eventName)) {
                var oldHandler = eventHandlers[eventName];
                if (oldHandler) {
                    socket.removeListener(eventName, oldHandler);
                }
            }
            if (handler) {
                socket.on(eventName, handler);
            }
            eventHandlers[eventName] = handler;
        }

        // function handler(event) { access event.sensorName and event.sensorValue }
        WeDo.setSensorHandler = function (handler) {
            setHandler('sensorChanged', handler);
        };

        WeDo.setDeviceWasClosedHandler = function (handler) {
            // TODO: resolve this ambiguity
            setHandler('disconnect', handler);
            setHandler('deviceWasClosed', handler);
        };
    }
})();
