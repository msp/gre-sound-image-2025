// Main application entry point - coordinates all modules
import { OSCWebSocketClient } from './modules/OSCWebSocketClient.js';
import { AudioManager } from './modules/AudioManager.js';
import { UIManager } from './modules/UIManager.js';
import { VisualManager } from './modules/VisualManager.js';

// Global instances
let oscClient = null;
let audioManager = null;
let uiManager = null;
let visualManager = null;

// Initialize application
async function initializeApp() {
  try {
    console.log('🚀 Initializing GRE-SI OSC WebSocket Application...');

    // Create managers
    audioManager = new AudioManager();
    uiManager = new UIManager();
    visualManager = new VisualManager();

    // Make managers globally available for OSCWebSocketClient
    window.audioManager = audioManager;
    window.visualManager = visualManager;

    // Initialize visual manager
    visualManager.initialize();

    // Create tap-to-play interface
    uiManager.createTapToPlayInterface();
    uiManager.addTapToPlayHandler(handleTapToPlay);

    // Initialize WebSocket connection
    await initializeWebSocketConnection();

    console.log('✅ Application initialized successfully');

  } catch (error) {
    console.error('❌ Failed to initialize application:', error);
    uiManager.showError('Failed to initialize application. Please refresh the page.');
  }
}

async function handleTapToPlay() {
  try {
    // Initialize audio
    await audioManager.initializeAudio();

    // Remove tap-to-play interface
    uiManager.removeTapToPlayInterface();
    uiManager.showSuccess('Audio initialized! Ready to receive OSC messages.');

    // Show debug panel after tap-to-play is dismissed (for development)
    setTimeout(() => {
      uiManager.showDebugPanel();
    }, 1000); // Wait for success message to show

    console.log('✅ Audio initialized and ready');

  } catch (error) {
    console.error('❌ Failed to initialize audio:', error);
    uiManager.showError('Failed to initialize audio. Please try again.');
  }
}

async function initializeWebSocketConnection() {
  // Try to connect to WebSocket servers in order of preference
  const wsUrls = [
    'ws://localhost:3334',           // Local development
    'ws://192.168.8.1:3334',        // GL iNet router setup
    `ws://${window.location.hostname}:3334`  // Same host as web page
  ];

  function tryConnect(urlIndex = 0) {
    if (urlIndex >= wsUrls.length) {
      console.error('❌ Failed to connect to any WebSocket server');
      uiManager.showError('Failed to connect to WebSocket server');
      return;
    }

    const wsUrl = wsUrls[urlIndex];
    console.log(`Trying WebSocket URL: ${wsUrl}`);

    oscClient = new OSCWebSocketClient(wsUrl);

    // Expose to global scope for debugging
    window.oscClient = oscClient;

    // Monitor connection status
    const originalHandleMessage = oscClient.handleMessage.bind(oscClient);
    oscClient.handleMessage = function(message) {
      if (message.type === 'welcome') {
        uiManager.showConnectionStatus(true, message.clientId);
      }
      return originalHandleMessage(message);
    };

    // Check connection after 3 seconds
    setTimeout(() => {
      if (!oscClient.isConnected) {
        console.log(`⚠️  Connection failed for ${wsUrl}, trying next...`);
        oscClient.disconnect();
        tryConnect(urlIndex + 1);
      }
    }, 3000);
  }

  tryConnect();
}

// Cleanup on page unload
function cleanup() {
  console.log('🧹 Cleaning up application...');

  if (oscClient) {
    oscClient.disconnect();
  }

  if (audioManager) {
    // Stop any ongoing audio
    try {
      if (Tone && Tone.Transport) {
        Tone.Transport.stop();
      }
    } catch (err) {
      console.warn('Error stopping Tone transport:', err);
    }
  }

  if (visualManager) {
    visualManager.destroy();
  }
}

// Application lifecycle events
document.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('beforeunload', cleanup);

// Expose instances to global scope for debugging
window.oscClient = null; // Will be set after connection
window.audioManager = null; // Will be set in initializeApp
window.uiManager = null; // Will be set in initializeApp
window.visualManager = null; // Will be set in initializeApp

// Development helpers
window.debugApp = {
  getOSCStatus: () => oscClient ? oscClient.getStatus() : null,
  getAudioStatus: () => ({
    ready: audioManager ? audioManager.isAudioReady() : false,
    pendingTriggers: audioManager ? audioManager.getPendingTriggersCount() : 0,
    lastState: audioManager ? audioManager.getLastPlaitsState() : null
  }),
  triggerTestSound: () => {
    if (audioManager && audioManager.isAudioReady()) {
      audioManager.handlePlaitsState({
        voice: 0,
        pitch: 60 + Math.floor(Math.random() * 24), // Random note C4-C6
        volume: 0.8,
        dur: 0.5
      });
    } else {
      console.log('Audio not ready');
    }
  },
  showDebugPanel: () => {
    if (uiManager) {
      uiManager.showDebugPanel();
    } else {
      console.log('UIManager not ready');
    }
  },
  hideDebugPanel: () => {
    if (uiManager) {
      uiManager.hideDebugPanel();
    } else {
      console.log('UIManager not ready');
    }
  }
};