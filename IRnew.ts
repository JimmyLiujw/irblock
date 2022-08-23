// MakerBit blocks supporting a Keyestudio Infrared Wireless Module Kit
// (receiver module+remote controller)


//
//% color=#0fbc11 icon="\u272a" block="IR block new"
//% category="IR block new"
namespace IRnew {
    let irLed: InfraredLed;

    class InfraredLed {
        private pin: AnalogPin;
        private waitCorrection: number;

        constructor(pin: AnalogPin) {
            this.pin = pin;
            pins.analogWritePin(this.pin, 0);
            pins.analogSetPeriod(this.pin, 26);

            // Measure the time we need for a minimal bit (analogWritePin and waitMicros)
            {
                const start = input.runningTimeMicros();
                const runs = 32;
                for (let i = 0; i < runs; i++) {
                    this.transmitBit(1, 1);
                }
                const end = input.runningTimeMicros();
                this.waitCorrection = Math.idiv(end - start - runs * 2, runs * 2);
            }

            // Insert a pause between callibration and first message
            control.waitMicros(2000);
        }

        public transmitBit(highMicros: number, lowMicros: number): void {
            pins.analogWritePin(this.pin, 511);
            control.waitMicros(highMicros);
            pins.analogWritePin(this.pin, 1);
            control.waitMicros(lowMicros);
        }

        public sendNec(hex32bit: string): void {
            if (hex32bit.length != 10) {
                return;
            }

            const NEC_HDR_MARK = 9000 - this.waitCorrection;
            const NEC_HDR_SPACE = 4500 - this.waitCorrection;
            const NEC_BIT_MARK = 560 - this.waitCorrection + 50;
            const NEC_HIGH_SPACE = 1690 - this.waitCorrection - 50;
            const NEC_LOW_SPACE = 560 - this.waitCorrection - 50;

            // Decompose 32bit HEX string into two manageable 16 bit numbers
            const addressSection = parseInt(hex32bit.substr(0, 6));
            const commandSection = parseInt("0x" + hex32bit.substr(6, 4));
            const sections = [addressSection, commandSection];

            // send the header
            this.transmitBit(NEC_HDR_MARK, NEC_HDR_SPACE);

            // send the address and command bits
            sections.forEach((section) => {
                let mask = 1 << 15;
                while (mask > 0) {
                    if (section & mask) {
                        this.transmitBit(NEC_BIT_MARK, NEC_HIGH_SPACE);
                    } else {
                        this.transmitBit(NEC_BIT_MARK, NEC_LOW_SPACE);
                    }
                    mask >>= 1;
                }
            });

            // mark the end of transmission
            this.transmitBit(NEC_BIT_MARK, 0);
        }
        public sendNecLong(hex: string): void {

            let len = (hex.length - 2)*4-1;
            const NEC_HDR_MARK = 9000 - this.waitCorrection;
            const NEC_HDR_SPACE = 4500 - this.waitCorrection;
            const NEC_BIT_MARK = 560 - this.waitCorrection + 50;
            const NEC_HIGH_SPACE = 1690 - this.waitCorrection - 50;
            const NEC_LOW_SPACE = 560 - this.waitCorrection - 50;



            // send the header
            this.transmitBit(NEC_HDR_MARK, NEC_HDR_SPACE);

            // send the address and command bits
            const section = parseInt(hex);
            let mask = 1 << len;
            while (mask > 0) {
                if (section & mask) {
                    this.transmitBit(NEC_BIT_MARK, NEC_HIGH_SPACE);
                } else {
                    this.transmitBit(NEC_BIT_MARK, NEC_LOW_SPACE);
                }
                mask >>= 1;
            }


            // mark the end of transmission
            this.transmitBit(NEC_BIT_MARK, 0);
        }
    }

    /**
     * Connects to the IR-emitting LED at the specified pin.
     * @param pin IR LED pin, eg: AnalogPin.P0
     */
    //% subcategory="IR Sender c"
    //% blockId="makerbit_infrared_sender_connect"
    //% block="connect IR sender LED at pin %pin"
    //% pin.fieldEditor="gridpicker"
    //% pin.fieldOptions.columns=4
    //% pin.fieldOptions.tooltips="false"
    //% weight=90
    export function connectIrSenderLed(pin: AnalogPin): void {
        irLed = new InfraredLed(pin);
    }

