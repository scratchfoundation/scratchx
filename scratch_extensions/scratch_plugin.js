window.ScratchPlugin = new (function () {
    var self = this;

    var pluginName = 'Scratch Device Plugin'; // will be 'Scratch Plugin for Devices'
    self.useActiveX = window.hasOwnProperty('ActiveXObject');
    self.axObjectName = 'MITMediaLab.ScratchDevicePlugin'; // name of ActiveX object
    self.isAvailable = function () {
        return !!(self.useActiveX || navigator.plugins[pluginName]);
    };

    // These wrappers make the plugin act asynchronous, matching the API found in AIR and NMH.
    // The one difference is that callbacks are triggered before the initiating call returns.
    self.PluginWrapper = function (plugin) {
        var self = this;
        self.hid_list = function (callback, opt_vendorID, opt_productID) {
            var deviceList = plugin.hid_list(opt_vendorID, opt_productID);
            if (callback) callback(deviceList);
        };
        self.hid_open = function (path, callback) {
            var device = plugin.hid_open_raw(path);
            if (device) {
                device = new HidWrapper(device);
                ScratchProxies.AddHidProxies(device);
            }
            if (callback) callback(device);
        };
        self.serial_list = function (callback) {
            var deviceList = plugin.serial_list();
            if (callback) callback(deviceList);
        };
        self.serial_open = function (path, opts, callback) {
            var device = plugin.serial_open_raw(path, opts);
            if (device) {
                device = new SerialWrapper(device);
                ScratchProxies.AddSerialProxies(device);
            }
            if (callback) callback(device);
        };
        self.reset = function () {
            plugin.reset();
        };
        self.version = function (callback) {
            var result = plugin.version();
            if (callback) callback(result);
        };
    };

    function HidWrapper(device) {
        var self = this;

        self.write_raw = function (arrayBuffer, callback) {
            var result = device.write_raw(arrayBuffer);
            if (callback) callback(result);
        };
        self.send_feature_report_raw = function (arrayBuffer, callback) {
            var result = device.send_feature_report_raw(arrayBuffer);
            if (callback) callback(result);
        };
        self.read_raw = function (size, callback) {
            var data = device.read_raw(size);
            if (callback) callback(data);
        };
        self.get_feature_report_raw = function (size, callback) {
            var data = device.get_feature_report_raw(size);
            if (callback) callback(data);
        };
        self.set_nonblocking = function (flag, callback) {
            var result = device.set_nonblocking(flag);
            if (callback) callback(result);
        };
        self.close = function () {
            device.close();
        };
    };

    function SerialWrapper(device) {
        var self = this;

        self.send_raw = function (data) {
            device.send_raw(data);
        };
        self.close = function () {
            device.close();
        };
        self.is_open = function (callback) {
            var result = device.is_open();
            if (callback) callback(result);
        };
        self.set_receive_handler_raw = function (callback) {
            device.set_receive_handler_raw(callback);
        };
        self.set_error_handler = function (callback) {
            device.set_error_handler(callback);
        };
    };
})();
