import PhysicalTile from "./PhysicalTile";
import ApplicationNode from "./ApplicationNode";
import NetworkNode from "./NetworkNode";

export default class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.physical = new PhysicalTile(x, y);
    this.network = new NetworkNode(this.physical);
    this.application = new ApplicationNode(this.physical, this.network);
  }

  step() {
    this.network.processPackets();
    this.application.process();
  }
}

