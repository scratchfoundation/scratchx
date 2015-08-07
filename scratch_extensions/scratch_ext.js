// scratch_ext.js
// Shane M. Clements, November 2013
// ScratchExtensions
//
// Scratch 2.0 extension manager which Scratch communicates with to initialize extensions and communicate with them.
// The extension manager also handles creating the browser plugin to enable access to HID and serial devices.
window.ScratchExtensions = new (function () {
    var plugin = null;
    var handlers = {};
    var blockDefs = {};
    var menuDefs = {};
    var deviceSpecs = {};
    var devices = {};
    var poller = null;
    var lib = this;

    var isOffline = (Scratch && Scratch.FlashApp && Scratch.FlashApp.ASobj &&
            Scratch.FlashApp.ASobj.isOffline && Scratch.FlashApp.ASobj.isOffline());
    var pluginAvailable = function () {
        return !!window.ArrayBuffer && !!(
                isOffline ||
                (window.ScratchPlugin && window.ScratchPlugin.isAvailable()) ||
                (window.ScratchDeviceHost && window.ScratchDeviceHost.isAvailable())
            );
    };

    lib.register = function (name, descriptor, handler, deviceSpec) {
        if (name in handlers) {
            console.log('Scratch extension "' + name + '" already exists!');
            return false;
        }

        handlers[name] = handler;
        blockDefs[name] = descriptor.blocks;
        if (descriptor.menus) menuDefs[name] = descriptor.menus;
        if (deviceSpec) deviceSpecs[name] = deviceSpec;

        // Show the blocks in Scratch!
        var extObj = {
            extensionName: name,
            blockSpecs: descriptor.blocks,
            url: descriptor.url,
            menus: descriptor.menus,
            javascriptURL: loadingURL
        };
        Scratch.FlashApp.ASobj.ASloadExtension(extObj);

	    if (deviceSpec) {
		    if (!plugin) {
			    if (pluginAvailable()) {
				    // createDevicePlugin() will eventually call checkPolling() if it succeeds
				    setTimeout(createDevicePlugin, 10);
			    } else if (window.ScratchPlugin.useActiveX) {
				    JSsetProjectBanner('Sorry, your version of Internet Explorer is not supported.  Please upgrade to version 10 or 11.');
			    }
		    }
		    else {
			    // Second hardware-using project in the same tab
			    checkPolling();
		    }
	    }

        return true;
    };

    var loadingURL;
    lib.loadExternalJS = function (url) {
        var scr = document.createElement("script");
        scr.src = url;// + "?ts=" + new Date().getTime();
        loadingURL = url;
        document.getElementsByTagName("head")[0].appendChild(scr);
    };

    lib.loadLocalJS = function (code) {
        // Run the extension code in the global scope
        try {
            (new Function(code))();
        } catch (e) {
            console.log(e.stack.toString());
        }
    };

    lib.unregister = function (name) {
        try { handlers[name]._shutdown(); } catch (e) { }
        delete handlers[name];
        delete blockDefs[name];
        delete menuDefs[name];
        delete deviceSpecs[name];
    };

    lib.canAccessDevices = function () { return pluginAvailable(); };
    lib.getReporter = function (ext_name, reporter, args) {
        return handlers[ext_name][reporter].apply(handlers[ext_name], args);
    };

    lib.getReporterAsync = function (ext_name, reporter, args, job_id) {
        var callback = function (retval) {
            Scratch.FlashApp.ASobj.ASextensionReporterDone(ext_name, job_id, retval);
        }
        args.push(callback);
        handlers[ext_name][reporter].apply(handlers[ext_name], args);
    };

    lib.getReporterForceAsync = function (ext_name, reporter, args, job_id) {
        var retval = handlers[ext_name][reporter].apply(handlers[ext_name], args);
        Scratch.FlashApp.ASobj.ASextensionReporterDone(ext_name, job_id, retval);
    };

    lib.runCommand = function (ext_name, command, args) {
        handlers[ext_name][command].apply(handlers[ext_name], args);
    };

    lib.runAsync = function (ext_name, command, args, job_id) {
        var callback = function () {
            Scratch.FlashApp.ASobj.ASextensionCallDone(ext_name, job_id);
        }
        args.push(callback);
        handlers[ext_name][command].apply(handlers[ext_name], args);
    };

    lib.getStatus = function (ext_name) {
        if (!(ext_name in handlers))
            return { status: 0, msg: 'Not loaded' };

        if (ext_name in deviceSpecs && !pluginAvailable())
            return { status: 0, msg: 'Missing browser plugin' };

        return handlers[ext_name]._getStatus();
    };

    lib.notify = function (text) {
        if (window.JSsetProjectBanner) JSsetProjectBanner(text);
        else alert(text);
    };

    lib.resetPlugin = function () {
        if (plugin && plugin.reset) plugin.reset();
        shutdown();
    };

    $(window).unload(function (e) {
        shutdown();
    });

    function shutdown() {
        for (var extName in handlers)
            handlers[extName]._shutdown();
        handlers = {};
        stopPolling();
    }

    function checkDevices() {
        var awaitingSpecs = {};
        for (var ext_name in deviceSpecs)
            if (!devices[ext_name]) {
                var spec = deviceSpecs[ext_name];
                if (spec.type == 'hid') {
                    if (!awaitingSpecs['hid']) awaitingSpecs['hid'] = {};
                    awaitingSpecs['hid'][spec.vendor + '_' + spec.product] = ext_name;
                }
                else if (spec.type == 'serial')
                    awaitingSpecs['serial'] = ext_name;
            }

        if (awaitingSpecs['hid']) {
            plugin.hid_list(function (deviceList) {
                var hidList = awaitingSpecs['hid'];
                for (var i = 0; i < deviceList.length; i++) {
                    var ext_name = hidList[deviceList[i]["vendor_id"] + '_' + deviceList[i]["product_id"]];
                    if (ext_name)
                        handlers[ext_name]._deviceConnected(new hidDevice(deviceList[i], ext_name));
                }
            });
        }

        if (awaitingSpecs['serial']) {
            var ext_name = awaitingSpecs['serial'];
            plugin.serial_list(function (deviceList) {
                for (var i = 0; i < deviceList.length; i++) {
                    handlers[ext_name]._deviceConnected(new serialDevice(deviceList[i], ext_name));
                }
            });
        }

        if (!shouldLookForDevices())
            stopPolling();
    }

    function checkPolling() {
        if (poller || !shouldLookForDevices()) return;

        poller = setInterval(checkDevices, 500);
    }

    function stopPolling() {
        if (poller) clearInterval(poller);
        poller = null;
    }

    function shouldLookForDevices() {
        for (var ext_name in deviceSpecs)
            if (!devices[ext_name])
                return true;

        return false;
    }

    function createDevicePlugin() {
        if (plugin) return;

        // TODO: delegate more of this to the other files
        if (isOffline) {
            // Talk to the AIR Native Extension through the offline editor's plugin emulation.
            plugin = Scratch.FlashApp.ASobj.getPlugin();
        } else if (window.ScratchDeviceHost && window.ScratchDeviceHost.isAvailable()) {
            // Talk to the Native Messaging Host through a Chrome extension.
            plugin = window.ScratchDeviceHost;
        } else {
            if (window.ScratchPlugin.useActiveX) {
                // we must be on IE or similar
                plugin = new ActiveXObject(window.ScratchPlugin.axObjectName);
            } else {
                // Not IE: try NPAPI
                var pluginContainer = document.createElement('div');
                document.getElementById('scratch').parentNode.appendChild(pluginContainer);
                pluginContainer.innerHTML = '<object type="application/x-scratchdeviceplugin" width="1" height="1"> </object>';
                plugin = pluginContainer.firstChild;
            }
            // Talk to the actual plugin, but make it pretend to be asynchronous.
            plugin = new window.ScratchPlugin.PluginWrapper(plugin);
        }

        // Wait a moment to access the plugin and claim any devices that plugins are
        // interested in.
        setTimeout(checkPolling, 100);
    }

    function hidDevice(info, ext_name) {
        var dev = null;
        var self = this;

        // TODO: add support for multiple devices per extension
        //if(!(ext_name in devices)) devices[ext_name] = {};

        this.id = info["path"];
        this.info = info;

        function disconnect() {
            setTimeout(function () {
                self.close();
                handlers[ext_name]._deviceRemoved(self);
            }, 0);
        }

        this.open = function (readyCallback) {
            plugin.hid_open(self.id, function (d) {
                dev = d;
                dev.set_nonblocking(true);
                //devices[ext_name][path] = self;
                devices[ext_name] = self;

                if (readyCallback) readyCallback(self);
            });
        };
        this.close = function () {
            if (!dev) return;
            dev.close();
            delete devices[ext_name];
            dev = null;

            checkPolling();
        };
        this.write = function (data, callback) {
            if (!dev) return;
            dev.write(data, function (len) {
                if (len < 0) disconnect();
                if (callback) callback(len);
            });
        };
        this.read = function (callback, len) {
            if (!dev) return null;
            if (!len) len = 65;
            dev.read(len, function (data) {
                if (data.byteLength == 0) disconnect();
                callback(data);
            });
        };
    }

    function serialDevice(id, ext_name) {
        var dev = null;
        var self = this;

        // TODO: add support for multiple devices per extension
        //if(!(ext_name in devices)) devices[ext_name] = {};

        this.id = id;
        this.open = function (opts, readyCallback) {
            try {
                plugin.serial_open(self.id, opts, function (d) {
//                    dev.set_disconnect_handler(function () {
//                        self.close();
//                        handlers[ext_name]._deviceRemoved(self);
//                    });
//                    devices[ext_name][path] = self;
                    dev = d;
                    devices[ext_name] = self;

                    dev.set_error_handler(function (message) {
                        alert('Serial device error\n\nDevice: ' + id + '\nError: ' + message);
                    });

                    if (readyCallback) readyCallback(self);
                });
            }
            catch (e) {
                console.log('Error opening serial device ' + id + ': ' + e);
            }
        };
        this.close = function () {
            if (!dev) return;
            dev.close();
            delete devices[ext_name];
            dev = null;

            checkPolling();
        };
        this.send = function (data) {
            if (!dev) return;
            dev.send(data);
        };
        this.set_receive_handler = function (handler) {
            if (!dev) return;
            dev.set_receive_handler(handler);
        };
    }
})();
