export class AudioManager {
  constructor() {
    this.audioStarted = false;
    this.pendingAudioTriggers = [];
    this.lastPlaitsState = null;
    this.audioResumePromptShown = false;
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

    // Route to different synthesis engines based on voice
    const voice = plaitsData.voice || 0;

    if (voice === 2) {
      // Voice 2: Noise synthesis for TV static effect
      console.log(`🔀 Routing voice ${voice} to noise synthesis`);
      this.triggerNoisePing(plaitsData);
    } else {
      // Voices 0, 1, 3-5: FM synthesis
      console.log(`🔀 Routing voice ${voice} to FM synthesis`);
      this.triggerFMPing(plaitsData);
    }
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
    if (!this.audioStarted) return false;

    // Check if audio context is actually ready to play sounds
    const isContextRunning = Tone.context.state === 'running';

    // If we have many pending triggers, audio might be contextually blocked
    const hasManyPending = this.pendingAudioTriggers.length > 10;

    if (isContextRunning && hasManyPending) {
      console.log('⚠️  Audio context reports running but may be contextually blocked');
      // DISABLED for testing - AudioHealthManager handles this better
      // this.testAudioPlayback();
    }

    return isContextRunning && !hasManyPending;
  }

  // Test if audio can actually play (not just context state)
  async testAudioPlayback() {
    try {
      // Create a very short, silent test tone
      const testOsc = new Tone.Oscillator(440, 'sine').toDestination();
      testOsc.volume.value = -60; // Very quiet
      testOsc.start();
      testOsc.stop(Tone.now() + 0.01); // 10ms test

      // If this fails, audio is contextually blocked
      setTimeout(() => {
        if (this.pendingAudioTriggers.length > 15) {
          this.showAudioResumePrompt();
        }
      }, 100);
    } catch (err) {
      console.log('🔇 Audio test failed - context blocked');
      this.showAudioResumePrompt();
    }
  }

  showAudioResumePrompt() {
    if (window.uiManager && !this.audioResumePromptShown) {
      this.audioResumePromptShown = true;
      window.uiManager.showError('Audio paused. Tap anywhere to resume.', 5000);

      // Add one-time click handler to resume
      const resumeHandler = async () => {
        try {
          await Tone.start();
          console.log('✅ Audio resumed via user interaction');
          this.audioResumePromptShown = false;
          // Process pending triggers
          if (this.pendingAudioTriggers.length > 0) {
            console.log(`🔄 Processing ${this.pendingAudioTriggers.length} pending audio triggers`);
            for (const triggerData of this.pendingAudioTriggers) {
              this.handlePlaitsState(triggerData);
            }
            this.pendingAudioTriggers = [];
          }
        } catch (err) {
          console.error('Failed to resume audio:', err);
        }
        document.removeEventListener('click', resumeHandler);
        document.removeEventListener('touchstart', resumeHandler);
      };

      document.addEventListener('click', resumeHandler);
      document.addEventListener('touchstart', resumeHandler);
    }
  }

  getPendingTriggersCount() {
    return this.pendingAudioTriggers.length;
  }