    /**
     * Sends a 32bit IR datagram using the NEC protocol.
     * @param hex32bit a 32bit hex string, eg: 0x00FF02FD
     */
    //% subcategory="IR Sender c"
    //% blockId="makerbit_infrared_sender_send_datagram"
    //% block="send IR datagram %hex32bit"
    //% weight=80
    export function sendIrDatagram(hex32bit: string): void {
        if (!irLed) {
            return;
        }
        irLed.sendNec(hex32bit);
    }
/**
     * Sends a long IR datagram using the NEC protocol.
     * @param hex a 32bit hex string, eg: 0x00FF02FD0098
     */
    //% subcategory="IR Sender c"
    //% blockId="makerbit_infrared_sender_send_long_datagram"
    //% block="send IR datagram long %hex"
    //% weight=80
    export function sendIrDatagramLong(hex: string): void {
        if (!irLed) {
            return;
        }
        irLed.sendNecLong(hex);
    }
    /**
     * Returns an NEC IR datagram as a 32bit hex string.
     * @param address an 8bit address, eg. 0
     * @param command an 8bit command, eg. 2
     */
    //% subcategory="IR Sender c"
    //% blockId=makerbit_infrared_sender_nec_datagram
    //% block="address %address | command %command"
    //% address.min=0 address.max=255
    //% command.min=0 command.max=255
    //% weight=56
    export function irNec(address: number, command: number): string {
        const addrSection = ((address & 0xff) << 8) | (~address & 0xff);
        const cmdSection = ((command & 0xff) << 8) | (~command & 0xff);
        return "0x" + to16BitHex(addrSection) + to16BitHex(cmdSection);
    }

    function to16BitHex(value: number): string {
        let hex = "";
        for (let pos = 0; pos < 4; pos++) {
            let remainder = value % 16;
            if (remainder < 10) {
                hex = remainder.toString() + hex;
            } else {
                hex = String.fromCharCode(55 + remainder) + hex;
            }
            value = Math.idiv(value, 16);
        }
        return hex;
    }
    export namespace background {

        export enum Thread {
            Priority = 0,
            UserCallback = 1,
        }

        export enum Mode {
            Repeat,
            Once,
        }

        class Executor {
            _newJobs: Job[] = undefined;
            _jobsToRemove: number[] = undefined;
            _pause: number = 100;
            _type: Thread;

            constructor(type: Thread) {
                this._type = type;
                this._newJobs = [];
                this._jobsToRemove = [];
                control.runInParallel(() => this.loop());
            }

            push(task: () => void, delay: number, mode: Mode): number {
                if (delay > 0 && delay < this._pause && mode === Mode.Repeat) {
                    this._pause = Math.floor(delay);
                }
                const job = new Job(task, delay, mode);
                this._newJobs.push(job);
                return job.id;
            }

            cancel(jobId: number) {
                this._jobsToRemove.push(jobId);
            }

            loop(): void {
                const _jobs: Job[] = [];

                let previous = control.millis();

                while (true) {
                    const now = control.millis();
                    const delta = now - previous;
                    previous = now;

                    // Add new jobs
                    this._newJobs.forEach(function (job: Job, index: number) {
                        _jobs.push(job);
                    });
                    this._newJobs = [];

                    // Cancel jobs
                    this._jobsToRemove.forEach(function (jobId: number, index: number) {
                        for (let i = _jobs.length - 1; i >= 0; i--) {
                            const job = _jobs[i];
                            if (job.id == jobId) {
                                _jobs.removeAt(i);
                                break;
                            }
                        }
                    });
                    this._jobsToRemove = []


                    // Execute all jobs
                    if (this._type === Thread.Priority) {
                        // newest first
                        for (let i = _jobs.length - 1; i >= 0; i--) {
                            if (_jobs[i].run(delta)) {
                                this._jobsToRemove.push(_jobs[i].id)
                            }
                        }
                    } else {
                        // Execute in order of schedule
                        for (let i = 0; i < _jobs.length; i++) {
                            if (_jobs[i].run(delta)) {
                                this._jobsToRemove.push(_jobs[i].id)
                            }
                        }
                    }

                    basic.pause(this._pause);
                }
            }
        }

