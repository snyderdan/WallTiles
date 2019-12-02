
export default class ApplicationNode {
    constructor(physicalTile, networkNode) {
        this.physical = physicalTile;
        this.network = networkNode;
        this.initialized = false;
        this.nextCycle = this.physical.getMillis() + 2000;
        this.nextAddress = 19;
    }

    process() {
        if (!this.initialized) {
            this.initialized = this.network.initialize();
        } else {
            if (this.physical.isRoot() && (this.physical.getMillis() >= this.nextCycle)) {
                this.network.send(this.nextAddress--, {r: 255, g: 0, b: 0});
                this.nextCycle = this.physical.getMillis() + 1000;
            }

            while (this.network.hasPacket()) {
                let packet = this.network.getPacket();
                this.physical.setColor(packet.r, packet.g, packet.b);
            }
        }
    }
}