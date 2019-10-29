const RADIUS = 20;
const PI = 3.141592653589793;

const DFS_ASSIGN_ID = 1;
const BFS_ASSIGN_ID = 2;
const ASSIGN_ACK = 100;
const ASSIGN_NACK = 101;
const COLOR_DROP = 200;

export default class Tile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.running = false;
    this.update = this.update.bind(this);

    // core information about this particular tile
    this.id = undefined;
    this.root = false;
    this.r_col = Math.floor(Math.random() * 256);
    this.g_col = Math.floor(Math.random() * 256);
    this.b_col = Math.floor(Math.random() * 256);
    this.startTime = new Date().getTime();
    this.toProcess = [];
    this.neighbors = [];
    for (let i = 0; i < Tile.nsides(); i++) {
      this.neighbors[i] = null;
    }

    // information needed to be stored between update cycles
    this.parent = undefined;
    this.nextID = undefined;
    this.lastMessageId = undefined;
    this.depth = undefined;
    this.assigning = undefined;
    this.nextAssign = undefined;
  }

  transmit(message, neighborIndex) {
    const neighbor = this.neighbors[neighborIndex];
    const inverse = (neighborIndex + 3) % 6;
    message.fromIndex = inverse;
    message.fromId = this.id;
    neighbor.recieve.bind(neighbor)(message);
  }

  recieve(message) {
    this.toProcess.push(message);
  }

  nextColor() {
    const delta = new Date().getTime() - this.startTime;
    const angle = (2 * PI * delta / 5000) % (2 * PI);  // one full period should be 5s
    // cycle over HSL color wheel
    const hue = angle / (2 * PI);

    return {
      r: 255 * (hue + 0.333),
      g: 255 * hue,
      b: 255 * (hue - 0.333),
    }
  }

  update() {
    /* TODO: finish ID assignment code...for now do the drop wave
    if (this.root && !this.id) {
      // if we're the root tile, with no ID, begin ID assignment process
      this.id = 1;
      this.nextId = 2;
      this.nextAssign = 0;
    }

    if (this.assigning !== this.nextAssign) {
      let neighbor = this.neighbors[this.nextAssign];
      // search for valid nextAssign
      while (!neighbor && this.nextAssign < 6) {
        this.nextAssign++;
        neighbor = this.neighbors[this.nextAssign];
      }

      if (this.nextAssign === 6 && this.parent) {
        // if we've assigned all our neighbors and we have a parent, notify them
        this.transmit({type: ASSIGN_ACK, nextId: this.nextId}, this.parent);
        return;
      } else if (this.nextAssign == 6) {
        // this is the root node; stop assigning process
        this.assigning = undefined;
        this.nextAssign = undefined;
        return;
      }
      // assign id to our children
      this.assigning = this.nextAssign;
      this.transmit({type: BFS_ASSIGN_ID, nextId: this.nextId, depth: this.depth + 1}, this.assigning);
    }
    */

    if (this.root) {
      if (!this.lastMessageId) this.lastMessageId = 1;
      const color = this.nextColor();

      for (let i=0; i<6; i++) {
        if (!this.neighbors[i]) continue;
        this.transmit({
          type: COLOR_DROP,
          messageId: this.lastMessageId,
          r: this.r_col,
          g: this.g_col,
          b: this.b_col,
        }, i);
      }

      this.lastMessageId++;
      this.r_col = color.r;
      this.g_col = color.g;
      this.b_col = color.b;
    }

    while (this.toProcess.length > 0) {
      const entry = this.toProcess.shift();
      switch(entry.type) {
        case BFS_ASSIGN_ID:
          if (!this.id) {
            // on the first BFS assignment, respond to our parent that we've accepted our ID
            this.parent = entry.fromIndex;
            this.id = entry.id;
            this.nextId = this.id + 1;
            this.depth = entry.depth;
            this.r_col = this.depth * 20;
            this.g_col = this.depth * 20;
            this.b_col = this.depth * 20;
            this.transmit({type: ASSIGN_ACK, nextId: this.nextId}, this.parent);
          } else if (this.parent === entry.fromIndex) {
            // subsequent BFS assigns are assigning to our children
            this.nextId = entry.nextId;
            this.nextAssign = 0;
          } else {
            // BFS assign from a neighbor that isn't our parent
            this.transmit({type: ASSIGN_NACK}, entry.fromIndex);
          }

        case ASSIGN_ACK:
          if (this.nextId === entry.nextId) {
            // no assignments made, so stop assignment attempts
            this.assigning = undefined;
            this.nextAssign = undefined;
          } else {
            // an assignment was made,
            this.nextAssign++;
          }

        case COLOR_DROP:
          // ignore messages we've already recieved
          if (entry.messageId === this.lastMessageId) return;
          for (let i=0; i<6; i++) {
            // send our color to applicable neighbors
            if (this.neighbors[i] && i !== entry.fromIndex) {
              this.transmit({
                type: COLOR_DROP,
                messageId: entry.messageId,
                r: this.r_col,
                g: this.g_col,
                b: this.b_col,
              }, i);
            }
          }
          // assign our color
          this.r_col = entry.r;
          this.g_col = entry.g;
          this.b_col = entry.b;
          this.lastMessageId = entry.messageId;
      }
    }

    if (this.running) {
      window.requestAnimationFrame(this.update);
    }
  }

  start() {
    this.running = true;
    window.requestAnimationFrame(this.update);
  }

  stop() {
    this.running = false;
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