        class Job {
            id: number;
            func: () => void;
            delay: number;
            remaining: number;
            mode: Mode;

            constructor(func: () => void, delay: number, mode: Mode) {
                this.id = randint(0, 2147483647)
                this.func = func;
                this.delay = delay;
                this.remaining = delay;
                this.mode = mode;
            }

            run(delta: number): boolean {
                if (delta <= 0) {
                    return false;
                }

                this.remaining -= delta;
                if (this.remaining > 0) {
                    return false;
                }

                switch (this.mode) {
                    case Mode.Once:
                        this.func();
                        basic.pause(0);
                        return true;
                    case Mode.Repeat:
                        this.func();
                        this.remaining = this.delay;
                        basic.pause(0);
                        return false;
                }
            }
        }

        const queues: Executor[] = [];

        export function schedule(
            func: () => void,
            type: Thread,
            mode: Mode,
            delay: number,
        ): number {
            if (!func || delay < 0) return 0;

            if (!queues[type]) {
                queues[type] = new Executor(type);
            }

            return queues[type].push(func, delay, mode);
        }

        export function remove(type: Thread, jobId: number): void {
            if (queues[type]) {
                queues[type].cancel(jobId);
            }
        }
    }
    let irState: IrState;

    const IR_REPEAT = 256;
    const IR_INCOMPLETE = 257;
    const IR_DATAGRAM = 258;

    const REPEAT_TIMEOUT_MS = 220;

    interface IrState {
        protocol: IrProtocol;
        hasNewDatagram: boolean;
        bitsReceived: number;
        //addressSectionBits: number;
        //commandSectionBits: number;
        allSectionBits: number;
        maxBitsReceived: number;
        allbitRecived: number;
        // hiword: number;
        //loword: number;
        activeCommand: number;
        repeatTimeout: number;
        onIrButtonPressed: IrButtonHandler[];
        onIrButtonReleased: IrButtonHandler[];
        onIrDatagram: () => void;
    }
    class IrButtonHandler {
        irButton: IrButton;
        onEvent: () => void;

        constructor(
            irButton: IrButton,
            onEvent: () => void
        ) {
            this.irButton = irButton;
            this.onEvent = onEvent;
        }
    }


    function appendBitToDatagram(bit: number): number {
        irState.bitsReceived += 1;
        irState.allbitRecived = (irState.allbitRecived << 1) + bit;
        /* if (irState.bitsReceived <= 8) {
             irState.hiword = (irState.hiword << 1) + bit;
             if (irState.protocol === IrProtocol.Keyestudio && bit === 1) {
                 // recover from missing message bits at the beginning
                 // Keyestudio address is 0 and thus missing bits can be detected
                 // by checking for the first inverse address bit (which is a 1)
                 irState.bitsReceived = 9;
                 irState.hiword = 1;
             }
         } else if (irState.bitsReceived <= 16) {
             irState.hiword = (irState.hiword << 1) + bit;
         } else if (irState.bitsReceived <= 32) {
             irState.loword = (irState.loword << 1) + bit;
         }
 */
        if (irState.bitsReceived === 64) {
            // irState.addressSectionBits = irState.hiword & 0xffff;
            // irState.commandSectionBits = irState.loword & 0xffff;
            irState.allSectionBits = irState.allbitRecived;
            irState.allbitRecived = 0;
            return IR_DATAGRAM;
        } else {
            return IR_INCOMPLETE;
        }
    }

    function decode(markAndSpace: number): number {
        if (markAndSpace < 1600) {
            // low bit
            return appendBitToDatagram(0);
        } else if (markAndSpace < 2700) {
            // high bit
            return appendBitToDatagram(1);
        }
        if (irState.bitsReceived > irState.maxBitsReceived) { irState.maxBitsReceived = irState.bitsReceived }
        if (irState.allbitRecived > 0) {
            irState.allSectionBits = irState.allbitRecived;
            irState.allbitRecived = 0;
            return IR_DATAGRAM;
        }
        irState.bitsReceived = 0;

        if (markAndSpace < 12500) {
            // Repeat detected
            return IR_REPEAT;
        } else if (markAndSpace < 14500) {
            // Start detected
            return IR_INCOMPLETE;
        } else { return IR_INCOMPLETE; }
    }

