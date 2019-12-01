import p5 from 'p5';
import Tile from './Tile';
import PhysicalTile from "./PhysicalTile";

const PI = Math.PI;
const containerElement = document.getElementById('p5-container');

const sketch = (p) => {
  let runBtn;
  let stopBtn;
  let rootTile;
  let running = false;
  const tiles = [];
  let hoveredTile = undefined;
  let insideOf = undefined;
  let neighborBorder = 220;

  const drawTile = (x, y, color, border) => {
    p.fill(color);
    p.stroke((border) ? border : 0);
    p.beginShape();

    const increment = 2 * PI / PhysicalTile.nsides();
    // draw vertexes of hexagon
    for (let i = 0; i <= 2 * PI; i += increment) {
      // subtract 1 from radius to create small border in-between neighboring tiles
      let nextX = x + (PhysicalTile.radius() - 1) * p.cos(i);
      let nextY = y + (PhysicalTile.radius() - 1) * p.sin(i);
      p.vertex(nextX, nextY);
    }

    p.endShape(p.CLOSE);
  };

  const mouseInTile = (x, y) => {
    // calculate relative coordinates in first quadrant
    const dx = Math.abs(x - p.mouseX);
    const dy = Math.abs(y - p.mouseY);
    // if the mouse is further than the radius, or higher than the height, it's definitely not in the tile
    if (dx > PhysicalTile.radius() || dy > PhysicalTile.innerRadius()) return false;
    // otherwise, check if point is below sloped side of hexagon
    // slope is -sqrt(3), offset is sqrt(3) * radius [derived from 2 points: (radius / 2, innerRadius) and (radius, 0)]
    return dy <= -Math.sqrt(3) * dx + Math.sqrt(3) * PhysicalTile.radius();
  };

  const checkHovered = (tile) => {
    if (hoveredTile !== tile && mouseInTile(tile.x, tile.y)) {
      // if this tile is hovered over, but is NOT the hovered tile, assign hoveredTile, and reset neighborBorder for fade in
      hoveredTile = tile;
      neighborBorder = 220;
    }

    if (hoveredTile === tile) {
      // if this tile is hovered, draw outlines of potential neighbor tiles that can be added
      let inBounds = mouseInTile(tile.x, tile.y);
      const centerDist = 2 * PhysicalTile.innerRadius();  // distance between the center of two neighbors
      for (let i = 0; i < 6; i++) {
        // iterate over neighbors; only draw a potential neighbor if no neighbor is present already
        if (!tile.physical.neighbors[i]) {
          // calculate center of potential neighbor
          let nX = tile.x + centerDist * p.cos(PI / 6 + i * PI / 3);
          let nY = tile.y - centerDist * p.sin(PI / 6 + i * PI / 3);
          let color = 220;

          if (mouseInTile(nX, nY)) {
            // if mouse is inside of this neighbor, flag the mouse as still in bounds
            inBounds = true;
            if (insideOf && nX === insideOf.x && nY === insideOf.y) {
              // if this neighbor continues to be hovered, continue to make it lighter
              color += 5 * insideOf.count;
              insideOf.count += 1;
            } else {
              // otherwise, assign as the new neighbor being hovered
              insideOf = {x: nX, y: nY, count: 0};
            }
          }
          // draw the potential neighbor, and a point at its center
          drawTile(nX, nY, color, neighborBorder);
          p.point(nX, nY);
        }
      }
      // if mouse is not 'in bounds' (not in the current tile, or any potential neighbors), clear hoveredTile
      if (!inBounds) hoveredTile = undefined;
      if (neighborBorder > 100) neighborBorder -= 10;
    }
  };

  p.mousePressed = () => {
    if (!rootTile) {
      // the first click will create the rootTile (in the real world, this will be the one getting power)
      rootTile = new Tile(p.mouseX, p.mouseY);
      rootTile.physical.root = true;
      tiles.push(rootTile);
    } else if (insideOf && mouseInTile(insideOf.x, insideOf.y)) {
      // if the mouse is inside the last recorded potential neighbor that was hovered over, create new tile
      const newTile = new Tile(insideOf.x, insideOf.y, p);
      const centerDist = 2 * PhysicalTile.innerRadius();
      const neighbors = [];

      for (let i = 0; i < 6; i++) {
        // get coordinates of potential neighbors of this new tile
        let nX = newTile.x + centerDist * p.cos(PI / 6 + i * PI / 3);
        let nY = newTile.y - centerDist * p.sin(PI / 6 + i * PI / 3);
        // call .toFixed(5) in order to hide inaccuracies of floating point math
        neighbors.push({x: nX.toFixed(5), y: nY.toFixed(5), index: i});
      }

      for (let tile of tiles) {
        // iterate through all existing tiles and see if any of these tiles are neighbors to the newly created tile
        for (let neighbor of neighbors) {
          if (neighbor.x === tile.x.toFixed(5) && neighbor.y === tile.y.toFixed(5)) {
            // if they are neighbors, add them to each others neighbor lists
            newTile.physical.neighbors[neighbor.index] = tile.physical;
            const oppositeIndex = (neighbor.index + 3) % 6;
            tile.physical.neighbors[oppositeIndex] = newTile.physical;
          }
        }
      }

      tiles.push(newTile);
    }
  };

  p.setup = () => {
    p.createCanvas(700, 400);

    runBtn = p.createButton('Run');
    runBtn.position(20, 20);
    runBtn.mousePressed(() => {
      console.log("Run pressed");
      running = true;
    });

    stopBtn = p.createButton('Stop');
    stopBtn.position(70, 20);
    stopBtn.mousePressed(() => {
      console.log("Stop pressed");
      running = false;
    });
  };

  p.draw = () => {
    p.background(220);

    for (let tile of tiles) {
      // draw existing tile
      drawTile(tile.x, tile.y,
          p.color(tile.physical.r_col, tile.physical.g_col, tile.physical.b_col));

      try {
        if (running) {
          tile.step();
        } else {
          checkHovered(tile);
        }
      } catch (error) {
        console.log(error);
      }

    }

    p.frameRate(30);
  };
};

const p5Inst = new p5(sketch, containerElement);
