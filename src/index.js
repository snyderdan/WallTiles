import p5 from 'p5';


let markNeighbors = true;

const ASSIGN_ID = 1;
const ASSIGN_ACK = 2;
const WAVE = 3;
const TWO_PI = 6.28318530718;

class Tile {
  constructor(x, y, p) {
    this.x = x;
    this.y = y;
    this.p = p;

    this.id = undefined;
    this.nextId = undefined;
    this.root = false;
    this.assigning = undefined;
    this.nextAssign = 0;
    this.parent = undefined;
    this.active = false;
    this.color = this.p.color(this.p.random(0, 255), this.p.random(0, 255), this.p.random(0, 255));
    this.framestart = this.p.millis();
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

  render() {
    let increment = TWO_PI / Tile.nsides();

    if (this.active) {
      this.p.fill(this.color);
      this.p.stroke(0);
      this.drawNeighbors();
    } else {
      this.p.noFill();
      this.p.stroke(180);
    }

    this.p.beginShape();
    for (let i = 0; i <= TWO_PI; i += increment) {
      let nextX = this.x + (Tile.radius() - 1) * this.p.cos(i);
      let nextY = this.y + (Tile.radius() - 1) * this.p.sin(i);
      this.p.vertex(nextX, nextY);
    }

    this.p.endShape(this.p.CLOSE);
  }

  start() {
    setInterval(this.update.bind(this), 10);
  }

  drawNeighbors() {
    if (markNeighbors) {
      for (let neighbor of this.neighbors) {
        if (!neighbor) continue;
        this.p.point(neighbor.x, neighbor.y);
      }
    }
  }

  checkClick() {
    if (this.p.dist(this.p.mouseX, this.p.mouseY, this.x, this.y) < Tile.radius() * Math.sqrt(3) / 2) {
      this.active = !this.active;
      for (let neighbor of this.neighbors) {
        if (neighbor && neighbor.active) return;
      }

      this.root = true;
    }
  }

  static nsides() {
    return 6;
  }

  static radius() {
    return 20;
  }
}

let runBtn;
const tiles = [];
const containerElement = document.getElementById('p5-container');

const sketch = (p) => {
  let x = 100;
  let y = 100;

  p.setup = function() {
    p.createCanvas(700, 400);

    runBtn = p.createButton('Run');
    runBtn.position(20, 20);
    runBtn.mousePressed((evt) => {
      for (let tile of tiles) {
        tile.start();
      }
    });

    let offset = 0;
    let rows = [];
    for (let y = 0; y < 400; y += Tile.radius() * Math.sqrt(3) / 2) {
      let row = [];

      if (!offset) {
        offset = Tile.radius() * 1.5;
      } else {
        offset = 0;
      }

      for (let x = 0; x < 700; x += Tile.radius() * 3) {
        row.push(new Tile(x + offset, y, p));
      }

      rows.push(row);
    }

    for (let i = 0; i < rows.length; i++) {
      let tmp, row = rows[i];
      let offset = (i & 1) ? -1 : 1;
      let offsetIndexTop = (i & 1) ? 2 : 0;
      let nonOffsetIndexTop = (i & 1) ? 0 : 2;
      let offsetIndexBot = (i & 1) ? 3 : 5;
      let nonOffsetIndexBot = (i & 1) ? 5 : 3;

      for (let j = 0; j < row.length; j++) {
        let tile = row[j];
        tiles.push(tile);
        if ((tmp = rows[i - 2])) {
          tile.neighbors[1] = tmp[j];
        }

        if ((tmp = rows[i - 1])) {
          tile.neighbors[nonOffsetIndexTop] = tmp[j];
          tile.neighbors[offsetIndexTop] = tmp[j + offset];
        }

        if ((tmp = rows[i + 1])) {
          tile.neighbors[nonOffsetIndexBot] = tmp[j];
          tile.neighbors[offsetIndexBot] = tmp[j + offset];
        }

        if ((tmp = rows[i + 2])) {
          tile.neighbors[4] = tmp[j];
        }
      }
    }
  };

  p.draw = function() {
    p.background(220);
    for (let tile of tiles) {
      tile.render();
    }

    p.frameRate(30);
  };

  p.mousePressed = function() {
    for (let tile of tiles) {
      tile.checkClick();
    }
  };
};

new p5(sketch, containerElement);
