
(function (ext) {

    var device = null;

    var motors = [
        new Motor(0),
        new Motor(1)
    ];

    var sensors = {
        tiltX: 0,
        tiltY: 0,
        distance: 0
    };

    ext.motorOnFor = function (motorId, time, callback) {
        var milliseconds = 1000 * time;
        // Tell each motor to turn on for `time`
        forEachMotor(motorId, function (motor) {
            motor.cancelMotorTimeout();
            motor.setMotorOnFor(milliseconds);
        });
        // This block runs for a fixed amount of time, even if the motors end up getting interrupted by another block
        setTimeout(function () {
            if (callback) callback();
        }, milliseconds);
    };

    ext.motorOn = function (motorId) {
        forEachMotor(motorId, function (motor) {
            motor.cancelMotorTimeout();
            motor.setMotorOn();
        });
    };

    ext.motorOff = function (motorId) {
        forEachMotor(motorId, function (motor) {
            motor.cancelMotorTimeout();
            motor.startBraking();
        });
    };

    ext.startMotorPower = function (motorId, power) {
        power = Math.max(0, Math.min(power, 100));
        forEachMotor(motorId, function (motor) {
            motor.power = power;
        });
        ext.motorOn(motorId);
    };

    ext.setMotorDirection = function (motorId, direction) {
        forEachMotor(motorId, function (motor) {
            switch (direction) {
            case strings.DIR_FORWARD:
                motor.dir = 1;
                break;
            case strings.DIR_BACK:
                motor.dir = -1;
                break;
            case strings.DIR_REV:
                motor.dir = -motor.dir;
                break;
            default:
                console.log('Unknown motor direction: ' + direction);
                break;
            }
            if (motor.isOn) {
                // change direction immediately, without altering power or timeout state
                motor.setMotorOn();
            }
        });
    };

    ext.setLED = function (hue) {
        if (device) {
            // Change from [0,100] range to [0,360] range
            hue = hue * 360 / 100;

            var rgbArray = HSVToRGB(hue, 1, 1);

            var r = Math.floor(rgbArray[0] * 255);
            var g = Math.floor(rgbArray[1] * 255);
            var b = Math.floor(rgbArray[2] * 255);

            // Form hexadecimal number: 0xRRGGBB
            var rgbNumber = (((r << 8) | g) << 8) | b;

            device.set_led(rgbNumber);
        }
    };

    ext.playNote = function (note, duration, callback) {
        var durationMs = duration * 1000;
        if (device) {
            // TODO: offer music helpers to extensions:
            // - convert beats to duration
            // - convert note number to frequency

            var tone = noteToTone(note);
            device.play_tone(tone, durationMs);
        }
        // Keep disconnected behavior similar to connected behavior by delaying the callback even with no device.
        setTimeout(callback, durationMs);
    };

    ext.stopNote = function () {
        if (device) {
            device.stop_tone();
        }
    };

    ext.whenDistance = function (op, reference) {
        if (device) {
            switch (op) {
            case strings.COMP_LESS:
                return ext.getDistance() < reference;
            case strings.COMP_MORE:
                return ext.getDistance() > reference;
            default:
                console.log('Unknown operator in whenDistance: ' + op);
            }
        }
        return false;
    };

    ext.getDistance = function () {
        return device ? sensors.distance * 10 : 0;
    };

    ext.isTilted = function (tiltDirAny) {
        if (device) {
            var threshold = 15;
            // TODO: share code with getTilt
            switch(tiltDirAny) {
            case strings.TILT_ANY:
                return (Math.abs(sensors.tiltX) >= threshold) || (Math.abs(sensors.tiltY) >= threshold);
            case strings.TILT_UP:
                return -sensors.tiltY > threshold;
            case strings.TILT_DOWN:
                return sensors.tiltY > threshold;
            case strings.TILT_LEFT:
                return -sensors.tiltX > threshold;
            case strings.TILT_RIGHT:
                return sensors.tiltX > threshold;
            }
        }
        return false;
    };

    ext.getTilt = function (tiltDir) {
        var tiltValue;
        switch(tiltDir) {
        case strings.TILT_UP:
            tiltValue = -sensors.tiltY;
            break;
        case strings.TILT_DOWN:
            tiltValue = sensors.tiltY;
            break;
        case strings.TILT_LEFT:
            tiltValue = -sensors.tiltX;
            break;
        case strings.TILT_RIGHT:
            tiltValue = sensors.tiltX;
            break;
        default:
            console.log('Unknown tilt direction in getTilt: ' + tiltDir);
            tiltValue = 0;
            break;
        }
        return tiltValue;
    };

    function forEachMotor (motorId, motorFunction) {
        var motorIndices;
        switch (motorId) {
        case strings.MOTOR_A:
            motorIndices = [0];
            break;
        case strings.MOTOR_B:
            motorIndices = [1];
            break;
        case strings.MOTOR_DEFAULT:
        case strings.MOTOR_ALL:
            motorIndices = [0, 1];
            break;
        default:
            console.log('Invalid motor ID');
            motorIndices = [];
            break;
        }
        var numMotors = motorIndices.length;
        for (var i = 0; i < numMotors; ++i) {
            motorFunction(motors[motorIndices[i]]);
        }
    }

    function onSensorChanged (event) {
        sensors[event.sensorName] = event.sensorValue;
    }

    function clamp (val, min, max) {
        return Math.max(min, Math.min(val, max));
    }

    // See https://en.wikipedia.org/wiki/HSL_and_HSV#From_HSV
    // Returns an array of [R, G, B] where each component is in the range [0,1]
    function HSVToRGB (hueDegrees, saturation, value) {
        hueDegrees %= 360;
        if (hueDegrees < 0) hueDegrees += 360;
        saturation = clamp(saturation, 0, 1);
        value = clamp(value, 0, 1);

        var chroma = value * saturation;
        var huePrime = hueDegrees / 60;
        var x = chroma * (1 - Math.abs(huePrime % 2 - 1));
        var rgb;
        switch(Math.floor(huePrime)) {
        case 0:
            rgb = [chroma, x, 0];
            break;
        case 1:
            rgb = [x, chroma, 0];
            break;
        case 2:
            rgb = [0, chroma, x];
            break;
        case 3:
            rgb = [0, x, chroma];
            break;
        case 4:
            rgb = [x, 0, chroma];
            break;
        case 5:
            rgb = [chroma, 0, x];
            break;
        }

        var m = value - chroma;
        rgb[0] += m;
        rgb[1] += m;
        rgb[2] += m;

        return rgb;
    }

    function noteToTone (note) {
        return 440 * Math.pow(2, (note - 69) / 12); // midi key 69 is A (440 Hz)
    }

    ext._deviceConnected = function (dev) {
        if (device) return;

        device = dev;
        device.open(function (d) {
            if (device == d) {
                device.set_sensor_handler(onSensorChanged);
            }
            else if (d) {
                console.log('Received open callback for wrong device');
            }
            else {
                console.log('Opening device failed');
                device = null;
            }
        });
    };

    ext._deviceRemoved = function (dev) {
        if (device != dev) return;
        device = null;
    };

    ext._stop = function () {
        if (device) {
            device.stop_tone();
            forEachMotor(strings.MOTOR, function (motor) {
                motor.cancelMotorTimeout();
                motor.setMotorOff();
            });
        }
    };

    ext._shutdown = function () {
        if (device) {
            ext._stop();
            device.close();
            device = null;
        }
    };

    ext._getStatus = function () {
        if (device) {
            if (device.is_open()) {
                return {status: 2, msg: 'LEGO WeDo 2.0 connected'};
            }
            else {
                return {status: 1, msg: 'LEGO WeDo 2.0 connecting...'};
            }
        }
        else {
            return {status: 1, msg: 'LEGO WeDo 2.0 disconnected'};
        }
    };

    var strings = {
        MOTOR_DEFAULT: 'motor',
        MOTOR_A: 'motor A',
        MOTOR_B: 'motor B',
        MOTOR_ALL: 'all motors',
        DIR_FORWARD: 'this way',
        DIR_BACK: 'that way',
        DIR_REV: 'reverse',
        TILT_UP: 'up',
        TILT_DOWN: 'down',
        TILT_LEFT: 'left',
        TILT_RIGHT: 'right',
        TILT_ANY: 'any',
        COMP_LESS: '<',
        COMP_MORE: '>',
        COMP_EQ: '=',
        COMP_NEQ: 'not ='
    };

    var descriptor = {
        blocks: [
            ['w', 'turn %m.motor on for %n secs', 'motorOnFor', strings.MOTOR_DEFAULT, 1],
            [' ', 'turn %m.motor on', 'motorOn', strings.MOTOR_DEFAULT],
            [' ', 'turn %m.motor off', 'motorOff', strings.MOTOR_DEFAULT],
            [' ', 'set %m.motor power to %n', 'startMotorPower', strings.MOTOR_DEFAULT, 100],
            [' ', 'set %m.motor direction to %m.motorDir', 'setMotorDirection', strings.MOTOR_DEFAULT, strings.DIR_FORWARD],
            [' ', 'set light color to %n', 'setLED', 50],
            ['w', 'play note %d.note for %n seconds', 'playNote', 60, 0.5],
            ['h', 'when distance %m.lessMore %n', 'whenDistance', strings.COMP_LESS, 50],
            ['h', 'when tilted %m.tiltDirAny', 'isTilted', strings.TILT_ANY],
            ['r', 'distance', 'getDistance'],
            ['b', 'tilted %m.tiltDirAny ?', 'isTilted', strings.TILT_ANY],
            ['r', 'tilt angle %m.tiltDir', 'getTilt', strings.TILT_UP]
        ],
        menus: {
            motor: [strings.MOTOR_DEFAULT, strings.MOTOR_A, strings.MOTOR_B, strings.MOTOR_ALL],
            motorDir: [strings.DIR_FORWARD, strings.DIR_BACK, strings.DIR_REV],
            tiltDir: [strings.TILT_UP, strings.TILT_DOWN, strings.TILT_LEFT, strings.TILT_RIGHT],
            tiltDirAny: [strings.TILT_ANY, strings.TILT_UP, strings.TILT_DOWN, strings.TILT_LEFT, strings.TILT_RIGHT],
            lessMore: [strings.COMP_LESS, strings.COMP_MORE],
            eNe: [strings.COMP_EQ, strings.COMP_NEQ]
        },
        url: '/info/help/studio/tips/ext/LEGO WeDo 2/'
    };
    ScratchExtensions.register('LEGO WeDo 2.0', descriptor, ext, { type: 'wedo2' });

    function Motor (motorIndex) {
        var motor = this;

        // Motor power: 0 to 100
        motor.power = 100;

        // Motor direction: 1 for "this way" or -1 for "that way"
        motor.dir = 1;

        // Is the motor currently on (not braking or drifting)?
        motor.isOn = false;

        // Pending timeout set by motorOnFor() or startBraking()
        motor.pendingTimeoutId = null;

        motor.setMotorOn = function () {
            if (device) {
                device.set_motor_on(motorIndex, motor.power * motor.dir);
                motor.isOn = true;
            }
        };

        motor.setMotorOnFor = function (milliseconds) {
            if (device) {
                motor.setMotorOn();
                motor.pendingTimeoutId = setTimeout(motor.startBraking, milliseconds);
            }
        };

        // Turn on the brake now, then turn the motor completely off in a bit to save battery
        var motorBrakeTime = 1000; // milliseconds
        motor.startBraking = function () {
            if (device) {
                device.set_motor_brake(motorIndex);
                motor.isOn = false;
                motor.pendingTimeoutId = setTimeout(motor.setMotorOff, motorBrakeTime);
            }
        };

        // Turn the motor off and forget the timeout ID
        motor.setMotorOff = function () {
            if (device) {
                device.set_motor_off(motorIndex);
                motor.isOn = false;

                motor.pendingTimeoutId = null;
            }
        };

        // If there's a pending timeout (off/break or on/off/break sequence) for the given motor, cancel it
        motor.cancelMotorTimeout = function () {
            if (device) {
                if (motor.pendingTimeoutId !== null) {
                    clearTimeout(motor.pendingTimeoutId);
                    motor.pendingTimeoutId = null;
                }
            }
        };
    }
})({});
