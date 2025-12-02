// Wash Effect Sketch - Colorfield wash moving left to right
// Instance mode version for multi-slot loading

function createWashSketch(p) {
  // Wash state variables (scoped to this instance)
  let washActive = false;
  let washStartTime = 0;
  let washDuration = 1500;
  let washColor = [255, 200, 100]; // Default warm color

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.frameRate(60);
  };

  p.draw = () => {
    // Clear canvas (transparent background)
    p.clear();

    if (!washActive) return;

    const elapsed = p.millis() - washStartTime;

    if (elapsed < washDuration) {
      // Calculate wash progress (0 to 1)
      const progress = elapsed / washDuration;

      // Draw wash rectangle that moves from left to right
      const washWidth = p.windowWidth * 0.3; // 30% of screen width
      const centerX = p.windowWidth * progress; // Move across screen
      const startX = centerX - washWidth / 2;

      // Draw the wash with gradient effect
      p.noStroke();
      for (let i = 0; i < washWidth; i++) {
        // Gradient from center outward
        const distFromCenter = Math.abs(i - washWidth / 2);
        const alpha = Math.max(0, 1 - (distFromCenter / (washWidth / 2)));

        p.fill(washColor[0], washColor[1], washColor[2], alpha * 255);
        p.rect(startX + i, 0, 1, p.windowHeight);
      }
    } else {
      // Wash animation complete
      washActive = false;
    }
  };

  function triggerWash(color, duration = 1500) {
    washActive = true;
    washStartTime = p.millis();
    washDuration = duration; // Use provided duration directly

    if (color && Array.isArray(color) && color.length >= 3) {
      washColor = [color[0], color[1], color[2]];
    } else {
      washColor = [255, 200, 100]; // Default warm color
    }
  }

  // OSC Integration - Voice 1 handler
  p.updateFromOSC = (plaitsData, synthDuration) => {
    // Only respond to voice 1
    if (plaitsData.voice !== 1) {
      return;
    }

    // Map morph parameter to wash characteristics
    const morph = plaitsData.morph || 0.5;
    const timbre = plaitsData.timbre || 0.5;

    // Create wash color based on pitch and parameters
    let color = [255, 200, 100]; // Default warm color

    if (plaitsData.pitch !== undefined) {
      // Map MIDI pitch to hue, offset by 60° from voice 0 for differentiation
      const hue = (((plaitsData.pitch % 12) * 30) + 60) % 360;

      // Use morph for saturation, timbre for brightness
      const saturation = Math.min(95, morph * 100); // Higher saturation than voice 0
      const value = Math.max(60, timbre * 90); // Brighter colors

      color = hsvToRgb(hue, saturation, value);
    }

    // Use synth duration for wash animation with adaptive scaling
    let duration = 1500; // Default duration

    if (synthDuration) {
      // Scale wash duration with synth duration, but with intelligent limits
      duration = synthDuration * 1000;

      // For very fast patterns (< 200ms), use 60% of synth duration
      // This ensures wash completes before next trigger
      if (duration < 200) {
        duration = duration * 0.6;
      }
      // For medium speeds (200-800ms), use full synth duration
      else if (duration < 800) {
        duration = duration;
      }
      // For slow patterns (> 800ms), cap at reasonable maximum
      else {
        duration = Math.min(duration, 2000);
      }

      // Absolute minimum for visibility
      duration = Math.max(100, duration);
    }

    // Trigger wash animation
    triggerWash(color, duration);
  };

  // Utility: Convert HSV to RGB
  function hsvToRgb(h, s, v) {
    h = h / 360;
    s = s / 100;
    v = v / 100;

    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    let r, g, b;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}

// Make function globally available
window.createWashSketch = createWashSketch;