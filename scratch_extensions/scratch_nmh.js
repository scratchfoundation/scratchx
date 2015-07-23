// Communicate with the Scratch Native Messaging Host through an extension.
window.ScratchDeviceHost = new (function () {
    var self = this;
    var isConnected = false;

    self.isAvailable = function () {
        return isConnected;
    };

    if (!window.chrome) return;

    var extensionID = 'clmabinlolakdafkoajkfjjengcdmnpm';
    var callNumber = 0;
    var port = chrome.runtime.connect(extensionID);
    console.assert(port, "Failed to create port");

    var messageHandlers = {};
    port.onMessage.addListener(function (message) {
        var messageName = message[0];
        if (messageName == "@") {
            var callbackToken = message[1];
            var returnValue = message[2];
            var callback = pendingCallbacks[callbackToken];
            delete pendingCallbacks[callbackToken];
            if (callback) callback(returnValue);
        } else {
            var handler = messageHandlers[messageName];
            if (handler) {
                handler(message);
            } else {
                console.log("SDH-Page: Unrecognized message " + message);
            }
        }
    });

    messageHandlers["serialRecv"] = function (message) {
        var path = message[1];
        var data = message[2];

        var device = serialDevices[path];
        if (device && device.receiveHandler) {
            device.receiveHandler(data);
        }
    };

    messageHandlers["serialError"] = function (message) {
        var path = message[1];
        var errorMessage = message[2];

        var device = serialDevices[path];
        if (device && device.errorHandler) {
            device.errorHandler(errorMessage);
        }
    };

    var pendingCallbacks = {};
    function sendMessage(message, callback) {
        var callbackToken = (callNumber++).toString();
        pendingCallbacks[callbackToken] = callback;
        port.postMessage([callbackToken, message]);
    }

    sendMessage(["version"], function (version) {
        isConnected = true;
    });

    self.hid_list = function (callback, opt_vendorID, opt_productID) {
        var message = ["hid_list", opt_vendorID || 0, opt_productID || 0];
        sendMessage(message, function (deviceList) {
            if (callback) callback(deviceList);
        });
    };
    self.hid_open = function (path, callback) {
        var message = ["hid_open_raw", path];
        sendMessage(message, function (result) {
            var device;
            if (result) {
                device = new HidDevice(path);
                ScratchProxies.AddHidProxies(device);
                var claimMessage = ["claim", path];
                sendMessage(claimMessage);
            }
            if (callback) callback(device);
        });
    };
    self.serial_list = function (callback) {
        sendMessage(["serial_list"], function (deviceList) {
            if (callback) callback(deviceList);
        });
    };
    self.serial_open = function (path, opts, callback) {
        var message = ["serial_open_raw", path];
        if (opts) message.push(opts);
        sendMessage(message, function (result) {
            var device;
            if (result) {
                device = new SerialDevice(path);
                ScratchProxies.AddSerialProxies(device);
                var claimMessage = ["claim", path];
                sendMessage(claimMessage);
            }
            if (callback) callback(device);
        });
    };
    self.reset = function () {
        sendMessage(["reset"]);
    };
    self.version = function (callback) {
        sendMessage(["version"], function (result) {
            if (callback) callback(result);
        });
    };

    function HidDevice(path) {
        var self = this;

        self.write_raw = function (arrayBuffer, callback) {
            var message = ["write_raw", path, arrayBuffer];
            sendMessage(message, function (result) {
                if (callback) callback(result);
            });
        };
        self.send_feature_report_raw = function (arrayBuffer, callback) {
            var message = ["send_feature_report_raw", path, arrayBuffer];
            sendMessage(message, function (result) {
                if (callback) callback(result);
            });
        };
        self.read_raw = function (size, callback) {
            var message = ["read_raw", path, size];
            sendMessage(message, function (data) {
                if (callback) callback(data);
            });
        };
        self.get_feature_report_raw = function (size, callback) {
            var message = ["get_feature_report_raw", path, size];
            sendMessage(message, function (data) {
                if (callback) callback(data);
            });
        };
        self.set_nonblocking = function (flag, callback) {
            var message = ["set_nonblocking", path, flag];
            sendMessage(message, function (result) {
                if (callback) callback(result);
            });
        };
        self.close = function () {
            sendMessage(["close", path]);
        };
    }

    var serialDevices = {}; // path -> SerialDevice
    function SerialDevice(path) {
        var self = this;

        self.receiveHandler = undefined;
        self.errorHandler = undefined;

        serialDevices[path] = self;

        self.send_raw = function (data) {
            var message = ["serial_send_raw", path, data];
            sendMessage(message);
        };
        self.close = function () {
            var message = ["serial_close", path];
            sendMessage(message);
        };
        self.is_open = function (callback) {
            var message = ["serial_is_open", path];
            sendMessage(message, function (result) {
                if (callback) callback(result);
            });
        };
        self.set_receive_handler_raw = function (callback) {
            self.receiveHandler = callback;
            var message = ["serial_recv_start", path];
            sendMessage(message);
        };
        self.set_error_handler = function (callback) {
            self.errorHandler = callback;
        };
    }
})();
