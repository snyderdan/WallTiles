
export default class ApplicationNode {
    constructor(physicalTile, networkNode) {
        this.physical = physicalTile;
        this.network = networkNode;
        this.initialized = false;
    }

    process() {
        if (!this.initialized) {
            this.initialized = this.network.initialize();
        }
    }
}