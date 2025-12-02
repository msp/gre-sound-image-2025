export class VisualManager {
  constructor() {
    this.p5Instance = null;

    // Voice 0: Flash state
    this.voice0Active = false;
    this.voice0StartTime = 0;
    this.voice0Duration = 0;
    this.voice0Color = [255, 255, 255];
    this.voice0Intensity = 1.0;

    // Voice 1: Wash state
    this.voice1Active = false;
    this.voice1StartTime = 0;
    this.voice1Duration = 0;
    this.voice1Color = [255, 200, 100];

    // Idle/waiting state tracking
    this.lastDataTime = Date.now(); // Track when we last received OSC data
    this.IDLE_THRESHOLD = 10000; // Show pulse after N seconds of no data

    // Sketch loading system
    this.loadedSketch = null;
    this.sketchInstance = null;
    this.sketchUpdateFromOSC = null;
  }

  initialize() {
    // Check for sketch parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sketchName = urlParams.get('sketch');

    if (sketchName) {
      this.loadSketch(sketchName);
    } else {
      this.initializeDefaultVisuals();
    }
  }

  initializeDefaultVisuals() {
    // Create default p5.js instance for flash/wash system
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

    console.log('✅ Visual Manager initialized with default flash/wash system');
  }

  async loadSketch(sketchName) {
    try {
      console.log(`🎨 Loading sketch: ${sketchName}`);

      // Create script element to load global-mode sketch
      const script = document.createElement('script');
      script.src = `js/${sketchName}.js`;

      // Wait for script to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => {
          console.error(`❌ Sketch not found: "${sketchName}" at path "js/${sketchName}.js"`);
          reject(new Error(`Failed to load sketch: ${sketchName}`));
        };
        document.head.appendChild(script);
      });

      // Capture the global functions that the sketch defined
      const globalSetup = window.setup;
      const globalDraw = window.draw;
      const globalWindowResized = window.windowResized;
      const globalMousePressed = window.mousePressed;
      const globalKeyPressed = window.keyPressed;
      const updateFromOSC = window.updateFromOSC;

      // Store the OSC update function if it exists
      this.sketchUpdateFromOSC = updateFromOSC;

      // Create container for sketch
      const container = this.createSketchContainer();

      // Create p5 instance that wraps the global functions
      this.sketchInstance = new p5((p) => {
        p.setup = () => {
          // Call the sketch's setup, binding p5 functions to the instance
          if (globalSetup) {
            try {
              this.bindGlobalP5Functions(p);
              globalSetup();
            } catch (error) {
              console.error('❌ Error in sketch setup():', error);
            }
          }
        };

        p.draw = () => {
          if (globalDraw) {
            try {
              this.bindGlobalP5Functions(p);
              globalDraw();
            } catch (error) {
              console.error('❌ Error in sketch draw():', error);
              p.noLoop(); // Stop drawing if there's an error
            }
          }
        };

        p.windowResized = () => {
          if (globalWindowResized) {
            this.bindGlobalP5Functions(p);
            globalWindowResized();
          } else {
            // Default resize behavior
            p.resizeCanvas(p.windowWidth, p.windowHeight);
          }
        };

        p.mousePressed = () => {
          if (globalMousePressed) {
            this.bindGlobalP5Functions(p);
            globalMousePressed();
          }
        };

        p.keyPressed = () => {
          if (globalKeyPressed) {
            this.bindGlobalP5Functions(p);
            globalKeyPressed();
          }
        };
      }, container);

      // Also create default flash/wash system as background layer
      this.initializeDefaultVisuals();

      console.log(`✅ Sketch "${sketchName}" loaded successfully`);
      if (this.sketchUpdateFromOSC) {
        console.log(`🎛️  OSC integration available for "${sketchName}"`);
      }

    } catch (error) {
      console.error(`❌ Failed to load sketch "${sketchName}":`, error.message);
      console.error(`   Available sketches should be placed in the "js/" directory`);
      // Fallback to default visuals
      console.log('🔄 Falling back to default flash/wash system');
      this.initializeDefaultVisuals();
    }
  }

  createSketchContainer() {
    // Create container div for sketch
    const container = document.createElement('div');
    container.id = 'sketch-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '2'; // Above default visuals (z-index 1)
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
    return container;
  }

  bindGlobalP5Functions(p) {
    // Bind all p5.js functions to the global scope so sketches work unchanged
    const p5Functions = [
      'createCanvas', 'background', 'clear', 'fill', 'noFill', 'stroke', 'noStroke', 'strokeWeight',
      'rect', 'ellipse', 'line', 'point', 'triangle', 'quad', 'arc', 'bezier', 'curve', 'circle',
      'width', 'height', 'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'mouseIsPressed',
      'keyIsPressed', 'key', 'keyCode', 'frameCount', 'millis', 'frameRate', 'noLoop', 'loop',
      'push', 'pop', 'translate', 'rotate', 'scale', 'shearX', 'shearY',
      'colorMode', 'red', 'green', 'blue', 'alpha', 'hue', 'saturation', 'brightness',
      'random', 'randomSeed', 'noise', 'noiseDetail', 'noiseSeed', 'randomGaussian',
      'map', 'lerp', 'constrain', 'norm', 'dist', 'mag', 'atan2', 'degrees', 'radians',
      'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'pow', 'sqrt', 'abs', 'ceil', 'floor', 'round',
      'windowWidth', 'windowHeight', 'resizeCanvas'
    ];

    p5Functions.forEach(funcName => {
      if (p[funcName] !== undefined) {
        window[funcName] = p[funcName].bind ? p[funcName].bind(p) : p[funcName];
      }
    });
  }

  setupP5(p) {
    // Create fullscreen canvas
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);

    // Position canvas to fill the entire viewport
    canvas.parent(document.body);
    canvas.style('position', 'fixed');
    canvas.style('top', '0');
    canvas.style('left', '0');
    canvas.style('width', '100vw');
    canvas.style('height', '100vh');
    canvas.style('z-index', '1');
    canvas.style('pointer-events', 'none'); // Allow clicks to pass through

    p.colorMode(p.RGB, 255);
    p.noStroke();
    p.frameRate(60);

    console.log('🎨 p5.js canvas created:', p.windowWidth, 'x', p.windowHeight);
  }

  drawP5(p) {
    p.background(0);

    const idle = this.isIdle();
    const connected = this.isConnected();

    if (idle && connected) {
      this.drawWaitingPulse(p);
    }

    this.drawVoice0(p);
    this.drawVoice1(p);
  }

  // Check if we're in idle state (no data for IDLE_THRESHOLD ms)
  isIdle() {
    const now = Date.now();
    const timeSinceData = now - this.lastDataTime;

    // Only idle if no active animations and haven't received data recently
    return timeSinceData > this.IDLE_THRESHOLD &&
           !this.voice0Active &&
           !this.voice1Active;
  }

  // Check if WebSocket is connected
  isConnected() {
    return window.oscClient && window.oscClient.isConnected;
  }

  // Draw subtle waiting pulse animation
  drawWaitingPulse(p) {
    // Use sine wave for smooth breathing effect
    // Complete cycle every 2 seconds (0.001 * PI = ~3.14 radians per second)
    const breathPhase = Math.sin(p.millis() * 0.001 * Math.PI) * 0.5 + 0.5; // 0 to 1

    // Brightness values for the pulsing dot
    const maxBrightness = 60;
    const minBrightness = 20;
    const brightness = minBrightness + (maxBrightness - minBrightness) * breathPhase;

    // Draw a small dot in the center of the screen
    p.push(); // Save drawing state
    p.noStroke();
    p.fill(brightness, brightness, brightness);

    // Dot properties - size based on screen width
    const dotSize = p.width * 0.10;
    const centerX = p.width / 2;
    const centerY = p.height / 2;

    // Draw the dot
    p.ellipse(centerX, centerY, dotSize, dotSize);
    p.pop(); // Restore drawing state

    // Debug log (once per second)
    if (p.frameCount % 60 === 0) {
      console.log('🔵 Waiting pulse active, brightness:', brightness.toFixed(0));
    }
  }

  // Voice 0: Full screen flash
  drawVoice0(p) {
    if (!this.voice0Active) return;

    const elapsed = p.millis() - this.voice0StartTime;

    if (elapsed < this.voice0Duration) {
      // Stay at full color for the synth duration
      const r = this.voice0Color[0] * this.voice0Intensity;
      const g = this.voice0Color[1] * this.voice0Intensity;
      const b = this.voice0Color[2] * this.voice0Intensity;
      p.background(r, g, b);
    } else {
      // Fade out after synth duration
      const fadeOutDuration = 300; // 300ms fade to black
      const fadeElapsed = elapsed - this.voice0Duration;

      if (fadeElapsed < fadeOutDuration) {
        // Linear fade to black
        const fadeIntensity = 1.0 - (fadeElapsed / fadeOutDuration);
        const r = this.voice0Color[0] * this.voice0Intensity * fadeIntensity;
        const g = this.voice0Color[1] * this.voice0Intensity * fadeIntensity;
        const b = this.voice0Color[2] * this.voice0Intensity * fadeIntensity;
        p.background(r, g, b);
      } else {
        // Flash complete
        this.voice0Active = false;
      }
    }
  }

  // Voice 1: Colorfield wash (left to right)
  drawVoice1(p) {
    if (!this.voice1Active) return;

    const elapsed = p.millis() - this.voice1StartTime;

    if (elapsed < this.voice1Duration) {
      // Calculate wash progress (0 to 1)
      const progress = elapsed / this.voice1Duration;

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

        p.fill(this.voice1Color[0], this.voice1Color[1], this.voice1Color[2], alpha * 255);
        p.rect(startX + i, 0, 1, p.windowHeight);
      }
    } else {
      // Wash animation complete
      this.voice1Active = false;
    }
  }

  resizeP5(p) {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    console.log('🎨 Canvas resized:', p.windowWidth, 'x', p.windowHeight);
  }

  // Trigger Voice 0 flash effect
  triggerVoice0Flash(color, duration = 1000, intensity = 1.0) {
    this.voice0Active = true;
    this.voice0Intensity = Math.max(0, Math.min(1, intensity));
    this.voice0StartTime = this.p5Instance ? this.p5Instance.millis() : Date.now();
    this.voice0Duration = Math.max(100, duration); // Minimum 100ms

    if (color && Array.isArray(color) && color.length >= 3) {
      this.voice0Color = [color[0], color[1], color[2]];
    } else {
      this.voice0Color = [255, 255, 255]; // White
    }

    console.log(`🎨 Voice 0 flash: duration=${duration.toFixed(0)}ms, color=[${this.voice0Color.join(',')}]`);
  }

  // Trigger Voice 1 wash effect
  triggerVoice1Wash(color, duration = 1500) {
    this.voice1Active = true;
    this.voice1StartTime = this.p5Instance ? this.p5Instance.millis() : Date.now();
    this.voice1Duration = Math.max(500, duration); // Minimum 500ms

    if (color && Array.isArray(color) && color.length >= 3) {
      this.voice1Color = [color[0], color[1], color[2]];
    } else {
      this.voice1Color = [255, 200, 100]; // Default warm color
    }

    console.log(`🌊 Voice 1 wash: duration=${duration.toFixed(0)}ms, color=[${this.voice1Color.join(',')}]`);
  }

  // Map OSC parameters to visual effects
  handleOSCVisuals(plaitsData, synthDuration) {
    // Update last data time to reset idle timer
    this.lastDataTime = Date.now();

    // If we have a loaded sketch with OSC integration, send data to it
    if (this.sketchUpdateFromOSC) {
      try {
        this.sketchUpdateFromOSC(plaitsData, synthDuration);
      } catch (error) {
        console.error('Error calling sketch updateFromOSC:', error);
      }
    }

    // Always run default flash/wash system (background layer)
    const voice = plaitsData.voice || 0;

    if (voice === 0) {
      this.handleVoice0(plaitsData, synthDuration);
    } else if (voice === 1) {
      this.handleVoice1(plaitsData, synthDuration);
    }
  }

  // Voice 0: Full screen flash handler
  handleVoice0(plaitsData, synthDuration) {
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

    // Trigger voice 0 flash
    this.triggerVoice0Flash(color, duration, colorIntensity);
  }

  // Voice 1: Colorfield wash handler
  handleVoice1(plaitsData, synthDuration) {
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

      color = this.hsvToRgb(hue, saturation, value);
    }

    // Use synth duration for wash animation
    const duration = synthDuration ? synthDuration * 1000 : 1500; // Slightly longer default

    // Trigger wash animation
    this.triggerVoice1Wash(color, duration);
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
    }

    if (this.sketchInstance) {
      this.sketchInstance.remove();
      this.sketchInstance = null;
    }

    // Clean up sketch container
    const container = document.getElementById('sketch-container');
    if (container) {
      container.remove();
    }

    console.log('🧹 Visual Manager destroyed');
  }
}