  clearPendingTriggers() {
    const clearedCount = this.pendingAudioTriggers.length;
    this.pendingAudioTriggers = [];
    console.log(`🧹 Cleared ${clearedCount} pending audio triggers`);
    return clearedCount;
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

  async triggerNoisePing(plaitsData) {
    try {
      console.log('🎛️ triggerNoisePing called with data:', plaitsData);

      // Check if audio has been initialized by user gesture
      if (!this.audioStarted || Tone.context.state !== 'running') {
        console.log('⏸️  Audio not started, queueing noise trigger for later');
        this.pendingAudioTriggers.push(plaitsData);
        return;
      }

      console.log('🎛️ Audio ready, mapping OSC parameters...');

      // Map OSC parameters to noise synthesis
      const params = this.mapOSCToNoiseParams(plaitsData);
      console.log('🎛️ Mapped noise params:', params);

      console.log('🎛️ Creating Tone.js objects...');

      // Create noise source
      const noise = new Tone.Noise(params.noiseType);
      console.log('✅ Noise source created');

      // Create high-pass filter to remove low frequencies (phone speakers)
      const highpass = new Tone.Filter({
        frequency: 200, // Remove everything below 200Hz
        type: 'highpass'
      });

      // Create main filter for tonal shaping
      const filter = new Tone.Filter({
        frequency: params.cutoff,
        Q: params.resonance,
        type: 'lowpass'
      });

      // Create EQ to boost upper mids for phone speakers
      const eq = new Tone.EQ3({
        low: -12,    // Cut lows
        mid: +6,     // Boost mids
        high: +3     // Slight high boost
      });

      console.log('✅ Filter chain created');

      // Create gain node for volume control
      const gain = new Tone.Gain(Tone.dbToGain(params.volume));
      console.log('✅ Gain node created');

      // Create envelope for amplitude control
      const envelope = new Tone.AmplitudeEnvelope({
        attack: params.attack,
        decay: params.decay,
        sustain: params.sustain,
        release: params.release
      });
      console.log('✅ Envelope created');

      // Connect signal chain: noise → highpass → filter → eq → gain → envelope → destination
      noise.connect(highpass);
      highpass.connect(filter);
      filter.connect(eq);
      eq.connect(gain);
      gain.connect(envelope);
      envelope.toDestination();
      console.log('✅ Signal chain connected');

      console.log(`✅ Volume set to ${params.volume}dB`);

      // Start the noise source
      noise.start();
      console.log('✅ Noise started');

      console.log(`📺 TV Static: cutoff: ${params.cutoff.toFixed(1)}Hz, Q: ${params.resonance.toFixed(2)}`);
      console.log(`   Type: ${params.noiseType}, bits: ${params.bits}, dur: ${params.duration.toFixed(2)}s`);

      // Trigger the envelope
      envelope.triggerAttackRelease(params.duration);

      // Clean up after sound finishes
      setTimeout(() => {
        noise.stop();
        noise.dispose();
        highpass.dispose();
        filter.dispose();
        eq.dispose();
        gain.dispose();
        envelope.dispose();
      }, (params.duration + 1) * 1000); // Add 1 second buffer

    } catch (error) {
      console.error('Error triggering noise ping:', error);
    }
  }

  mapOSCToNoiseParams(plaitsData) {
    // Extract parameters with fallbacks
    const pitch = plaitsData.pitch !== undefined ? plaitsData.pitch : 60; // Default to C4
    const harm = plaitsData.harm !== undefined ? plaitsData.harm : 0.5;   // Default to mid-range
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

    // Map timbre (0-1) to filter cutoff frequency (800Hz to 6000Hz - phone speaker sweet spot)
    const cutoff = 800 + (clampedTimbre * 5200);

    // Map pitch (MIDI note) to filter resonance/Q (1 to 15)
    // Normalize pitch to 0-1 range (C1=24 to C8=108)
    const normalizedPitch = Math.max(0, Math.min(1, (pitch - 24) / 84));
    const resonance = 1 + (normalizedPitch * 14);

    // Map morph (0-1) to noise type
    let noiseType;
    if (clampedMorph < 0.33) {
      noiseType = 'white';
    } else if (clampedMorph < 0.66) {
      noiseType = 'pink';
    } else {
      noiseType = 'brown';
    }

    // Map harm (0-1) to bit crushing amount (16 bits to 2 bits)
    const bits = Math.max(2, Math.round(16 - (clampedHarm * 14)));

    // Envelope parameters
    const attack = Math.max(0.001, clampedDecay * 0.05 + 0.001); // 1ms to 51ms
    const decayTime = Math.max(0.05, clampedDecay * 1.0 + 0.1); // 100ms to 1100ms
    const sustain = Math.max(0.1, Math.min(0.8, clampedDecay * 0.7 + 0.1)); // 10% to 80%
    const release = Math.max(0.05, clampedDecay * 0.5 + 0.1); // 100ms to 600ms

    // Map volume (0-2) to dB (-15dB to -5dB for noise - louder than FM)
    const volumeDB = (volume * 10) - 15; // 0→-15dB, 1→-5dB, 2→+5dB

    // Calculate duration
    const noteDuration = Math.min(dur * 0.9, clampedDecay * 2.0 + 0.2);

    return {
      cutoff,
      resonance,
      noiseType,
      bits,
      attack,
      decay: decayTime,
      sustain,
      release,
      volume: volumeDB,
      duration: Math.min(noteDuration, 3.0) // Cap at 3 seconds for noise
    };
  }
}