    function enableIrMarkSpaceDetection(pin: DigitalPin) {
        pins.setPull(pin, PinPullMode.PullNone);

        let mark = 0;
        let space = 0;

        pins.onPulsed(pin, PulseValue.Low, () => {
            // HIGH, see https://github.com/microsoft/pxt-microbit/issues/1416
            mark = pins.pulseDuration();
        });

        pins.onPulsed(pin, PulseValue.High, () => {
            // LOW
            space = pins.pulseDuration();
            const status = decode(mark + space);

            if (status !== IR_INCOMPLETE) {
                handleIrEvent(status);
            }
        });
    }

    function handleIrEvent(irEvent: number) {

        // Refresh repeat timer
        if (irEvent === IR_DATAGRAM || irEvent === IR_REPEAT) {
            irState.repeatTimeout = input.runningTime() + REPEAT_TIMEOUT_MS;
        }

        if (irEvent === IR_DATAGRAM) {
            irState.hasNewDatagram = true;

            if (irState.onIrDatagram) {
                background.schedule(irState.onIrDatagram, background.Thread.UserCallback, background.Mode.Once, 0);
            }

            const newCommand = irState.allSectionBits >> 8;

            // Process a new command
            if (newCommand !== irState.activeCommand) {

                if (irState.activeCommand >= 0) {
                    const releasedHandler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                    if (releasedHandler) {
                        background.schedule(releasedHandler.onEvent, background.Thread.UserCallback, background.Mode.Once, 0);
                    }
                }

                const pressedHandler = irState.onIrButtonPressed.find(h => h.irButton === newCommand || IrButton.Any === h.irButton);
                if (pressedHandler) {
                    background.schedule(pressedHandler.onEvent, background.Thread.UserCallback, background.Mode.Once, 0);
                }

                irState.activeCommand = newCommand;
            }
        }
    }

    function initIrState() {
        if (irState) {
            return;
        }

        irState = {
            protocol: undefined,
            bitsReceived: 0,
            hasNewDatagram: false,
            // addressSectionBits: 0,
            // commandSectionBits: 0,
            maxBitsReceived: 0,
            allbitRecived: 0,
            allSectionBits: 0,
            //  hiword: 0, // TODO replace with uint32
            //  loword: 0,
            activeCommand: -1,
            repeatTimeout: 0,
            onIrButtonPressed: [],
            onIrButtonReleased: [],
            onIrDatagram: undefined,
        };
    }

    /**
     * Connects to the IR receiver module at the specified pin and configures the IR protocol.
     * @param pin IR receiver pin, eg: DigitalPin.P0
     * @param protocol IR protocol, eg: IrProtocol.Keyestudio
     */
    //% subcategory="IR Receiver"
    //% blockId="makerbit_infrared_connect_receiver"
    //% block="connect IR receiver at pin %pin and decode %protocol"
    //% pin.fieldEditor="gridpicker"
    //% pin.fieldOptions.columns=4
    //% pin.fieldOptions.tooltips="false"
    //% weight=90
    export function connectIrReceiver(
        pin: DigitalPin,
        protocol: IrProtocol
    ): void {
        initIrState();

        if (irState.protocol) {
            return;
        }

        irState.protocol = protocol;

        enableIrMarkSpaceDetection(pin);

        background.schedule(notifyIrEvents, background.Thread.Priority, background.Mode.Repeat, REPEAT_TIMEOUT_MS);
    }

    function notifyIrEvents() {
        if (irState.activeCommand === -1) {
            // skip to save CPU cylces 
        } else {
            const now = input.runningTime();
            if (now > irState.repeatTimeout) {
                // repeat timed out

                const handler = irState.onIrButtonReleased.find(h => h.irButton === irState.activeCommand || IrButton.Any === h.irButton);
                if (handler) {
                    background.schedule(handler.onEvent, background.Thread.UserCallback, background.Mode.Once, 0);
                }

                irState.bitsReceived = 0;
                irState.allbitRecived = 0;
                irState.activeCommand = -1;
            }
        }
    }

