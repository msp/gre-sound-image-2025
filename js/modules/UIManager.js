export class UIManager {
  constructor() {
    this.tapToPlayOverlay = null;
  }

  createTapToPlayInterface() {
    // Create overlay div
    const overlay = document.createElement('div');
    overlay.id = 'tap-to-play-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      color: white;
      font-family: Arial, sans-serif;
      cursor: pointer;
    `;

    // Create main text
    const mainText = document.createElement('div');
    mainText.style.cssText = `
      font-size: 10vw;
      text-align: center;
      margin-bottom: 2vh;
    `;
    mainText.textContent = 'Tap to play';

    // Create subtitle
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size: 4vw;
      text-align: center;
      opacity: 0.7;
    `;
    subtitle.textContent = '(audio + WebSocket connection)';

    overlay.appendChild(mainText);
    overlay.appendChild(subtitle);
    document.body.appendChild(overlay);

    this.tapToPlayOverlay = overlay;
    return overlay;
  }

  removeTapToPlayInterface() {
    if (this.tapToPlayOverlay) {
      this.tapToPlayOverlay.remove();
      this.tapToPlayOverlay = null;
    }
  }

  addTapToPlayHandler(callback) {
    if (this.tapToPlayOverlay) {
      this.tapToPlayOverlay.addEventListener('click', callback);
      this.tapToPlayOverlay.addEventListener('touchstart', callback);
    }
  }

  showConnectionStatus(connected, clientId = null) {
    // Remove any existing status
    const existingStatus = document.getElementById('connection-status');
    if (existingStatus) {
      existingStatus.remove();
    }

    // Create connection status indicator
    const status = document.createElement('div');
    status.id = 'connection-status';
    status.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 1000;
      ${connected
        ? 'background-color: rgba(0, 255, 0, 0.8); color: black;'
        : 'background-color: rgba(255, 0, 0, 0.8); color: white;'
      }
    `;

    if (connected && clientId) {
      status.textContent = `Connected: ${clientId.split('_')[2] || 'unknown'}`;
    } else if (connected) {
      status.textContent = 'Connected';
    } else {
      status.textContent = 'Disconnected';
    }

    document.body.appendChild(status);

    // Auto-hide after 3 seconds if connected
    if (connected) {
      setTimeout(() => {
        if (status && status.parentNode) {
          status.remove();
        }
      }, 3000);
    }
  }

  showError(message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10000;
      max-width: 80vw;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (errorDiv && errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, duration);
  }

  showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 255, 0, 0.9);
      color: black;
      padding: 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      text-align: center;
      z-index: 10000;
      max-width: 80vw;
    `;
    successDiv.textContent = message;

    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (successDiv && successDiv.parentNode) {
        successDiv.remove();
      }
    }, duration);
  }

  createDebugPanel() {
    // Remove existing debug panel
    const existing = document.getElementById('debug-panel');
    if (existing) {
      existing.remove();
    }

    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      right: 10px;
      background-color: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 8px;
      z-index: 9999;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #333;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    `;

    const title = document.createElement('span');
    title.textContent = '🔧 Debug Panel';
    title.style.fontWeight = 'bold';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: 1px solid #666;
      color: #00ff00;
      padding: 2px 6px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 10px;
    `;
    closeBtn.onclick = () => this.hideDebugPanel();

    header.appendChild(title);
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.id = 'debug-content';

    const controls = document.createElement('div');
    controls.style.cssText = `
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #333;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    `;

    // Control buttons
    const testAudioBtn = document.createElement('button');
    testAudioBtn.textContent = '🔊 Test Audio';
    testAudioBtn.style.cssText = this.getButtonStyle();
    testAudioBtn.onclick = () => this.testAudio();

    const reconnectBtn = document.createElement('button');
    reconnectBtn.textContent = '🔄 Reconnect';
    reconnectBtn.style.cssText = this.getButtonStyle();
    reconnectBtn.onclick = () => this.reconnectWebSocket();

    const restartAudioBtn = document.createElement('button');
    restartAudioBtn.textContent = '🎵 Restart Audio';
    restartAudioBtn.style.cssText = this.getButtonStyle();
    restartAudioBtn.onclick = () => this.restartAudioContext();

    controls.appendChild(testAudioBtn);
    controls.appendChild(reconnectBtn);
    controls.appendChild(restartAudioBtn);

    debugPanel.appendChild(header);
    debugPanel.appendChild(content);
    debugPanel.appendChild(controls);

    document.body.appendChild(debugPanel);

    // Update debug info every second
    this.debugUpdateInterval = setInterval(() => {
      this.updateDebugPanel();
    }, 1000);

    this.updateDebugPanel();
    return debugPanel;
  }

  getButtonStyle() {
    return `
      background-color: #1a1a1a;
      border: 1px solid #666;
      color: #00ff00;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 10px;
      margin-right: 5px;
    `;
  }

  updateDebugPanel() {
    const content = document.getElementById('debug-content');
    if (!content) return;

    const now = new Date().toLocaleTimeString();

    // Get status from global instances
    const oscClient = window.oscClient;
    const audioStatus = window.debugApp ? window.debugApp.getAudioStatus() : null;

    let html = `<div style="color: #666;">${now}</div>`;

    // WebSocket Status - check the actual connection state
    const isConnected = oscClient && oscClient.isConnected &&
                       oscClient.ws && oscClient.ws.readyState === WebSocket.OPEN;

    html += `<div style="margin-top: 5px;">
      <span style="color: #fff;">WebSocket:</span>
      <span style="color: ${isConnected ? '#00ff00' : '#ff0000'};">
        ${isConnected ? '✅ Connected' : '❌ Disconnected'}
      </span>
    </div>`;

    if (isConnected && oscClient?.clientId) {
      html += `<div style="color: #888; font-size: 10px;">Client: ${oscClient.clientId.split('_')[2] || 'unknown'}</div>`;
    }

    // WebSocket ready state for debugging
    if (oscClient && oscClient.ws) {
      const readyStateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      const stateName = readyStateNames[oscClient.ws.readyState] || 'UNKNOWN';
      html += `<div style="color: #666; font-size: 9px;">State: ${stateName} (${oscClient.ws.readyState})</div>`;
    }

    // Audio Context Status - handle different engines
    let audioState = 'unknown';
    if (window.audioManager) {
      if (window.audioManager.constructor.name === 'NativeAudioManager') {
        audioState = window.audioManager.getAudioContextState();
      } else if (typeof Tone !== 'undefined') {
        audioState = Tone.context.state;
      } else if (typeof getAudioContext === 'function') {
        audioState = getAudioContext().state;
      }
    }
    html += `<div style="margin-top: 5px;">
      <span style="color: #fff;">Audio Context:</span>
      <span style="color: ${audioState === 'running' ? '#00ff00' : '#ff0000'};">
        ${audioState}
      </span>
    </div>`;

    // Audio Manager Status
    if (audioStatus) {
      // Show which audio engine is being used
      let engineType = 'Unknown';
      if (window.audioManager) {
        if (window.audioManager.constructor.name === 'NativeAudioManager') {
          engineType = 'Native Web Audio';
        } else if (window.audioManager.constructor.name === 'P5AudioManager') {
          engineType = 'p5.sound';
        } else if (window.audioManager.constructor.name === 'AudioManager') {
          engineType = 'Tone.js';
        }
      }
      html += `<div style="margin-top: 5px;">
        <span style="color: #fff;">Audio Engine:</span>
        <span style="color: #00aaff;">${engineType}</span>
      </div>`;

      html += `<div style="margin-top: 5px;">
        <span style="color: #fff;">Audio Ready:</span>
        <span style="color: ${audioStatus.ready ? '#00ff00' : '#ff0000'};">
          ${audioStatus.ready ? 'Yes' : 'No'}
        </span>
      </div>`;

      if (audioStatus.pendingTriggers > 0) {
        html += `<div style="color: #ffaa00;">Pending: ${audioStatus.pendingTriggers}</div>`;
      }
    }

    // Last OSC message info
    if (audioStatus?.lastState) {
      const state = audioStatus.lastState;
      html += `<div style="margin-top: 5px; font-size: 10px; color: #888;">
        Last: pitch=${state.pitch} harm=${state.harm?.toFixed(2)} dur=${state.dur?.toFixed(2)}
      </div>`;
    }

    content.innerHTML = html;
  }

  testAudio() {
    if (window.debugApp && window.debugApp.triggerTestSound) {
      window.debugApp.triggerTestSound();
      this.showSuccess('Test sound triggered!', 1000);
    } else {
      this.showError('Test function not available');
    }
  }

  reconnectWebSocket() {
    if (window.oscClient) {
      console.log('🔄 Attempting WebSocket reconnection...');

      // Disconnect current connection
      window.oscClient.disconnect();

      setTimeout(() => {
        // Try to reconnect using the same URL
        const lastUrl = window.oscClient.wsUrl;
        try {
          window.oscClient.connect();
          this.showSuccess('Reconnection attempted to ' + lastUrl, 2000);
          console.log('✅ Reconnection initiated');
        } catch (err) {
          this.showError('Reconnection failed: ' + err.message);
          console.error('❌ Reconnection error:', err);
        }
      }, 1000);
    } else {
      this.showError('No WebSocket client available');
    }
  }

  async restartAudioContext() {
    try {
      if (window.audioManager && window.audioManager.constructor.name === 'NativeAudioManager') {
        await window.audioManager.resumeAudioContext();
        this.showSuccess('Native audio context resumed!', 2000);
      } else if (typeof Tone !== 'undefined') {
        await Tone.start();
        this.showSuccess('Tone.js audio context restarted!', 2000);
      } else if (typeof userStartAudio === 'function') {
        await userStartAudio();
        this.showSuccess('p5.sound audio context restarted!', 2000);
      }
    } catch (err) {
      this.showError('Failed to restart audio: ' + err.message);
    }
  }

  hideDebugPanel() {
    const panel = document.getElementById('debug-panel');
    if (panel) {
      panel.remove();
    }

    if (this.debugUpdateInterval) {
      clearInterval(this.debugUpdateInterval);
      this.debugUpdateInterval = null;
    }
  }

  showDebugPanel() {
    this.createDebugPanel();
  }
}