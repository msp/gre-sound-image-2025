export class P5AudioManager {
  constructor() {
    this.audioStarted = false;
    this.pendingAudioTriggers = [];
    this.lastPlaitsState = null;
    this.activeSynths = new Map(); // Track active synthesis chains
  }

  async initializeAudio() {
    try {
      console.log('🎵 Initializing p5.sound...');

      // Check if p5.sound is available
      if (typeof p5 === 'undefined' || !p5.prototype.Oscillator) {
        throw new Error('p5.sound not loaded');
      }

      // Start audio context - p5.sound handles this automatically
      if (getAudioContext && getAudioContext().state !== 'running') {
        await userStartAudio(); // p5.sound function to start audio with user gesture
      }

      console.log('✅ p5.sound audio context started');
      this.audioStarted = true;

      // Process any pending audio triggers
      if (this.pendingAudioTriggers.length > 0) {
        console.log(`🔄 Processing ${this.pendingAudioTriggers.length} pending audio triggers`);
        for (const triggerData of this.pendingAudioTriggers) {
          this.handlePlaitsState(triggerData);
        }
        this.pendingAudioTriggers = [];
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to initialize p5.sound:', error);
      throw error;
    }
  }

  handlePlaitsState(plaitsData) {
    // Store the latest state
    this.lastPlaitsState = plaitsData;

    // Trigger p5.sound FM synthesis
    this.triggerP5FMPing(plaitsData);
  }

  async triggerP5FMPing(plaitsData) {
    try {
      // Check if audio has been initialized by user gesture
      if (!this.audioStarted) {
        console.log('⏸️  Audio not started, queueing trigger for later');
        this.pendingAudioTriggers.push(plaitsData);
        return;
      }

      // Map OSC parameters to synthesis parameters
      const params = this.mapOSCToFMParams(plaitsData);

      // Create FM synthesis chain with p5.sound
      const synthId = this.createFMSynthChain(params);

      console.log(`🔊 p5.sound FM Ping: ${params.frequency.toFixed(1)}Hz, dur: ${params.duration.toFixed(2)}s`);
      console.log(`   Harm: ${params.harmonicity.toFixed(2)}, ModIndex: ${params.modulationIndex.toFixed(1)}`);

      // Schedule cleanup
      setTimeout(() => {
        this.cleanupSynthChain(synthId);
      }, (params.duration + 1) * 1000);

    } catch (error) {
      console.error('Error triggering p5.sound FM ping:', error);
    }
  }

  createFMSynthChain(params) {
    const synthId = Date.now() + Math.random();

    try {
      // Create carrier oscillator
      const carrier = new p5.Oscillator('sine');
      carrier.freq(params.frequency);
      carrier.amp(0); // Start silent

      // Create modulator oscillator for FM
      const modulator = new p5.Oscillator('sine');
      modulator.freq(params.frequency * params.harmonicity);
      modulator.amp(params.modulationIndex);

      // Connect modulator to carrier frequency (FM synthesis)
      modulator.disconnect(); // Disconnect from speakers
      modulator.connect(carrier.freq); // Connect to carrier frequency

      // Create envelope for amplitude
      const env = new p5.Env();
      env.setADSR(params.attack, params.decay, params.sustain, params.release);

      // Start oscillators
      carrier.start();
      modulator.start();

      // Connect carrier through envelope to output
      env.setInput(carrier);

      // Set volume (p5.sound handles this differently than Tone.js)
      carrier.amp(0.1, 0.01); // Start with low volume, quick ramp

      // Trigger envelope
      env.play();

      // Schedule note off
      setTimeout(() => {
        env.triggerRelease();
      }, params.duration * 1000);

      // Store synthesis chain for cleanup
      this.activeSynths.set(synthId, {
        carrier,
        modulator,
        env,
        startTime: Date.now()
      });

      console.log(`🎛️ Created p5.sound FM chain: ${synthId}`);
      return synthId;

    } catch (error) {
      console.error('Error creating p5.sound FM chain:', error);
      return null;
    }
  }

  cleanupSynthChain(synthId) {
    const synth = this.activeSynths.get(synthId);
    if (!synth) return;

    try {
      // Stop and dispose of oscillators
      if (synth.carrier) {
        synth.carrier.stop();
        synth.carrier.dispose();
      }

      if (synth.modulator) {
        synth.modulator.stop();
        synth.modulator.dispose();
      }

      // Clean up envelope
      if (synth.env) {
        synth.env.dispose();
      }

      this.activeSynths.delete(synthId);
      console.log(`🧹 Cleaned up p5.sound FM chain: ${synthId}`);

    } catch (error) {
      console.error('Error cleaning up p5.sound FM chain:', error);
    }
  }

  mapOSCToFMParams(plaitsData) {
    // Extract parameters with fallbacks (same logic as AudioManager)
    const pitch = plaitsData.pitch !== undefined ? plaitsData.pitch : 60;
    const harm = plaitsData.harm !== undefined ? plaitsData.harm : 0.5;
    const timbre = plaitsData.timbre !== undefined ? plaitsData.timbre : 0.5;
    const morph = plaitsData.morph !== undefined ? plaitsData.morph : 0.5;
    const volume = plaitsData.volume !== undefined ? plaitsData.volume : 0.8;
    const dur = plaitsData.dur !== undefined ? plaitsData.dur : 0.3;
    const decay = plaitsData.decay !== undefined ? plaitsData.decay : 0.5;

    // Clamp all input parameters to safe ranges
    const clampedHarm = Math.max(0, Math.min(1, harm));
    const clampedTimbre = Math.max(0, Math.min(1, timbre));
    const clampedMorph = Math.max(0, Math.min(1, morph));
    const clampedDecay = Math.max(0, Math.min(1, decay));

    // Convert MIDI note to frequency
    const frequency = 440 * Math.pow(2, (pitch - 69) / 12);

    // Map parameters (same as AudioManager)
    const harmonicity = Math.max(0.1, clampedHarm * 7.5 + 0.5);
    const modulationIndex = Math.max(0.1, clampedTimbre * 29 + 1);

    // Envelope mapping
    const attack = Math.max(0.001, (1 - clampedMorph) * 0.02 + 0.001);
    const decayTime = Math.max(0.01, clampedDecay * 2.0 + 0.05);
    const sustain = Math.max(0.01, Math.min(1, clampedMorph * 0.7 + 0.1));
    const release = Math.max(0.01, clampedDecay * 0.5 + 0.05);

    // Calculate note duration
    const noteDuration = Math.min(dur * 0.8, clampedDecay * 1.5 + 0.1);

    return {
      frequency,
      harmonicity,
      modulationIndex,
      attack,
      decay: decayTime,
      sustain,
      release,
      duration: Math.min(noteDuration, 2.0)
    };
  }

  isAudioReady() {
    return this.audioStarted;
  }

  getPendingTriggersCount() {
    return this.pendingAudioTriggers.length;
  }

  getLastPlaitsState() {
    return this.lastPlaitsState;
  }

  // Clean up all active synths
  dispose() {
    console.log(`🧹 Disposing p5.sound audio manager with ${this.activeSynths.size} active synths`);

    for (const [synthId, synth] of this.activeSynths) {
      this.cleanupSynthChain(synthId);
    }

    this.activeSynths.clear();
  }
}