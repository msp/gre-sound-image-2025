// Noise tends to look smoother with coordinates that are very close together
let xScale = 0.015;
let yScale = 0.02;

// OSC-controlled parameters
let gap = 20;
let offset = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(10); // Slow frame rate for animation
}

function draw() {
  clear(); // Clear canvas each frame (transparent background)

  // Animate offset over time if no OSC control
  offset += 2;

  dotGrid();
}

function dotGrid() {
  noStroke();
  fill(255, 255, 255, 200); // White dots with slight transparency

  // Loop through x and y coordinates, at increments set by gap
  for (let x = gap / 2; x < width; x += gap) {
    for (let y = gap / 2; y < height; y += gap) {
      // Calculate noise value using scaled and offset coordinates
      let noiseValue = noise((x + offset) * xScale, (y + offset) * yScale);

      // Since noiseValue will be 0-1, multiply it by gap to set diameter to
      // between 0 and the size of the gap between circles
      let diameter = noiseValue * gap;
      circle(x, y, diameter);
    }
  }
}

// OSC Integration
function updateFromOSC(plaitsData, synthDuration) {
  // Respond to plaits/3 (zero-indexed as voice 2)
  if (plaitsData.voice !== 2) {
    return; // Ignore other voices, respond to voice 2 (plaits/3)
  }

  // Map OSC parameters to noise controls
  if (plaitsData.harm !== undefined) {
    // harm controls gap size (5-50)
    gap = 5 + plaitsData.harm * 45;
  }

  if (plaitsData.timbre !== undefined) {
    // timbre controls animation speed
    offset += plaitsData.timbre * 10;
  }
}