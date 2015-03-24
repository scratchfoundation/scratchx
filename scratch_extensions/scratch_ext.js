// scratch_ext.js
// Shane M. Clements, November 2013
// ScratchExtensions
//
// Scratch 2.0 extension manager which Scratch communicates with to initialize extensions and communicate with them.
// The extension manager also handles creating the browser plugin to enable access to HID and serial devices.
window.ScratchExtensions = new (function(){
    var pluginName = 'Scratch Device Plugin'; // will be 'Scratch Plugin for Devices'
    var pluginAvailable = (window.ActiveXObject || !!navigator.plugins[pluginName]) && !!window.ArrayBuffer;
    var plugin = null;
    var handlers = {};
    var blockDefs = {};
    var menuDefs = {};
    var deviceSpecs = {};
    var devices = {};
    var poller = null;
    var lib = this;

    lib.register = function(name, descriptor, handler, deviceSpec) {
        if(name in handlers) {
            console.log('Scratch extension "'+name+'" already exists!');
            return false;
        }

        if(deviceSpec) {
            if(!pluginAvailable && window.ActiveXObject) {
                JSsetProjectBanner('Sorry, your version of Internet Explorer is not supported.  Please upgrade to version 10 or 11.');
            }
            if(pluginAvailable && !plugin) setTimeout(createDevicePlugin, 10);

            // Wait a moment to access the plugin and claim any devices that plugins are
            // interested in.
            setTimeout(checkPolling, 100);
        }

        handlers[name] = handler;
        blockDefs[name] = descriptor.blocks;
        if(descriptor.menus) menuDefs[name] = descriptor.menus;
        if(deviceSpec) deviceSpecs[name] = deviceSpec;

        // Show the blocks in Scratch!
        var extObj = {
            extensionName: name,
            blockSpecs: descriptor.blocks,
            url: descriptor.url,
            menus: descriptor.menus,
            javascriptURL: loadingURL
        };
        Scratch.FlashApp.ASobj.ASloadExtension(extObj);
        return true;
    };

    var loadingURL;
    lib.loadExternalJS = function(url) {
        var scr = document.createElement("script");
        scr.src = url;// + "?ts=" + new Date().getTime();
        loadingURL = url;
        document.getElementsByTagName("head")[0].appendChild(scr);
    };

    lib.loadLocalJS = function(code) {
        // Run the extension code in the global scope
        try {
            (new Function(code))();
        } catch(e) {
            console.log(e.stack.toString());
        }
    };

    lib.unregister = function(name) {
        try { handlers[name]._shutdown(); } catch(e){}
        delete handlers[name];
        delete blockDefs[name];
        delete menuDefs[name];
        delete deviceSpecs[name];
    };

    lib.canAccessDevices = function() { return pluginAvailable; };
    lib.getReporter = function(ext_name, reporter, args) {
        return handlers[ext_name][reporter].apply(handlers[ext_name], args);
    };

    lib.getReporterAsync = function(ext_name, reporter, args, job_id) {
        var callback = function(retval) {
            Scratch.FlashApp.ASobj.ASextensionReporterDone(ext_name, job_id, retval);
        }
        args.push(callback);
        handlers[ext_name][reporter].apply(handlers[ext_name], args);
    };

    lib.runCommand = function(ext_name, command, args) {
        handlers[ext_name][command].apply(handlers[ext_name], args);
    };

    lib.runAsync = function(ext_name, command, args, job_id) {
        var callback = function() {
            Scratch.FlashApp.ASobj.ASextensionCallDone(ext_name, job_id);
        }
        args.push(callback);
        handlers[ext_name][command].apply(handlers[ext_name], args);
    };

    lib.getStatus = function(ext_name) {
        if(!(ext_name in handlers))
            return {status: 0, msg: 'Not loaded'};

        if(ext_name in deviceSpecs && !pluginAvailable)
            return {status: 0, msg: 'Missing browser plugin'};

        return handlers[ext_name]._getStatus();
    };

    lib.notify = function(text) {
        if(window.JSsetProjectBanner) JSsetProjectBanner(text);
        else alert(text);
    };

    lib.resetPlugin = function() {
        if (plugin && plugin.reset) plugin.reset();
        shutdown();
    };

    $(window).unload(function(e) {
        shutdown();
    });

    function shutdown() {
        for(var extName in handlers)
            handlers[extName]._shutdown();
        handlers = {};
        stopPolling();
    }

    function checkDevices() {
        var awaitingSpecs = {};
        for(var ext_name in deviceSpecs)
            if(!devices[ext_name]) {
                var spec = deviceSpecs[ext_name];
                if(spec.type == 'hid') {
                    if(!awaitingSpecs['hid']) awaitingSpecs['hid'] = {};
                    awaitingSpecs['hid'][spec.vendor + '_' + spec.product] = ext_name;
                }
                else if(spec.type == 'serial')
                    awaitingSpecs['serial'] = ext_name;
            }

        if(awaitingSpecs['hid']) {
            var deviceList = plugin.hid_list();
            var hidList = awaitingSpecs['hid'];
            for (var i = 0; i < deviceList.length; i++) {
                var ext_name = hidList[deviceList[i]["vendor_id"] + '_' + deviceList[i]["product_id"]];
                if (ext_name)
                    handlers[ext_name]._deviceConnected(new hidDevice(deviceList[i], ext_name));
            }
        }

        if(awaitingSpecs['serial']) {
            var ext_name = awaitingSpecs['serial'];
            var deviceList = plugin.serial_list();
            for (var i = 0; i < deviceList.length; i++) {
                handlers[ext_name]._deviceConnected(new serialDevice(deviceList[i], ext_name));
            }
        }

        if(!shouldLookForDevices())
            stopPolling();
    }

    function checkPolling() {
        if(poller || !shouldLookForDevices()) return;

        poller = setInterval(checkDevices, 500);
   }

    function stopPolling() {
        if(poller) clearInterval(poller);
        poller = null;
    }

    function shouldLookForDevices() {
        for(var ext_name in deviceSpecs)
            if(!devices[ext_name])
                return true;

        return false;
    }

    function createDevicePlugin() {
        if(plugin) return;

        var pluginContainer = document.createElement('div');
        document.getElementById('scratch').parentNode.appendChild(pluginContainer);
        pluginContainer.innerHTML = '<object type="application/x-scratchdeviceplugin" width="1" height="1" codebase="/scratchr2/static/ext/ScratchDevicePlugin.cab"> </object>';
        plugin = pluginContainer.firstChild;
    }

    function hidDevice(info, ext_name) {
        var dev = null;
        var self = this;

        // TODO: add support for multiple devices per extension
        //if(!(ext_name in devices)) devices[ext_name] = {};

        this.id = info["path"];
        this.info = info;

        function disconnect() {
            setTimeout(function(){
                self.close();
                handlers[ext_name]._deviceRemoved(self);
            }, 0);
        }

        this.open = function() {
            try {
                dev = plugin.hid_open(this.id);
                if(window.ActiveXObject) dev = dev(this.id);
                dev.set_nonblocking(true);
                //devices[ext_name][path] = this;
                devices[ext_name] = this;
            }
            catch(e) {}
        };
        this.close = function() {
            if(!dev) return;
            dev.close();
            delete devices[ext_name];
            dev = null;

            checkPolling();
        };
        this.write = function(data) {
            if(!dev) return;
            var len = dev.write(data);
            if(window.ActiveXObject) len = len(data);
            if(len < 0) disconnect();
            return len;
        };
        this.read = function(len) {
            if(!dev) return null;
            if(!len) len = 65;
            var data = dev.read(len);
            if(window.ActiveXObject) data = data(len);
            if(data.byteLength == 0) disconnect();
            return data;
        };
    }

    function serialDevice(id, ext_name) {
        var dev = null;
        var self = this;

        // TODO: add support for multiple devices per extension
        //if(!(ext_name in devices)) devices[ext_name] = {};

        this.id = id;
        this.open = function(opts) {
            try {
                dev = plugin.serial_open(this.id, opts);
//                dev.set_disconnect_handler(function() {
//                    self.close();
//                    handlers[ext_name]._deviceRemoved(self);
//                });
                //devices[ext_name][path] = this;
                devices[ext_name] = this;
            }
            catch(e) {}
        };
        this.close = function() {
            if(!dev) return;
            dev.close();
            delete devices[ext_name];
            dev = null;

            checkPolling();
        };
        this.send = function(data) {
            if(!dev) return;
            dev.send(data);
        };
        this.set_receive_handler = function(handler) {
            if(!dev) return;
            dev.set_receive_handler(handler);
        };
    }
})();
