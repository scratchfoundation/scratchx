/* Extension demonstrating a simple version of the Text to Speech block */
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

    ext.speak = function(text) {
        msg = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(msg);
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
            ['', 'speak %s', 'speak', "Hello!"],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Simple text to speech extension', descriptor, ext);
})();