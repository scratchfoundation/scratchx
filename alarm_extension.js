/* Extension demonstrating a hat block */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, May 2014 */

new (function() {
    var ext = this;
    var alarm_went_off = false; // This becomes true after the alarm goes off

    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    ext.set_alarm = function(time) {
       window.setTimeout(function() {
           alarm_went_off = true;
       }, time*1000);
    };

    ext.when_alarm = function() {
       // Reset alarm_went_off if it is true, and return true
       // otherwise, return false.
       if (alarm_went_off === true) {
           alarm_went_off = false;
           return true;
       }

       return false;
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['', 'run alarm after %n seconds', 'set_alarm', '2'],
            ['h', 'when alarm goes off', 'when_alarm'],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Alarm extension', descriptor, ext);
})();