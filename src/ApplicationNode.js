
const GYR_SINE_WAVE = 1;

export default class ApplicationNode {
    constructor(physicalTile, networkNode) {
        this.physical = physicalTile;
        this.network = networkNode;
        this.initialized = false;
        this.step = 0;
        this.lastFrame = this.physical.getMillis();
    }

    sendToNeighbors(packet) {
        for (let i=0; i<6; i++) {
            if (this.physical.hasNeighbor(i)) {
                this.network.sendToNeighbor(i, packet);
            }
        }
    }

    GYRWave(value) {
        // send current color to
        this.sendToNeighbors({
            action: GYR_SINE_WAVE,
            value: this.currentValue,
            step: this.step,
        });

        this.currentValue = value;
        // simple test sending waves going from red (1) to yellow (0) to green (-1)
        if (value < 0) {
            // scale red value for yellow-green transition
            this.physical.setColor(255 * (1 + value), 255, 0);
        } else {
            // scale green value for yellow-red transition
            this.physical.setColor(255, 255 * (1 - value), 0);
        }
    }

    process() {
        if (!this.initialized) {
            this.initialized = this.network.initialize();

            if (this.initialized && this.physical.isRoot())
                this.currentValue = Math.sin(this.physical.getMillis() / 200);

        } else {
            const millis = this.physical.getMillis();
            if (this.physical.isRoot() && millis > (this.lastFrame + 20)) {
                this.GYRWave(Math.sin(millis / 200));
                this.lastFrame = millis;
                this.step++;
            }

            while (this.network.hasPacket()) {
                let packet = this.network.getPacket();
                if (packet.action === GYR_SINE_WAVE && packet.step > this.step) {
                    this.step = packet.step;
                    this.GYRWave(packet.value);
                }
            }
        }
    }
}