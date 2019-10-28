import p5 from 'p5';


let markNeighbors = true;

const ASSIGN_ID = 1;
const ASSIGN_ACK = 2;
const WAVE = 3;
const PI = 3.141592653589793;
const RADIUS = 20;

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
    this.r_col = Math.floor(Math.random() * 256);
    this.g_col = Math.floor(Math.random() * 256);
    this.b_col = Math.floor(Math.random() * 256);
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

let runBtn;
let rootTile;
const tiles = [];
const containerElement = document.getElementById('p5-container');

const sketch = (p) => {
  const drawTile = (x, y, color, border) => {
    p.fill(color);
    p.stroke((border) ? border : 0);
    p.beginShape();

    const increment = 2 * PI / Tile.nsides();
    for (let i = 0; i <= 2 * PI; i += increment) {
      let nextX = x + (Tile.radius() - 1) * p.cos(i);
      let nextY = y + (Tile.radius() - 1) * p.sin(i);
      p.vertex(nextX, nextY);
    }

    p.endShape(p.CLOSE);
  };

  const drawNeighbors = (x, y) => {

  };

  const mouseInTile = (x, y) => {
    const dx = Math.abs(x - p.mouseX);
    const dy = Math.abs(y - p.mouseY);
    if (dx > Tile.radius() || dy > Tile.innerRadius()) return false;
    return dy <= - Math.sqrt(3) * dx + Math.sqrt(3) * Tile.radius();
  };

  p.setup = function() {
    p.createCanvas(700, 400);

    runBtn = p.createButton('Run');
    runBtn.position(20, 20);
    runBtn.mousePressed((evt) => {
      for (let tile of tiles) {
        tile.start();
      }
    });
  };

  let hoveredTile = undefined;
  let insideOf = undefined;
  let neighborBorder = 220;

  p.draw = function() {
    p.background(220);
    for (let tile of tiles) {
      drawTile(tile.x, tile.y, p.color(tile.r_col, tile.g_col, tile.b_col));

      if (hoveredTile !== tile && mouseInTile(tile.x, tile.y)) {
        hoveredTile = tile;
        neighborBorder = 220;
      }

      if (hoveredTile === tile) {
        let inBounds = mouseInTile(tile.x, tile.y);
        const centerDist = 2 * Tile.innerRadius();
        for (let i=0; i<6; i++) {
          if (!tile.neighbors[i]) {
            let nX = tile.x + centerDist * p.cos(PI / 6 + i * PI / 3);
            let nY = tile.y + centerDist * p.sin(PI / 6 + i * PI / 3);
            let color = 220;

            if (mouseInTile(nX, nY)) {
              inBounds = true;
              if (insideOf && nX === insideOf.x && nY === insideOf.y) {
                color += 5 * insideOf.count;
                insideOf.count += 1;
              } else {
                insideOf = {x: nX, y: nY, count: 0};
              }
            }

            drawTile(nX, nY, color, neighborBorder);
            p.point(nX, nY);
          }
        }

        if (!inBounds) hoveredTile = undefined;
        if (neighborBorder > 100) neighborBorder -= 10;
      }
    }

    p.frameRate(30);
  };

  p.mousePressed = function() {
    if (!rootTile) {
      rootTile = new Tile(p.mouseX, p.mouseY, p);
      tiles.push(rootTile);
    } else if (mouseInTile(insideOf.x, insideOf.y)) {
      const newTile = new Tile(insideOf.x, insideOf.y, p);
      const centerDist = 2 * Tile.innerRadius();
      const neighbors = [];

      for (let i=0; i<6; i++) {
        let nX = newTile.x + centerDist * p.cos(PI / 6 + i * PI / 3);
        let nY = newTile.y + centerDist * p.sin(PI / 6 + i * PI / 3);
        neighbors.push({x: nX.toFixed(5), y: nY.toFixed(5), index: i});
      }

      for (let tile of tiles) {
        for (let neighbor of neighbors) {
          if (neighbor.x === tile.x.toFixed(5) && neighbor.y === tile.y.toFixed(5)) {
            newTile.neighbors[neighbor.index] = tile;
            const oppositeIndex = (neighbor.index + 3) % 6;
            tile.neighbors[oppositeIndex] = newTile;
          }
        }
      }

      tiles.push(newTile);
    }
  };
};

new p5(sketch, containerElement);
