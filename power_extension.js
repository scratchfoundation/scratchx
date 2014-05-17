/* Extension demonstrating a reporter block */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, May 2014 */

new (function() {
    var ext = this;

    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.power = function(base, exponent) {
        return Math.pow(base, exponent);
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            // Block type, block name, function name, param1 default value, param2 default value
            ['r', '%n ^ %n', 'power', 2, 3],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Sample extension', descriptor, ext);
})();