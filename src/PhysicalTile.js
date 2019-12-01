import autoBind from "auto-bind";

const RADIUS = 20;

export default class PhysicalTile {
    constructor(x, y) {
        autoBind(this);
        this.x = x;
        this.y = y;
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

    transmit(index, message) {
        // do nothing if neighbor isn't present
        if (!this.hasNeighbor(index)) return;

        const neighbor = this.neighbors[index];
        neighbor.receive({
            ...message,
            neighbor: (index + 3) % 6,
        });
    }

    receive(message) {
        this.toProcess.push(message);
    }

    hasPacket() {
        return this.toProcess.length > 0;
    }

    getPacket() {
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