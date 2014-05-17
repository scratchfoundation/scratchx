/* Extension using the JavaScript Speech API for speech to text */
/* Sayamindu Dasgupta <sayamindu@media.mit.edu>, April 2014 */

new (function() {
    var ext = this;
    
    var recognized_speech = '';

    ext.recognize_speech = function (callback) {
        var recognition = new webkitSpeechRecognition();
        recognition.onresult = function(event) {
            if (event.results.length > 0) {
                recognized_speech = event.results[0][0].transcript;
                if (typeof callback=="function") callback();
            }
        };
        recognition.start();
    };

    ext.recognized_speech = function () {return recognized_speech;};

    ext._shutdown = function() {};

    ext._getStatus = function() {
        if (window.webkitSpeechRecognition === undefined) {
            return {status: 1, msg: 'Your browser does not support speech recognition. Try using Google Chrome.'};
        }
        return {status: 2, msg: 'Ready'};
    };

    var descriptor = {
        blocks: [
            ['w', 'wait and recognize speech', 'recognize_speech'],
            ['r', 'recognized speech', 'recognized_speech']
        ],
    };

    ScratchExtensions.register('Speech To Text', descriptor, ext);
})();