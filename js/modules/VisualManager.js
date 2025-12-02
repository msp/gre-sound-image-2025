export class VisualManager {
  constructor() {
    // Multi-slot sketch system
    this.sketchSlots = new Map(); // voice -> {instance, container, sketchName}
    this.loadedSketchFunctions = new Map(); // sketchName -> function
    this.config = null;

    // Idle/waiting state tracking
    this.lastDataTime = Date.now(); // Track when we last received OSC data
    this.IDLE_THRESHOLD = 10000; // Show pulse after N seconds of no data
  }

  async initialize() {
    // Check for single sketch parameter (backwards compatibility)
    const urlParams = new URLSearchParams(window.location.search);
    const sketchName = urlParams.get('sketch');

    if (sketchName) {
      // Load single sketch to voice 0 for backwards compatibility
      await this.loadSketchToSlot(0, sketchName);
    } else {
      // Load sketches from configuration
      await this.loadSketchesFromConfig();
    }
  }


  async loadSketchesFromConfig() {
    try {
      console.log('🎨 Loading sketches configuration...');

      // Fetch configuration file
      const response = await fetch('sketches.json');
      if (!response.ok) {
        throw new Error(`Failed to load sketches.json: ${response.status}`);
      }

      this.config = await response.json();
      console.log('📋 Loaded sketch configuration:', this.config);

      // Load sketches for each voice slot
      const promises = [];
      for (const [voice, sketchName] of Object.entries(this.config.sketches)) {
        if (sketchName) {
          promises.push(this.loadSketchToSlot(parseInt(voice), sketchName));
        }
      }

      await Promise.all(promises);
      console.log('✅ All configured sketches loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load sketch configuration:', error);
      console.log('🔄 Falling back to no sketches');
    }
  }

  async loadSketchToSlot(voice, sketchName) {
    try {
      console.log(`🎨 Loading sketch "${sketchName}" to voice ${voice}...`);

      // Unload existing sketch in this slot
      if (this.sketchSlots.has(voice)) {
        this.unloadSketchFromSlot(voice);
      }

      // Load sketch function if not already loaded
      let sketchFunction = this.loadedSketchFunctions.get(sketchName);
      if (!sketchFunction) {
        sketchFunction = await this.loadSketchFunction(sketchName);
        this.loadedSketchFunctions.set(sketchName, sketchFunction);
      }

      // Create container for this voice slot
      const container = this.createSketchContainer(voice);

      // Create p5 instance with the sketch function
      const sketchInstance = new p5(sketchFunction, container);

      // Store the slot data
      this.sketchSlots.set(voice, {
        instance: sketchInstance,
        container: container,
        sketchName: sketchName
      });

      console.log(`✅ Sketch "${sketchName}" loaded to voice ${voice}`);
      if (sketchInstance.updateFromOSC) {
        console.log(`🎛️  OSC integration available for voice ${voice}`);
      }

    } catch (error) {
      console.error(`❌ Failed to load sketch "${sketchName}" to voice ${voice}:`, error.message);
    }
  }

  unloadSketchFromSlot(voice) {
    const slot = this.sketchSlots.get(voice);
    if (slot) {
      console.log(`🗑️  Unloading sketch from voice ${voice}`);

      // Remove p5 instance
      if (slot.instance) {
        slot.instance.remove();
      }

      // Remove container
      if (slot.container) {
        slot.container.remove();
      }

      // Remove from slots map
      this.sketchSlots.delete(voice);
    }
  }

  createSketchContainer(voice) {
    // Create container div for this voice slot
    const container = document.createElement('div');
    container.id = `sketch-container-${voice}`;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    // Layer order: flash (background), wash (middle), others (foreground)
    let zIndex;
    if (voice === 0) zIndex = 5;       // Flash: background layer
    else if (voice === 1) zIndex = 6;  // Wash: middle layer
    else zIndex = 10 + voice;          // Other effects: foreground layers
    container.style.zIndex = `${zIndex}`;
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
    return container;
  }


  async loadSketchFunction(sketchName) {
    try {
      // Load as script and get function from global scope
      const scriptPath = `js/${sketchName}.js`;
      const functionName = `create${sketchName.charAt(0).toUpperCase() + sketchName.slice(1)}Sketch`;

      // Load script if function not already available
      if (!window[functionName]) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptPath;
          script.onload = resolve;
          script.onerror = () => {
            reject(new Error(`Failed to load sketch script: ${scriptPath}`));
          };
          document.head.appendChild(script);
        });
      }

      const sketchFunction = window[functionName];
      if (!sketchFunction) {
        throw new Error(`Sketch function ${functionName} not found after loading ${scriptPath}`);
      }

      return sketchFunction;
    } catch (error) {
      console.error(`❌ Failed to load sketch function for "${sketchName}":`, error);
      throw error;
    }
  }


  // Map OSC parameters to visual effects
  handleOSCVisuals(plaitsData, synthDuration) {
    // Update last data time to reset idle timer
    this.lastDataTime = Date.now();

    const voice = plaitsData.voice || 0;

    // Route OSC data to the appropriate voice slot
    const slot = this.sketchSlots.get(voice);
    if (slot && slot.instance && slot.instance.updateFromOSC) {
      try {
        slot.instance.updateFromOSC(plaitsData, synthDuration);
      } catch (error) {
        console.error(`Error calling updateFromOSC for voice ${voice}:`, error);
      }
    }
  }


  // Clean up
  destroy() {
    // Clean up all sketch slots
    for (const [voice, slot] of this.sketchSlots.entries()) {
      this.unloadSketchFromSlot(voice);
    }

    console.log('🧹 Visual Manager destroyed');
  }
}