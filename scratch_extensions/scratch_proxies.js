// Extend hardware devices with some hardware-API-agnostic data conversion wrappers
window.ScratchProxies = new (function () {
    var self = this;
    var charsBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    function ab_to_b64(arraybuffer) {
        var bytes = new Uint8Array(arraybuffer), i, len = bytes.length, base64 = '';

        for (i = 0; i < len; i += 3) {
            base64 += charsBase64[bytes[i] >> 2];
            base64 += charsBase64[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
            base64 += charsBase64[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
            base64 += charsBase64[bytes[i + 2] & 63];
        }

        if ((len % 3) === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        } else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }

        return base64;
    }

    function b64_to_ab(base64) {
        var bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
        if (base64[base64.length - 1] === '=') {
            --bufferLength;
            if (base64[base64.length - 2] === '=') {
                --bufferLength;
            }
        }

        var arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
        for (i = 0; i < len; i += 4) {
            encoded1 = charsBase64.indexOf(base64[i]);
            encoded2 = charsBase64.indexOf(base64[i + 1]);
            encoded3 = charsBase64.indexOf(base64[i + 2]);
            encoded4 = charsBase64.indexOf(base64[i + 3]);
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }

        return arraybuffer;
    }

    self.AddHidProxies = function (device) {
        device.write = function (arrayBuffer, callback) {
            var bufferBase64 = ab_to_b64(arrayBuffer);
            device.write_raw(bufferBase64, callback);
        };
        device.send_feature_report = function (arrayBuffer, callback) {
            var bufferBase64 = ab_to_b64(arrayBuffer);
            device.send_feature_report_raw(bufferBase64, callback);
        };
        device.read = function (size, callback) {
            device.read_raw(size, function (data) {
                if (callback) {
                    data = b64_to_ab(data);
                    callback(data);
                }
            });
        };
        device.get_feature_report = function (size, callback) {
            device.get_feature_report_raw(size, function (data) {
                if (callback) {
                    data = b64_to_ab(data);
                    callback(data);
                }
            });
        };
    };

    self.AddSerialProxies = function (device) {
        device.send = function (arrayBuffer, callback) {
            var bufferBase64 = ab_to_b64(arrayBuffer);
            device.send_raw(bufferBase64, function (result) {
                if (callback) callback(result);
            });
        };
        device.set_receive_handler = function (callback) {
            device.set_receive_handler_raw(function (data) {
                if (callback) {
                    data = b64_to_ab(data);
                    callback(data);
                }
            });
        };
    };
})();
