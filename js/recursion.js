// Simple Recursion
// Instance mode version for multi-slot loading

function createRecursionSketch(p) {
  // OSC-controlled parameters (scoped to this instance)
  let recursionDepth = 3;
  let lineAlpha = 255;
  let lineWidth = 1;
  let randomnessAmount = 1.0;
  let centerOffset = 0;
  let envelopeActive = false; // Envelope-based visibility
  let envelopeStartTime = 0;
  let envelopeDuration = 1000;
  let envelopeFade = 0; // Current envelope fade (0-1)

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.frameRate(25);
  };

  p.draw = () => {
    p.clear(); // Clear the canvas each frame

    // Update envelope fade if active
    if (envelopeActive) {
      const elapsed = p.millis() - envelopeStartTime;

      if (elapsed < envelopeDuration) {
        // Match the audio ADSR envelope structure
        const progress = elapsed / envelopeDuration;

        // Audio envelope phases (approximated from actual audio params):
        // Attack: ~5% of duration (very fast)
        // Decay: ~20% of duration
        // Sustain: ~65% of duration
        // Release: ~10% of duration

        if (progress < 0.05) {
          // Attack phase - linear ramp up
          envelopeFade = progress / 0.05;
        } else if (progress < 0.25) {
          // Decay phase - ramp down to sustain level
          const decayProgress = (progress - 0.05) / 0.20;
          envelopeFade = 1.0 - (decayProgress * 0.3); // Decay to 70% (sustain level)
        } else if (progress < 0.9) {
          // Sustain phase - hold at sustain level
          envelopeFade = 0.7;
        } else {
          // Release phase - exponential decay to zero
          const releaseProgress = (progress - 0.9) / 0.1;
          envelopeFade = 0.7 * Math.pow(1.0 - releaseProgress, 2);
        }
      } else {
        // Envelope complete
        envelopeActive = false;
        envelopeFade = 0;
      }
    }

    // Only draw if envelope fade is above 0
    if (envelopeFade <= 0) return;

    // Use OSC-controlled center position
    let centerX = p.windowWidth/2 + centerOffset;
    let centerY = p.randomGaussian(p.windowHeight/2, p.windowHeight/2);

    f(centerX, centerY, p.windowWidth);
  };

  // Recursive function
  function f(x,y,r) {
    // Use OSC-controlled line properties with envelope fade
    const fadedAlpha = lineAlpha * envelopeFade;
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

    // Calculate the actual audio duration (matching AudioManager.mapOSCToNoiseParams)
    const dur = plaitsData.dur !== undefined ? plaitsData.dur : 0.3;
    const decay = plaitsData.decay !== undefined ? plaitsData.decay : 0.5;
    const clampedDecay = Math.max(0, Math.min(1, decay));
    const noteDuration = Math.min(dur * 0.9, clampedDecay * 2.0 + 0.2);
    const actualAudioDuration = Math.min(noteDuration, 3.0); // Cap at 3 seconds

    // Trigger envelope animation to sync with noise synthesis
    envelopeActive = true;
    envelopeStartTime = p.millis();
    envelopeDuration = actualAudioDuration * 1000; // Use actual audio duration
    envelopeFade = 1.0; // Start fully visible

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