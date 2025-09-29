export class OSCWebSocketClient {
  constructor(wsUrl = 'ws://localhost:3334') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.clientId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // 2 seconds
    this.lastPlaitsState = null;

    this.connect();
  }

  connect() {
    try {
      console.log(`Attempting to connect to WebSocket server: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = (event) => {
        console.log('WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Send ping to keep connection alive
        this.startPingInterval();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err, event.data);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.clientId = null;

        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  handleMessage(message) {
    console.log('Received WebSocket message:', message);

    switch (message.type) {
      case 'welcome':
        this.clientId = message.clientId;
        console.log(`🎉 Connected as client: ${this.clientId}`);
        console.log(`📱 Total clients connected: ${message.totalClients}`);
        break;

      case 'osc':
        console.log('🎵 OSC Message received:');
        console.log(`   Address: ${message.address}`);
        console.log(`   Args: [${message.args.join(', ')}]`);
        console.log(`   Target Client: ${message.clientId}`);
        console.log(`   Timestamp: ${new Date(message.timestamp).toISOString()}`);

        this.handleOSCMessage(message);
        break;

      case 'clientCount':
        console.log(`📊 Client count updated: ${message.count} total clients`);
        break;

      case 'pong':
        console.log('📡 Pong received from server');
        break;

      default:
        console.log('❓ Unknown message type:', message.type, message);
    }
  }

  handleOSCMessage(oscMessage) {
    // Handle different OSC message types

    if (oscMessage.address === '/onset') {
      const [freq, amp, dur] = oscMessage.args;
      console.log(`🔊 Onset triggered: ${freq}Hz @ ${amp} amplitude for ${dur}s`);
    }
    else if (oscMessage.address === '/plaits/state') {
      // Parse key-value pairs from args array
      const plaitsData = this.parseKeyValueArgs(oscMessage.args);

      // TODO: MASSIVE TODO - Add support for voice indices 1 and 2 later!
      // For now, only process voice 0 to keep things simple during development
      // The system supports 3 Plaits sequences (voice 0, 1, 2) but we're only
      // handling voice 0. Later we'll need to:
      // - Handle different synth patches for each voice
      // - Potentially different visual responses per voice
      // - Route to different audio channels/effects
      // - Consider polyphonic vs. separate monophonic handling

      if (plaitsData.voice !== 0) {
        console.log(`⏭️  Ignoring voice ${plaitsData.voice} (only processing voice 0 for now)`);
        return;
      }

      console.log('🎛️  Plaits State Update (Voice 0):');
      console.log(`   Voice: ${plaitsData.voice || 'N/A'}`);
      console.log(`   Note: ${plaitsData.note || 'N/A'}`);
      console.log(`   Tempo: ${plaitsData.tempo || 'N/A'}`);
      console.log(`   Pitch: ${plaitsData.pitch || 'N/A'}`);
      console.log(`   Engine: ${plaitsData.engine || 'N/A'}`);
      console.log(`   Harmonics: ${plaitsData.harm || 'N/A'}`);
      console.log(`   Timbre: ${plaitsData.timbre || 'N/A'}`);
      console.log(`   Decay: ${plaitsData.decay || 'N/A'}`);
      console.log(`   Morph: ${plaitsData.morph || 'N/A'}`);
      console.log(`   Duration: ${plaitsData.dur || 'N/A'}`);
      console.log(`   Volume: ${plaitsData.volume || 'N/A'}`);
      console.log('   Raw data:', plaitsData);

      // Trigger audio and visual effects
      let synthDuration = null;

      if (window.audioManager) {
        // Get the mapped parameters to extract the duration
        const audioParams = window.audioManager.mapOSCToFMParams(plaitsData);
        synthDuration = audioParams.duration;

        window.audioManager.handlePlaitsState(plaitsData);
      }

      if (window.visualManager) {
        window.visualManager.handleOSCVisuals(plaitsData, synthDuration);
      }
    }
    else {
      console.log(`🎵 Generic OSC Message: ${oscMessage.address}`, oscMessage.args);
    }
  }

  parseKeyValueArgs(args) {
    const result = {};

    // Extract raw values from OSC type objects
    const rawArgs = args.map(arg => {
      if (typeof arg === 'object' && arg.hasOwnProperty('value')) {
        return arg.value;
      }
      return arg;
    });

    // Skip first arg (voice index) and parse remaining key-value pairs
    let startIndex = 1; // Skip voice index

    for (let i = startIndex; i < rawArgs.length; i += 2) {
      const key = rawArgs[i];     // Should be string key
      const value = rawArgs[i + 1]; // Should be the value

      if (key && value !== undefined) {
        result[key] = value;
      }
    }

    // Also include voice index if present
    if (rawArgs.length > 0) {
      result.voice = rawArgs[0];
    }

    return result;
  }

  startPingInterval() {
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000);
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`⏳ Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }

    this.isConnected = false;
    this.clientId = null;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      clientId: this.clientId,
      readyState: this.ws ? this.ws.readyState : null,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}