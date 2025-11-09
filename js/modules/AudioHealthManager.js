export class AudioHealthManager {
  constructor() {
    this.lastHealthCheck = 0;
    this.healthCheckThrottle = 2000; // Check every 2 seconds max
    this.pendingThreshold = 8; // Triggers before considering blocked
  }

  // Main health check - call this on incoming OSC messages
  checkHealthOnMessage() {
    // Throttle checks to avoid spam
    const now = Date.now();
    if (this.lastHealthCheck && (now - this.lastHealthCheck) < this.healthCheckThrottle) {
      return;
    }
    this.lastHealthCheck = now;

    const healthStatus = this.getAudioHealthStatus();

    if (!healthStatus.healthy) {
      console.log(`⚠️ Audio health check failed: ${healthStatus.reason}`);
      this.requestAudioResume(healthStatus.reason);
    }
  }

  // Get comprehensive audio health status
  getAudioHealthStatus() {
    // Check if audio system is initialized
    if (!window.audioManager || typeof Tone === 'undefined') {
      return { healthy: true }; // Not initialized yet, don't show prompts
    }

    const contextState = Tone.context.state;
    const audioStarted = window.audioManager.audioStarted;
    const pendingCount = window.audioManager.getPendingTriggersCount();

    // EXPLICIT DEBUG - log every health check
    console.log(`🔍 Health check: started=${audioStarted}, context=${contextState}, pending=${pendingCount}`);

    // Check if audio not started
    if (!audioStarted) {
      return {
        healthy: false,
        reason: 'Audio not initialized',
        contextState,
        pendingCount
      };
    }

    // ONLY check for definite context suspension - avoid false positives
    // Case insensitive check for iOS variations
    const lowerState = contextState.toLowerCase();
    if (lowerState === 'suspended' || lowerState === 'interrupted') {
      return {
        healthy: false,
        reason: `Context ${contextState}`,
        contextState,
        pendingCount
      };
    }

    // Don't guess based on pending triggers - too many false positives
    // Just log for debugging if triggers are building up
    if (pendingCount > this.pendingThreshold) {
      console.log(`📊 Note: ${pendingCount} pending triggers, but context is ${contextState}`);
    }

    return {
      healthy: true,
      contextState,
      pendingCount
    };
  }

  // Request audio resume through UI manager
  requestAudioResume(reason) {
    if (window.uiManager) {
      window.uiManager.showAudioHealthPrompt(reason, () => this.resumeAudio());
    }
  }

  // Centralized audio resume logic
  async resumeAudio() {
    try {
      await Tone.start();
      console.log('✅ Audio resumed via AudioHealthManager');

      // Clear any stale pending triggers
      if (window.audioManager && window.audioManager.clearPendingTriggers) {
        const cleared = window.audioManager.clearPendingTriggers();
        if (cleared > 0) {
          console.log(`🗑️ Cleared ${cleared} stale triggers during health recovery`);
        }
      }

      return true;
    } catch (err) {
      console.error('Failed to resume audio via health check:', err);
      return false;
    }
  }

  // Force an immediate health check (bypass throttle)
  forceHealthCheck() {
    this.lastHealthCheck = 0;
    this.checkHealthOnMessage();
  }
}