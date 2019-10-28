const RADIUS = 20;

const ASSIGN_ID = 1;
const ASSIGN_ACK = 2;
const WAVE = 3;

export default class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.id = undefined;
    this.nextId = undefined;
    this.root = false;
    this.assigning = undefined;
    this.nextAssign = 0;
    this.parent = undefined;
    this.active = false;
    this.r_col = Math.floor(Math.random() * 256);
    this.g_col = Math.floor(Math.random() * 256);
    this.b_col = Math.floor(Math.random() * 256);
    this.start = new Date().getTime();
    this.toProcess = [];
    this.neighbors = [];
    for (let i = 0; i < Tile.nsides(); i++) {
      this.neighbors[i] = null;
    }
  }

  transmit(message, neighborIndex) {
    if (neighborIndex) {
      // if we're communicating to a specific neighbor
      const neighbor = this.neighbors[neighborIndex];
      const inverse = (neighborIndex + 3) % 6;
      neighbor.recieve.bind(neighbor).recieve(message, inverse);
    } else {
      // if we're broadcasting to all neighbors
      for (let i=0; i<this.neighbors.length; i++) {
        const neighbor = this.neighbors[i];
        if (neighbor && neighbor.active) {
          const inverse = (i + 3) % 6;
          neighbor.recieve.bind(neighbor)(message, inverse);
        }
      }
    }
  }

  recieve(message, neighborIndex) {
    this.toProcess.push({
      msg: message,
      index: neighborIndex
    });
  }

  update() {
    if (!this.active) return;

    if (this.root && !this.id) {
      this.id = 1;
      this.nextId = 2;
      this.assigning = 0;
    }

    if (this.assigning !== this.nextAssign) {
      let neighbor;
      // search for valid nextAssign, if necessary
      while (!(neighbor = this.neighbors[this.nextAssign]) || !neighbor.active)
        this.nextAssign++;
      this.assigning = this.nextAssign;
      this.transmit({id: this.nextId});
    }

    while (this.toProcess.length > 0) {
      const entry = this.toProcess.shift();
      switch(entry.msg.type) {
        case WAVE:
          this.color = entry.msg.color;
      }
    }
  }

  start() {
    setInterval(this.update.bind(this), 10);
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
