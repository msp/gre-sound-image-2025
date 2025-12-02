// Simple Recursion
// Instance mode version for multi-slot loading

function createRecursionSketch(p) {
  // OSC-controlled parameters (scoped to this instance)
  let recursionDepth = 3;
  let lineAlpha = 255;
  let lineWidth = 1;
  let randomnessAmount = 1.0;
  let centerOffset = 0;
  let volumeFade = 1; // Volume-based fade (0-1), default visible

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.frameRate(25);
  };

  p.draw = () => {
    p.clear(); // Clear the canvas each frame

    // Only draw if volume fade is above 0
    if (volumeFade <= 0) return;

    // Use OSC-controlled center position
    let centerX = p.windowWidth/2 + centerOffset;
    let centerY = p.randomGaussian(p.windowHeight/2, p.windowHeight/2);

    f(centerX, centerY, p.windowWidth);
  };

  // Recursive function
  function f(x,y,r) {
    // Use OSC-controlled line properties with volume fade
    const fadedAlpha = lineAlpha * volumeFade;
    p.stroke(255, 255, 255, fadedAlpha);
    p.strokeWeight(lineWidth);

    // OSC-controlled randomness amount
    let off = p.randomGaussian(x, r * randomnessAmount);

    p.line(x, y, x-r, y);

    // Use OSC-controlled recursion depth
    if(r > recursionDepth) {
      f(x + r/4, y + off, r/2);
      f(x - r/4, y - off, r/2);
    }
  }

  // OSC Integration
  p.updateFromOSC = (plaitsData, synthDuration) => {
    // zero indexed! voice 2 = plaits/3
    if (plaitsData.voice !== 2) {
      return; // Ignore other voices
    }

    // Map volume to fade (0-1)
    if (plaitsData.volume !== undefined) {
      volumeFade = Math.max(0, Math.min(1, plaitsData.volume));
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
  };
}

// Make function globally available
window.createRecursionSketch = createRecursionSketch;