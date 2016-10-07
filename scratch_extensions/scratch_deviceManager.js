// Communicate with the Scratch Device Manager through Socket.IO
window.ScratchDeviceManager = new (function () {
    var instance = this;
    var sockets = [];

    // Assume it's OK until we find out otherwise
    var isConnected = true;

    // device-manager.scratch.mit.edu = 127.0.0.1
    instance.deviceManagerHost = 'https://device-manager.scratch.mit.edu:3030';

    // work around https://github.com/socketio/socket.io-client/issues/812
    function connectNamespace(namespace) {
        return io(instance.deviceManagerHost + namespace, {forceNew: true});
    }

    function onClose(){
        for(var i=0; i<sockets.length; i++){
            sockets[i].disconnect();
        } 
    }

    window.onbeforeunload = onClose;

    instance.device_list = function (ext_type, ext_name, device_spec, callback) {
        var url = instance.deviceManagerHost + '/' + ext_type + '/list';
        var data = {
            name: ext_name,
            spec: device_spec
        };
        $.ajax(url, {
            data: {data: JSON.stringify(data)},
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                isConnected = true;
                if (data.constructor == Array) {
                    callback(data, ext_type, ext_name);
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                isConnected = false;
            }
        });
    };

    // Attempt to open a device-specific socket connection to the Device Manager.
    // This must call `callback` exactly once no matter what.
    // The callback will receive a connected socket on success or `null` on failure.
    instance.socket_open = function (ext_name, deviceType, deviceId, callback) {
        function onDeviceWasOpened () {
            // If this is the first event on this socket then respond with success.
            if (clearOpenTimeout()) {
                callback(socket);
            }
        }

        function onDisconnect () {
            var socketIndex = sockets.indexOf(socket);
            if (socketIndex >= 0) {
                sockets.splice(socketIndex, 1);
            }
            // If this is the first event on this socket then respond with failure.
            if (clearOpenTimeout()) {
                callback(null);
            }
        }

        function onTimeout () {
            // This will trigger `onDisconnect()`
            socket.disconnect();
        }

        // If the timeout is still pending, clear it and return true. Otherwise, return false.
        // Callers can use the return value to determine whether they are the first to respond on this socket.
        function clearOpenTimeout () {
            if (openTimeout !== null) {
                clearTimeout(openTimeout);
                openTimeout = null;
                return true;
            }
            else {
                return false;
            }
        }

        var socket = connectNamespace('/' + deviceType);
        sockets.push(socket);

        socket.on('deviceWasOpened', onDeviceWasOpened);
        socket.on('disconnect', onDisconnect);
        var openTimeout = setTimeout(onTimeout, 10 * 1000);

        socket.emit('open', {deviceId: deviceId, name: ext_name});
    };

    instance.isConnected = function () {
        return isConnected;
    };
})();
