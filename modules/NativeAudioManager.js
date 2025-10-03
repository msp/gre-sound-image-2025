export class NativeAudioManager {
  constructor() {
    this.audioContext = null;
    this.audioStarted = false;
    this.pendingAudioTriggers = [];
    this.lastPlaitsState = null;
    this.activeSynths = new Map();
  }

  async initializeAudio() {
    try {
      console.log('🎵 Initializing native Web Audio API...');

      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        throw new Error('Web Audio API not supported');
      }

      this.audioContext = new AudioContext();

      // Handle iOS audio context state
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      console.log('✅ Native Web Audio context started:', this.audioContext.state);
      console.log('   Sample rate:', this.audioContext.sampleRate);

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
      console.error('❌ Failed to initialize native Web Audio:', error);
      throw error;
    }
  }

  handlePlaitsState(plaitsData) {
    // Store the latest state
    this.lastPlaitsState = plaitsData;

    // Trigger native Web Audio FM synthesis
    this.triggerNativeFMPing(plaitsData);
  }

  async triggerNativeFMPing(plaitsData) {
    try {
      // Check if audio has been initialized
      if (!this.audioStarted || !this.audioContext) {
        console.log('⏸️  Audio not started, queueing trigger for later');
        this.pendingAudioTriggers.push(plaitsData);
        return;
      }

      // Map OSC parameters to synthesis parameters
      const params = this.mapOSCToFMParams(plaitsData);

      // Create FM synthesis chain
      const synthId = this.createNativeFMSynth(params);

      console.log(`🔊 Native FM Ping: ${params.frequency.toFixed(1)}Hz, dur: ${params.duration.toFixed(2)}s`);
      console.log(`   Harm: ${params.harmonicity.toFixed(2)}, ModIndex: ${params.modulationIndex.toFixed(1)}`);

      // Schedule cleanup
      setTimeout(() => {
        this.cleanupSynth(synthId);
      }, (params.duration + 1) * 1000);

    } catch (error) {
      console.error('Error triggering native FM ping:', error);
    }
  }

  createNativeFMSynth(params) {
    const synthId = Date.now() + Math.random();
    const now = this.audioContext.currentTime;

    try {
      // Create carrier oscillator
      const carrier = this.audioContext.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = params.frequency;

      // Create modulator oscillator (FM)
      const modulator = this.audioContext.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = params.frequency * params.harmonicity;

      // Create modulation gain (modulation depth)
      const modulationGain = this.audioContext.createGain();
      modulationGain.gain.value = params.modulationIndex;

      // Create carrier amplitude envelope
      const carrierGain = this.audioContext.createGain();
      carrierGain.gain.value = 0; // Start silent

      // Connect FM chain: modulator -> modulationGain -> carrier.frequency
      modulator.connect(modulationGain);
      modulationGain.connect(carrier.frequency);

      // Connect carrier -> gain -> output
      carrier.connect(carrierGain);
      carrierGain.connect(this.audioContext.destination);

      // Create ADSR envelope for carrier
      const attackTime = params.attack;
      const decayTime = params.decay;
      const sustainLevel = params.sustain * 0.1; // Scale down for reasonable volume
      const releaseTime = params.release;
      const noteEndTime = now + params.duration;

      // Schedule envelope
      carrierGain.gain.setValueAtTime(0, now);
      carrierGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime);
      carrierGain.gain.exponentialRampToValueAtTime(
        Math.max(sustainLevel * 0.3, 0.001),
        now + attackTime + decayTime
      );
      carrierGain.gain.setValueAtTime(sustainLevel * 0.3, noteEndTime);
      carrierGain.gain.exponentialRampToValueAtTime(0.001, noteEndTime + releaseTime);

      // Start oscillators
      carrier.start(now);
      modulator.start(now);

      // Stop oscillators
      const stopTime = noteEndTime + releaseTime + 0.1; // Small buffer
      carrier.stop(stopTime);
      modulator.stop(stopTime);

      // Store synth for cleanup
      this.activeSynths.set(synthId, {
        carrier,
        modulator,
        carrierGain,
        modulationGain,
        stopTime
      });

      console.log(`🎛️ Created native FM synth: ${synthId}`);
      return synthId;

    } catch (error) {
      console.error('Error creating native FM synth:', error);
      return null;
    }
  }

  cleanupSynth(synthId) {
    const synth = this.activeSynths.get(synthId);
    if (!synth) return;

    try {
      // Disconnect nodes (in case they're still running)
      if (synth.carrier && synth.carrier.disconnect) {
        synth.carrier.disconnect();
      }
      if (synth.modulator && synth.modulator.disconnect) {
        synth.modulator.disconnect();
      }
      if (synth.carrierGain && synth.carrierGain.disconnect) {
        synth.carrierGain.disconnect();
      }
      if (synth.modulationGain && synth.modulationGain.disconnect) {
        synth.modulationGain.disconnect();
      }

      this.activeSynths.delete(synthId);
      console.log(`🧹 Cleaned up native FM synth: ${synthId}`);

    } catch (error) {
      console.error('Error cleaning up native FM synth:', error);
    }
  }

  mapOSCToFMParams(plaitsData) {
    // Same parameter mapping as other audio managers
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

    // Map parameters to synthesis values
    const harmonicity = Math.max(0.1, clampedHarm * 7.5 + 0.5);
    const modulationIndex = Math.max(1, clampedTimbre * 100 + 10); // Scaled for Web Audio

    // Envelope parameters
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
    return this.audioStarted &&
           this.audioContext &&
           this.audioContext.state === 'running';
  }

  getPendingTriggersCount() {
    return this.pendingAudioTriggers.length;
  }

  getLastPlaitsState() {
    return this.lastPlaitsState;
  }

  // Get audio context state for debugging
  getAudioContextState() {
    return this.audioContext ? this.audioContext.state : 'not_created';
  }

  // Force resume audio context (for iOS)
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🔄 Audio context resumed:', this.audioContext.state);
    }
  }

  // Clean up all active synths and audio context
  dispose() {
    console.log(`🧹 Disposing native audio manager with ${this.activeSynths.size} active synths`);

    // Clean up all active synths
    for (const [synthId, synth] of this.activeSynths) {
      this.cleanupSynth(synthId);
    }

    this.activeSynths.clear();

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioStarted = false;
  }
}