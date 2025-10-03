export class AudioManager {
  constructor() {
    this.audioStarted = false;
    this.pendingAudioTriggers = [];
    this.lastPlaitsState = null;
  }

  async initializeAudio() {
    try {
      console.log('🎵 Initializing audio...');

      // Start Tone.js audio context
      await Tone.start();
      console.log('✅ Tone.js audio context started');

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
      console.error('❌ Failed to initialize audio:', error);
      throw error;
    }
  }

  handlePlaitsState(plaitsData) {
    // Store the latest state
    this.lastPlaitsState = plaitsData;

    // Trigger randomized FM ping sound
    this.triggerFMPing(plaitsData);
  }

  async triggerFMPing(plaitsData) {
    try {
      // Check if audio has been initialized by user gesture
      if (!this.audioStarted || Tone.context.state !== 'running') {
        console.log('⏸️  Audio not started, queueing trigger for later');
        this.pendingAudioTriggers.push(plaitsData);
        return;
      }

      // Map OSC parameters to FM synthesis
      const params = this.mapOSCToFMParams(plaitsData);

      // Create FM synthesizer with OSC-controlled parameters
      const fmSynth = new Tone.FMSynth({
        harmonicity: params.harmonicity,
        modulationIndex: params.modulationIndex,
        oscillator: {
          type: "sine"
        },
        envelope: {
          attack: params.attack,
          decay: params.decay,
          sustain: params.sustain,
          release: params.release
        },
        modulation: {
          oscillator: {
            type: "sine"
          },
          envelope: {
            attack: params.modAttack,
            decay: params.modDecay,
            sustain: params.modSustain,
            release: params.modRelease
          }
        }
      }).toDestination();

      // TODO: Use OSC volume parameter later (range 0-2) - for now hardcoded so SC UI volume can balance
      fmSynth.volume.value = -5; // Fixed at -15dB

      console.log(`🔊 FM Ping: ${params.frequency.toFixed(1)}Hz, dur: ${params.duration.toFixed(2)}s`);
      console.log(`   Harm: ${params.harmonicity.toFixed(2)}, ModIndex: ${params.modulationIndex.toFixed(1)}`);
      console.log(`   Timbre→Attack: ${params.attack.toFixed(3)}s, Morph→Sustain: ${params.sustain.toFixed(2)}`);

      // Trigger the sound
      fmSynth.triggerAttackRelease(params.frequency, params.duration);

      // Clean up synth after sound finishes
      setTimeout(() => {
        fmSynth.dispose();
      }, (params.duration + 1) * 1000); // Add 1 second buffer

    } catch (error) {
      console.error('Error triggering FM ping:', error);
    }
  }

  isAudioReady() {
    return this.audioStarted && Tone.context.state === 'running';
  }

  getPendingTriggersCount() {
    return this.pendingAudioTriggers.length;
  }

  getLastPlaitsState() {
    return this.lastPlaitsState;
  }

  mapOSCToFMParams(plaitsData) {
    // Extract parameters with fallbacks
    const pitch = plaitsData.pitch !== undefined ? plaitsData.pitch : 60; // Default to C4
    const harm = plaitsData.harm !== undefined ? plaitsData.harm : 0.5;   // Default to mid-range
    const timbre = plaitsData.timbre !== undefined ? plaitsData.timbre : 0.5;
    const morph = plaitsData.morph !== undefined ? plaitsData.morph : 0.5;
    const volume = plaitsData.volume !== undefined ? plaitsData.volume : 0.8;
    const dur = plaitsData.dur !== undefined ? plaitsData.dur : 0.3;      // Time between notes
    const decay = plaitsData.decay !== undefined ? plaitsData.decay : 0.5; // Envelope decay amount

    // Remap pitch for mobile speakers using non-linear curve favoring high frequencies
    // Maps 0-127 → 36-127 with exponential curve
    const normalizedPitch = Math.max(0, Math.min(127, pitch)) / 127;
    const mobilePitch = 36 + Math.pow(normalizedPitch, 0.7) * 91;

    // Convert remapped MIDI note to frequency
    const frequency = Tone.Frequency(mobilePitch, "midi").toFrequency();

    // Clamp all input parameters to safe ranges
    const clampedHarm = Math.max(0, Math.min(1, harm));
    const clampedTimbre = Math.max(0, Math.min(1, timbre));
    const clampedMorph = Math.max(0, Math.min(1, morph));
    const clampedDecay = Math.max(0, Math.min(1, decay));

    // Map harm (0-1) to harmonicity (0.5-8.0)
    // Higher harm = more harmonic/metallic sound
    const harmonicity = Math.max(0.1, clampedHarm * 7.5 + 0.5);

    // Map timbre (0-1) to modulation index (1-30)
    // Higher timbre = more complex/distorted FM sound
    const modulationIndex = Math.max(0.1, clampedTimbre * 29 + 1);
    
    // Map decay (0-1) to envelope length and morph (0-1) to envelope shape
    // decay controls overall envelope duration, morph controls attack vs sustain character

    const attack = Math.max(0.001, (1 - clampedMorph) * 0.02 + 0.001);  // 1ms to 21ms (inverted by morph)
    const decayTime = Math.max(0.01, clampedDecay * 2.0 + 0.05);        // 50ms to 2050ms (controlled by decay param)
    const sustain = Math.max(0.01, Math.min(1, clampedMorph * 0.7 + 0.1)); // 10% to 80% (controlled by morph)
    const release = Math.max(0.01, clampedDecay * 0.5 + 0.05);          // 50ms to 550ms (controlled by decay param)

    // Modulation envelope (related to timbre)
    const modAttack = Math.max(0.001, clampedTimbre * 0.01 + 0.001);    // 1ms to 11ms
    const modDecay = Math.max(0.01, (1 - clampedTimbre) * 0.2 + 0.05);  // 50ms to 250ms (inverted)
    const modSustain = Math.max(0.01, Math.min(1, clampedTimbre * 0.6 + 0.2)); // 20% to 80%
    const modRelease = Math.max(0.01, clampedTimbre * 0.4 + 0.1);       // 100ms to 500ms

    // Map volume (0-2) to dB (-30dB to -5dB) - TODO: Currently unused, hardcoded in triggerFMPing
    const volumeDB = (volume * 12.5) - 25; // 0→-25dB, 1→-12.5dB, 2→0dB

    // Calculate note duration - use a percentage of the time between notes (dur)
    // This ensures notes don't overlap but can vary in length based on decay param
    const noteDuration = Math.min(dur * 0.8, clampedDecay * 1.5 + 0.1); // 80% of dur time, or decay-based length

    return {
      frequency,
      harmonicity,
      modulationIndex,
      attack,
      decay: decayTime,  // Use decayTime instead of decay
      sustain,
      release,
      modAttack,
      modDecay,
      modSustain,
      modRelease,
      volume: volumeDB,
      duration: Math.min(noteDuration, 2.0) // Cap at 2 seconds for safety
    };
  }
}