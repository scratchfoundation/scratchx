// wedoExtension.js
// Shane M. Clements, January 2014
// LEGO WEDO Scratch Extension
//
// This is an extension for development and testing of the Scratch Javascript Extension API.

(function (ext) {
    var device = null;
    var rawData = null;

    // Motor states: power: 0 to 100, dir: -1 or 1
    var motors = [
        {power: 100, dir: 1, isOn: false},
        {power: 100, dir: 1, isOn: false}
    ];
    var motorOffTime = 0;

    // Sensor states:
    var id0 = 0;
    var id1 = 0;
    var weDoDistance = 0;
    var weDoTilt = 0;

    // Commands
    ext.motorOnFor = function (motor, time, callback) {
        //ext.allMotorsOn();
        ext.motorOn(motor);

        setTimeout(function () {
            ext.motorOff(motor);
            //callback();
            if (typeof callback == "function") callback();
        }, 1000 * time);
    };

    ext.motorOn = function (motor) {
        switch (motor) {
            case "motor":
                ext.allMotorsOn('m');
                break;
            case "motor A":
                setMotorOn('m', 0, true);
                break;
            case "motor B":
                setMotorOn('m', 1, true);
                break;
            case "lights":
                ext.allMotorsOn('l');
                break;
            default:
                ext.allMotorsOn('a');
        }
    };

    ext.allMotorsOn = function (type) {
        setMotorOn(type, 0, true);
        setMotorOn(type, 1, true);
    };

    ext.motorOff = function (motor) {
        switch (motor) {
            case "motor":
                ext.allMotorsOff('m');
                break;
            case "motor A":
                setMotorOn('m', 0, false);
                break;
            case "motor B":
                setMotorOn('m', 1, false);
                break;
            case "lights":
                ext.allMotorsOff('l');
                break;
            default:
                ext.allMotorsOff('a');
        }
    };

    ext._stop = function () {
        ext.allMotorsOff('a');
    };
    ext.allMotorsOff = function (type) {
        setMotorOn(type, 0, false);
        setMotorOn(type, 1, false);
    };

    ext.startMotorPower = function (motor, power) {
        switch (motor) {
            case "motor":
                setMotorPower('m', 0, power);
                setMotorPower('m', 1, power);
                setMotorOn('m', 0, true);
                setMotorOn('m', 1, true);
                break;
            case "motor A":
                setMotorPower('m', 0, power);
                setMotorOn('m', 0, true);
                break;
            case "motor B":
                setMotorPower('m', 1, power);
                setMotorOn('m', 1, true);
                break;
            case "lights":
                setMotorPower('l', 0, power);
                setMotorPower('l', 1, power);
                setMotorOn('l', 0, true);
                setMotorOn('l', 1, true);
                break;
            default:
                setMotorPower('a', 0, power);
                setMotorPower('a', 1, power);
                setMotorOn('a', 0, true);
                setMotorOn('a', 1, true);
        }
    };

    ext.setMotorDirection = function (motor, s) {
        var dir;
        if ('this way' == s) {
            dir = 1;
        } else if ('that way' == s) {
            dir = -1;
        } else if ('reverse' == s) {
            dir = 0;
        } else {
            return;
        }

        switch (motor) {
            case "motor A":
                setMotorDirection(0, dir);
                break;
            case "motor B":
                setMotorDirection(1, dir);
                break;
            default:
                setMotorDirection(0, dir);
                setMotorDirection(1, dir);
        }
    };

    // Hat blocks
    ext.whenDistance = function (s, dist) {
        return device != null && ('<' == s ? (getDistance() < dist) : (getDistance() > dist));
    };
    ext.whenTilt = function (s, tilt) {
        return device != null && ('=' == s ? (getTilt() == tilt) : (getTilt() != tilt));
    };
    //ext.whenDistanceLessThan = function(dist) { return device!=null && getDistance() < dist; };
    //ext.whenTiltIs = function(tilt) { return device!=null && getTilt() == tilt; };

    // Reporters
    ext.getDistance = function () {
        return getDistance();
    };
    ext.getTilt = function () {
        return getTilt();
    };

    // Internal logic
    function setMotorDirection(motorID, dir) {
        // Dir: -1 - counter-clockwise, 1 - clockwise, 0 - reverse
        var motor = getMotor('m', motorID);
        if (!motor) return; // motorID must be 0 or 1
        if ((dir == -1) || (dir == 1)) motor.dir = dir;
        if (dir == 0) motor.dir = -motor.dir; // reverse
        if (motor.isOn) sendMotorState();
    }

    function setMotorOn(type, motorID, flag) {
        var motor = getMotor(type, motorID);
        if (!motor) return; // motorID must be 0 or 1
        var wasOn = motor.isOn && (motor.power > 0);
        motor.isOn = (flag == true);
        if (wasOn) checkForMotorsOff();
        sendMotorState();
    }

    function setMotorPower(type, motorID, pwr) {
        // Pwr: 0..100
        var motor = getMotor(type, motorID);
        if (!motor) return; // motorID must be 0 or 1
        var wasOn = motor.isOn && (motor.power > 0);
        motor.power = Math.max(0, Math.min(pwr, 100));
        if (motor.power > 0) motor.isOn = true;
        if (wasOn) checkForMotorsOff();
        sendMotorState();
    }

    var wedoCommand = new Uint8Array(9);
    wedoCommand[1] = 0x40;

    function sendMotorState() {
        if (device) {
            // Each motor is controlled by a signed byte whose sign determines the direction and absolute value the power
            wedoCommand[2] = motorValue(0);
            wedoCommand[3] = motorValue(1);
            device.write(wedoCommand.buffer);
        }
    }

    function motorValue(motorID) {
        // Return a two character hex string to control the given motor.
        var motor = motors[motorID];
        var byte = 0;
        if (motor.isOn && (motor.power > 0)) byte = (17 + Math.floor(1.1 * motor.power));
        if (motor.dir < 0) byte = (256 - byte) & 0xFF;
        return byte;
    }

    function getMotor(type, motorID) {
        if (rawData && okayToReadIDs()) {
            var s = new Uint8Array(rawData);
            id0 = s[3];
            id1 = s[5];
        }
        //console.log(id0);
        //console.log(id0.toString(2));
        //console.log(id1);
        //console.log(id1.toString(2));
        //console.log();
        if ((motorID == 0) && isMotor(type, id0)) return motors[0];
        if ((motorID == 1) && isMotor(type, id1)) return motors[1];
        return null;
    }

    function isMotor(type, id) {
        switch (type) {
            case 'm': // motor
                return (234 <= id) && (id <= 246);
            case 'l': // light
                return (200 <= id) && (id <= 205);
        }
        return ((234 <= id) && (id <= 246)) || ((200 <= id) && (id <= 205));
    }

    function checkForMotorsOff() {
        // Called on motor transition from on to off or motor power goes from non-zero to zero.
        // If both motors are just become off (or zero power), set motorOffTime to the current time.
        if (motors[0].isOn && (motors[0].power > 0)) return; // motor 0 is still on
        if (motors[1].isOn && (motors[1].power > 0)) return; // motor 1 is still on
        motorOffTime = new Date().getTime();
    }

    function okayToReadIDs() {
        // The WeDo sensor ID data is garbled and meaningless while any motor is running.
        // In fact, the ID continues to be garbled for a short while after all motors have
        // been turned off because the motor "coasts" and generates a current which throws
        // off the analog-to-digital converter in the WeDo hub. Thus, we keep track when the last
        // motor was turned off and wait half a second before trying to read the sensor ID's
        // Cached values of the sensor ID's are used while motors are running. Thus, if a user
        // plugs a different sensor into the WeDo hub while the motors are running, the plugin
        // won't notice until all motors are stopped.
        if (motors[0].isOn || motors[1].isOn) return false;
        return (new Date().getTime() - motorOffTime) > 500;
    }

    function updateSensor(id, rawValue) {
        if ((170 <= id) && (id <= 190)) { // distance sensor
            weDoDistance = Math.round((100 * (rawValue - 70)) / 140);
            weDoDistance = Math.max(0, Math.min(weDoDistance, 100));
        }
        if ((28 <= id) && (id <= 47)) { // tilt sensor
            if (rawValue < 49) {
                weDoTilt = 3;
            } else if (rawValue < 100) {
                weDoTilt = 2;
            } else if (rawValue < 154) {
                weDoTilt = 0;
            } else if (rawValue < 205) {
                weDoTilt = 1;
            } else {
                weDoTilt = 4;
            }
        }
    }

    function getDistance() {
        if (rawData) processData();
        return weDoDistance;
    }

    function getTilt() {
        if (rawData) processData();
        return weDoTilt;
    }

    function processData() {
        var s = new Uint8Array(rawData);

        if (okayToReadIDs()) {
            id0 = s[3];
            id1 = s[5];
        }
        weDoDistance = weDoTilt = 0; // zero if no sensor plugged in
        updateSensor(id0, s[2]);
        updateSensor(id1, s[4]);

        rawData = null;
    }

    var poller = null;
    ext._deviceConnected = function (dev) {
        if (device) return;

        device = dev;
        device.open();
        poller = setInterval(function () {
            device.read(function (data) {
                rawData = data;
            });
        }, 20);
    };

    ext._deviceRemoved = function (dev) {
        if (device != dev) return;
        if (poller) poller = clearInterval(poller);
        device = null;
    };

    ext._shutdown = function () {
        setMotorOn('a', 0, false);
        setMotorOn('a', 1, false);

        if (poller) poller = clearInterval(poller);
        if (device) device.close();
        device = null;
    };

    ext._getStatus = function () {
        if (!device) return {status: 1, msg: 'LEGO WeDo disconnected'};
        return {status: 2, msg: ' LEGO WeDo connected'};
    };

    var descriptor = {
        blocks: [
            ['w', 'turn %m.motor on for %n secs',                 'motorOnFor',        'motor', 1],
            [' ', 'turn %m.motor on',                             'motorOn',           'motor'],
            [' ', 'turn %m.motor off',                            'motorOff',          'motor'],
            [' ', 'set %m.motor power to %n',                     'startMotorPower',   'motor', 100],
            [' ', 'set %m.motor2 direction to %m.motorDirection', 'setMotorDirection', 'motor', 'this way'],
            ['h', 'when distance %m.lessMore %n',                 'whenDistance',      '<', 20],
            ['h', 'when tilt %m.eNe %n',                          'whenTilt',          '=', 1],
            ['r', 'distance',                                     'getDistance'],
            ['r', 'tilt',                                         'getTilt']
        ],
        menus: {
            motor: ['motor', 'motor A', 'motor B', 'lights', 'everything'],
            motor2: ['motor', 'motor A', 'motor B', 'all motors'],
            motorDirection: ['this way', 'that way', 'reverse'],
            lessMore: ['<', '>'],
            eNe: ['=', 'not =']
        },
        url: '/info/help/studio/tips/ext/LEGO WeDo/'
    };
    ScratchExtensions.register('LEGO WeDo', descriptor, ext, {type: 'hid', vendor: 1684, product: 3});
})({});
