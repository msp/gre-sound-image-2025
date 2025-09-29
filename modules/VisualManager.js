export class VisualManager {
  constructor() {
    this.p5Instance = null;
    this.colorIntensity = 0;
    this.currentColor = [0, 0, 0]; // RGB
    this.isColored = false;
    this.colorStartTime = 0;
    this.colorDuration = 0;
  }

  initialize() {
    // Create p5.js instance
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        this.setupP5(p);
      };

      p.draw = () => {
        this.drawP5(p);
      };

      p.windowResized = () => {
        this.resizeP5(p);
      };
    });

    console.log('✅ Visual Manager initialized with p5.js');
  }

  setupP5(p) {
    // Create fullscreen canvas
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);

    // Position canvas behind other elements
    canvas.parent(document.body);
    canvas.style('position', 'fixed');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('z-index', '-1');
    canvas.style('pointer-events', 'none'); // Allow clicks to pass through

    p.colorMode(p.RGB, 255);
    p.noStroke();
    p.frameRate(60);

    console.log('🎨 p5.js canvas created:', p.windowWidth, 'x', p.windowHeight);
  }

  drawP5(p) {
    let r = 0, g = 0, b = 0; // Default to black

    if (this.isColored) {
      const elapsed = p.millis() - this.colorStartTime;

      if (elapsed < this.colorDuration) {
        // Stay at full color for the synth duration
        this.colorIntensity = 1.0;
        r = this.currentColor[0];
        g = this.currentColor[1];
        b = this.currentColor[2];
      } else {
        // Fade out after synth duration
        const fadeOutDuration = 300; // 300ms fade to black
        const fadeElapsed = elapsed - this.colorDuration;

        if (fadeElapsed < fadeOutDuration) {
          // Linear fade to black
          this.colorIntensity = 1.0 - (fadeElapsed / fadeOutDuration);
          r = this.currentColor[0] * this.colorIntensity;
          g = this.currentColor[1] * this.colorIntensity;
          b = this.currentColor[2] * this.colorIntensity;
        } else {
          // Fully faded to black
          this.isColored = false;
          this.colorIntensity = 0;
          r = g = b = 0;
        }
      }
    }

    p.background(r, g, b);
  }

  resizeP5(p) {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    console.log('🎨 Canvas resized:', p.windowWidth, 'x', p.windowHeight);
  }

  // Trigger color effect with duration
  triggerColor(color, duration = 1000, intensity = 1.0) {
    this.isColored = true;
    this.colorIntensity = Math.max(0, Math.min(1, intensity));
    this.colorStartTime = this.p5Instance ? this.p5Instance.millis() : Date.now();
    this.colorDuration = Math.max(100, duration); // Minimum 100ms

    if (color && Array.isArray(color) && color.length >= 3) {
      this.currentColor = [
        color[0] * intensity,
        color[1] * intensity,
        color[2] * intensity
      ];
    } else {
      this.currentColor = [255 * intensity, 255 * intensity, 255 * intensity]; // White
    }

    console.log(`🎨 Color triggered: duration=${duration.toFixed(0)}ms, color=[${this.currentColor.join(',')}]`);
  }

  // Map OSC parameters to visual effects
  handleOSCVisuals(plaitsData, synthDuration) {
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

      color = this.hsvToRgb(hue, saturation, value);
    }

    // Use the actual synth duration from audio manager
    const duration = synthDuration ? synthDuration * 1000 : 1000; // Convert to ms

    // Trigger the color effect
    this.triggerColor(color, duration, colorIntensity);
  }

  // Utility: Convert HSV to RGB
  hsvToRgb(h, s, v) {
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

  // Clean up
  destroy() {
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
      console.log('🧹 Visual Manager destroyed');
    }
  }
}