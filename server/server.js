const WebSocket = require('ws');
const osc = require('osc');
const http = require('http');
const fs = require('fs');
const path = require('path');

class OSCWebSocketBridge {
  constructor(oscPort = 3333, httpPort = 80) {
    this.oscPort = oscPort;
    this.httpPort = httpPort;
    this.clients = new Map(); // clientId -> { ws, lastActivity }
    this.currentClientIndex = 0;

    this.setupOSCListener();
    this.setupHttpServer();

    console.log(`OSC WebSocket Bridge starting...`);
    console.log(`- OSC listening on port ${oscPort}`);
    console.log(`- HTTP/WebSocket server on port ${httpPort}`);
  }

  setupOSCListener() {
    this.oscPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: this.oscPort,
      metadata: true
    });

    this.oscPort.on("ready", () => {
      console.log("OSC listener ready on port", this.oscPort.options.localPort);
    });

    this.oscPort.on("message", (oscMessage) => {
      console.log("Received OSC message:", oscMessage);
      this.distributeToClients(oscMessage);
    });

    this.oscPort.on("error", (err) => {
      console.error("OSC Error:", err);
    });

    this.oscPort.open();
  }

  setupHttpServer() {
    // Create HTTP server that serves static files
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // Attach WebSocket server to HTTP server
    this.wss = new WebSocket.Server({
      server: this.httpServer,
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientInfo = {
        ws: ws,
        lastActivity: Date.now(),
        userAgent: req.headers['user-agent'] || 'unknown',
        ip: req.socket.remoteAddress
      };

      this.clients.set(clientId, clientInfo);
      console.log(`Client ${clientId} connected (${this.clients.size} total clients)`);
      console.log(`- IP: ${clientInfo.ip}`);
      console.log(`- User Agent: ${clientInfo.userAgent}`);

      // Send welcome message with client info
      ws.send(JSON.stringify({
        type: 'welcome',
        clientId: clientId,
        totalClients: this.clients.size,
        message: 'Connected to OSC WebSocket Bridge'
      }));

      // Handle incoming messages from client
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`Message from client ${clientId}:`, message);

          if (message.type === 'ping') {
            clientInfo.lastActivity = Date.now();
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
        } catch (err) {
          console.error(`Error parsing message from client ${clientId}:`, err);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`Client ${clientId} disconnected (${this.clients.size} total clients)`);

        // Reset round-robin index if needed
        if (this.currentClientIndex >= this.clients.size) {
          this.currentClientIndex = 0;
        }

        // Notify remaining clients of updated count
        this.broadcastClientCount();
      });

      // Handle connection errors
      ws.on('error', (err) => {
        console.error(`WebSocket error for client ${clientId}:`, err);
        this.clients.delete(clientId);
      });

      // Notify all clients of updated count
      this.broadcastClientCount();
    });

    this.wss.on('error', (err) => {
      console.error('WebSocket Server Error:', err);
    });

    // Start HTTP server
    this.httpServer.listen(this.httpPort, () => {
      console.log(`HTTP/WebSocket server listening on port ${this.httpPort}`);
    });
  }

  handleHttpRequest(req, res) {
    // Get the requested path, default to index.html
    let filePath = req.url === '/' ? '/index.html' : req.url;

    // Security: prevent directory traversal
    filePath = filePath.replace(/\.\./g, '');

    // Construct full path to parent directory (where client files are)
    const fullPath = path.join(__dirname, '..', filePath);

    // Get file extension for content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.ico': 'image/x-icon'
    };

    const contentType = contentTypes[ext] || 'text/plain';

    // Read and serve the file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        console.error(`Failed to serve ${filePath}:`, err.message);
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
        return;
      }

      res.writeHead(200, {'Content-Type': contentType});
      res.end(data);
      console.log(`Served: ${filePath}`);
    });
  }

  distributeToClients(oscMessage) {
    if (this.clients.size === 0) {
      console.log("No clients connected, dropping OSC message");
      return;
    }

    const clientIds = Array.from(this.clients.keys());

    // If only one client, send everything to them
    if (clientIds.length === 1) {
      const clientId = clientIds[0];
      const client = this.clients.get(clientId);
      this.sendToClient(clientId, client, oscMessage);
      return;
    }

    // Round-robin distribution
    const targetClientId = clientIds[this.currentClientIndex];
    const targetClient = this.clients.get(targetClientId);

    if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
      this.sendToClient(targetClientId, targetClient, oscMessage);

      // Move to next client for next message
      this.currentClientIndex = (this.currentClientIndex + 1) % clientIds.length;
    } else {
      // Client is no longer available, remove and try again
      console.log(`Client ${targetClientId} no longer available, removing`);
      this.clients.delete(targetClientId);
      this.currentClientIndex = 0;

      if (this.clients.size > 0) {
        this.distributeToClients(oscMessage); // Retry with remaining clients
      }
    }
  }

  sendToClient(clientId, client, oscMessage) {
    try {
      const message = {
        type: 'osc',
        address: oscMessage.address,
        args: oscMessage.args,
        timestamp: Date.now(),
        clientId: clientId
      };

      client.ws.send(JSON.stringify(message));
      client.lastActivity = Date.now();

      console.log(`Sent OSC message to client ${clientId}:`, message);
    } catch (err) {
      console.error(`Error sending to client ${clientId}:`, err);
      this.clients.delete(clientId);
    }
  }

  broadcastClientCount() {
    const message = {
      type: 'clientCount',
      count: this.clients.size,
      timestamp: Date.now()
    };

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (err) {
          console.error(`Error broadcasting to client ${clientId}:`, err);
          this.clients.delete(clientId);
        }
      }
    });
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup stale connections
  cleanupStaleConnections() {
    const now = Date.now();
    const staleTimeout = 60000; // 1 minute

    this.clients.forEach((client, clientId) => {
      if (now - client.lastActivity > staleTimeout) {
        console.log(`Removing stale client ${clientId}`);
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close();
        }
        this.clients.delete(clientId);
      }
    });
  }

  getStatus() {
    return {
      connectedClients: this.clients.size,
      currentRoundRobinIndex: this.currentClientIndex,
      clients: Array.from(this.clients.entries()).map(([id, client]) => ({
        id,
        lastActivity: new Date(client.lastActivity).toISOString(),
        userAgent: client.userAgent,
        ip: client.ip
      }))
    };
  }
}

// Start the bridge server
const bridge = new OSCWebSocketBridge();

// Cleanup stale connections every 30 seconds
setInterval(() => {
  bridge.cleanupStaleConnections();
}, 30000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down OSC WebSocket Bridge...');
  bridge.oscPort.close();
  bridge.wss.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});

// Status endpoint (if needed for debugging)
process.on('SIGUSR1', () => {
  console.log('Current server status:', JSON.stringify(bridge.getStatus(), null, 2));
});