    /**
     * Do something when a specific button is pressed or released on the remote control.
     * @param button the button to be checked
     * @param action the trigger action
     * @param handler body code to run when the event is raised
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_on_ir_button
    //% block="on IR button | %button | %action"
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% weight=50
    export function onIrButton(
        button: IrButton,
        action: IrButtonAction,
        handler: () => void
    ) {
        initIrState();
        if (action === IrButtonAction.Pressed) {
            irState.onIrButtonPressed.push(new IrButtonHandler(button, handler));
        }
        else {
            irState.onIrButtonReleased.push(new IrButtonHandler(button, handler));
        }
    }

    /**
     * Returns the code of the IR button that was pressed last. Returns -1 (IrButton.Any) if no button has been pressed yet.
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_ir_button_pressed
    //% block="IR button"
    //% weight=70
    export function irButton(): number {
        basic.pause(0); // Yield to support background processing when called in tight loops
        if (!irState) {
            return IrButton.Any;
        }
        return irState.allSectionBits >> 8;
    }

    /**
     * Do something when an IR datagram is received.
     * @param handler body code to run when the event is raised
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_on_ir_datagram
    //% block="on IR datagram received"
    //% weight=40
    export function onIrDatagram(handler: () => void) {
        initIrState();
        irState.onIrDatagram = handler;
    }

    /**
     * Returns the IR datagram as hexadecimal string.
     * The last received datagram is returned or "0x00000000" if no data has been received yet.
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_ir_datagram
    //% block="IR datagram"
    //% weight=30
    export function irDatagram(): string {
        basic.pause(0); // Yield to support background processing when called in tight loops
        initIrState();
        /*
        return (
            "0x" +
            ir_rec_to16BitHex(irState.addressSectionBits) +
            ir_rec_to16BitHex(irState.commandSectionBits)
        );
        */
        return ("0x" + ir_rec_toHex(irState.allSectionBits));
    }

    /**
     * Returns true if any IR data was received since the last call of this function. False otherwise.
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_was_any_ir_datagram_received
    //% block="IR data was received"
    //% weight=80
    export function wasIrDataReceived(): boolean {
        basic.pause(0); // Yield to support background processing when called in tight loops
        initIrState();
        if (irState.hasNewDatagram) {
            irState.hasNewDatagram = false;
            return true;
        } else {
            return false;
        }
    }
    /**
         * TODO: describe your function here
         * @param value describe value here, eg: 5
         */
    //% subcategory="IR Receiver"
    //% blockId=ir_datagram_received_maxbit
    //% block="IR data maxBit"
    //% weight=80
    export function maxBit(): number {
        return irState.maxBitsReceived;
    }
    /**
     * Returns the command code of a specific IR button.
     * @param button the button
     */
    //% subcategory="IR Receiver"
    //% blockId=makerbit_infrared_button_code
    //% button.fieldEditor="gridpicker"
    //% button.fieldOptions.columns=3
    //% button.fieldOptions.tooltips="false"
    //% block="IR button code %button"
    //% weight=60
    export function irButtonCode(button: IrButton): number {
        basic.pause(0); // Yield to support background processing when called in tight loops
        return button as number;
    }

    function ir_rec_to16BitHex(value: number): string {
        let hex = "";
        for (let pos = 0; pos < 4; pos++) {
            let remainder = value % 16;
            if (remainder < 10) {
                hex = remainder.toString() + hex;
            } else {
                hex = String.fromCharCode(55 + remainder) + hex;
            }
            value = Math.idiv(value, 16);
        }
        return hex;
    }
    function ir_rec_toHex(value: number): string {
        let hex = "";
        while (value > 0) {
            let remainder = value % 16;
            if (remainder < 10) {
                hex = remainder.toString() + hex;
            } else {
                hex = String.fromCharCode(55 + remainder) + hex;
            }
            value = Math.idiv(value, 16);
        }
        return hex;
    }
}
// 在此处添加您的代码
