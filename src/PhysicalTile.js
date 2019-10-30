import autoBind from "auto-bind";

const RADIUS = 20;

export default class PhysicalTile {
    constructor() {
        autoBind(this);
        this.r_col = Math.floor(Math.random() * 256);
        this.g_col = Math.floor(Math.random() * 256);
        this.b_col = Math.floor(Math.random() * 256);
        this.startTime = new Date().getTime();
        this.toProcess = [];
        this.neighbors = [];
        this.root = false;

        for (let i = 0; i < PhysicalTile.nsides(); i++) {
            this.neighbors[i] = null;
        }
    }

    hasNeighbor(index) {
        return !!this.neighbors[index];
    }

    transmit(message, index) {
        // do nothing if neighbor isn't present
        if (!this.hasNeighbor(index)) return;

        const neighbor = this.neighbors[index];
        neighbor.receive({
            from: (index + 3) % 6,
            payload: message,
        });
    }

    receive(message) {
        this.toProcess.push(message);
    }

    hasPacket() {
        return this.toProcess.length > 0;
    }

    getNext() {
        return this.toProcess.shift();
    }

    getMillis() {
        return new Date().getTime() - this.startTime;
    }

    setColor(r, g, b) {
        this.r_col = r;
        this.g_col = g;
        this.b_col = b;
    }

    isRoot() {
        return this.root;
    }

    static nsides() {
        return 6;
    }

    static radius() {
        return RADIUS;
    }

    static innerRadius() {
        return RADIUS * Math.sqrt(3) / 2;
    }
}