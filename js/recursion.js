// Simple Recursion

// OSC-controlled parameters
let recursionDepth = 3;
let lineAlpha = 255;
let lineWidth = 1;
let randomnessAmount = 1.0;
let centerOffset = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
}

function draw() {
  clear(); // Clear the canvas each frame
  frameRate(5);

  // Use OSC-controlled center position
  let centerX = width/2 + centerOffset;
  let centerY = randomGaussian(height/2, height/2);

  f(centerX, centerY, width);
}

// Recursive function
function f(x,y,r) {
  // Use OSC-controlled line properties
  stroke(255, 255, 255, lineAlpha);
  strokeWeight(lineWidth);

  // OSC-controlled randomness amount
  let off = randomGaussian(x, r * randomnessAmount);

  line(x, y, x-r, y);

  // Use OSC-controlled recursion depth
  if(r > recursionDepth) {
    f(x + r/4, y + off, r/2);
    f(x - r/4, y - off, r/2);
  }
}

// OSC Integration
function updateFromOSC(plaitsData, synthDuration) {
  // zero indexed! voice 2 = plaits/3
  if (plaitsData.voice !== 2) {
    return; // Ignore other voices
  }

  // Map OSC parameters to sketch controls
  if (plaitsData.harm !== undefined) {
    // harm (0-1) controls recursion depth (3-20)
    recursionDepth = 3 + plaitsData.harm * 17;
  }

  if (plaitsData.timbre !== undefined) {
    // timbre (0-1) controls line width (0.5-8)
    lineWidth = 0.5 + plaitsData.timbre * 7.5;
  }

  if (plaitsData.morph !== undefined) {
    // morph (0-1) controls randomness amount (0.2-1.5)
    randomnessAmount = 0.2 + plaitsData.morph * 1.3;
  }

  if (plaitsData.pitch !== undefined) {
    // pitch (MIDI note) controls horizontal offset (-150 to +150)
    let normalizedPitch = (plaitsData.pitch - 60) / 24; // Center around C4, ±2 octaves
    centerOffset = normalizedPitch * 150;
  }

}