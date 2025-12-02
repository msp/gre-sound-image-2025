// Flash Effect Sketch - Full screen color flash with fade
// Instance mode version for multi-slot loading

function createFlashSketch(p) {
  // Flash state variables (scoped to this instance)
  let flashActive = false;
  let flashStartTime = 0;
  let flashDuration = 1000;
  let flashColor = [255, 255, 255]; // Default white
  let flashIntensity = 1.0;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.frameRate(60);
  };

  p.draw = () => {
    // Clear canvas (transparent background)
    p.clear();

    if (!flashActive) return;

    const elapsed = p.millis() - flashStartTime;

    if (elapsed < flashDuration) {
      // Stay at full color for the synth duration
      const r = flashColor[0] * flashIntensity;
      const g = flashColor[1] * flashIntensity;
      const b = flashColor[2] * flashIntensity;
      p.background(r, g, b);
    } else {
      // Fade out after synth duration
      const fadeOutDuration = 300; // 300ms fade to black
      const fadeElapsed = elapsed - flashDuration;

      if (fadeElapsed < fadeOutDuration) {
        // Linear fade to black
        const fadeIntensity = 1.0 - (fadeElapsed / fadeOutDuration);
        const r = flashColor[0] * flashIntensity * fadeIntensity;
        const g = flashColor[1] * flashIntensity * fadeIntensity;
        const b = flashColor[2] * flashIntensity * fadeIntensity;
        p.background(r, g, b);
      } else {
        // Flash complete
        flashActive = false;
      }
    }
  };

  function triggerFlash(color, duration = 1000, intensity = 1.0) {
    flashActive = true;
    flashIntensity = Math.max(0, Math.min(1, intensity));
    flashStartTime = p.millis();
    flashDuration = Math.max(100, duration); // Minimum 100ms

    if (color && Array.isArray(color) && color.length >= 3) {
      flashColor = [color[0], color[1], color[2]];
    } else {
      flashColor = [255, 255, 255]; // White
    }
  }

  // OSC Integration - Voice 0 handler
  p.updateFromOSC = (plaitsData, synthDuration) => {
    // Only respond to voice 0
    if (plaitsData.voice !== 0) {
      return;
    }

    // Map harm parameter (0-1) to color intensity
    const colorIntensity = Math.max(0.2, plaitsData.harm || 0.5);

    // Map timbre parameter to color saturation
    const timbre = plaitsData.timbre || 0.5;

    // Create color based on pitch and timbre
    let color = [255, 255, 255]; // Default white

    if (plaitsData.pitch !== undefined) {
      // Map MIDI pitch to hue (C=0°, C#=30°, etc.)
      const hue = ((plaitsData.pitch % 12) * 30) % 360;

      // Convert HSV to RGB for color variation
      const saturation = Math.min(90, timbre * 100); // 0-90% (keep some color visible)
      const value = 85; // Slightly dimmed for easier reading of UI

      color = hsvToRgb(hue, saturation, value);
    }

    // Use the actual synth duration from audio manager
    const duration = synthDuration ? synthDuration * 1000 : 1000; // Convert to ms

    // Trigger flash
    triggerFlash(color, duration, colorIntensity);
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
window.createFlashSketch = createFlashSketch;