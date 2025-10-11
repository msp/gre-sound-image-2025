# Development Guide

## 🛠 Development Setup

### Prerequisites
- Node.js 18+
- npm

### Install Dependencies
```bash
cd server
npm install
```

### Development Commands
```bash
# Start development server with auto-reload
npm run dev

# Start production server
npm start

# Build binaries
npm run build:mac      # macOS ARM64
npm run build:mac-x64  # macOS Intel
npm run build:win      # Windows x64
npm run build:all      # All platforms
```

### Project Structure
```
├── index.html              # Client web app entry point
├── css/
│   └── style.css          # Client styles
├── js/
│   ├── main.js            # Client application entry
│   └── modules/           # Client-side modules
├── libraries/             # Offline dependencies (Tone.js, p5.js, etc.)
├── server/
│   ├── server.js          # WebSocket bridge server
│   ├── package.json       # Server dependencies & build config
│   └── dist/              # Built binaries
└── .github/workflows/     # Automated release builds
```

## 🎨 Client Architecture

### Audio Engine
- **Tone.js** - Web Audio API wrapper

### Visual System
- **Voice 0**: Full-screen color flash
- **Voice 1**: Left-to-right color wash animation
- **Voice 2**: Not yet implemented

Visual rendering uses swappable draw methods in `VisualManager.js`:
```javascript
// Voice-specific rendering functions
drawVoice0(p) { /* full screen flash */ }
drawVoice1(p) { /* left-to-right wash */ }
```

## 🌐 Server Architecture

### WebSocket + HTTP Server
Single Node.js process handles both:
- **HTTP**: Serves static files (web app)
- **WebSocket**: Real-time OSC message distribution
- **OSC**: Receives from SuperCollider on port 3333

### Round-Robin Distribution
```javascript
// Cycles through connected clients
distributeToClients(oscMessage) {
  const clientIds = Array.from(this.clients.keys());
  const targetClient = clientIds[this.currentClientIndex % clientIds.length];
  // Send to specific client...
}
```

## 📡 OSC Message Format

### Plaits State Messages
```
Address: /plaits/state
Args: [voiceIndex, "key1", value1, "key2", value2, ...]
```

Example:
```supercollider
~bridge.sendMsg('/plaits/state',
    0,              // Voice index (0 or 1)
    "note", 60,     // MIDI note
    "pitch", 440,   // Frequency Hz
    "dur", 0.5,     // Duration seconds
    "volume", 0.8,  // Volume 0.0-1.0
    "engine", 2,    // Plaits engine
    "harm", 0.5,    // Harmonics
    "timbre", 0.3,  // Timbre
    "morph", 0.7,   // Morph
    "decay", 0.4    // Decay
);
```

### Client-side OSC Parsing
```javascript
parseKeyValueArgs(args) {
  // Extracts key-value pairs from OSC args array
  // Skips voice index, processes remaining as key-value pairs
}
```

## 🔧 Configuration Options

### Server Port
Edit `server/server.js`:
```javascript
const httpPort = 8080; // Change from 80 to avoid admin privileges
```

### WebSocket Connection URLs
Edit `js/main.js`:
```javascript
const wsUrls = [
  'ws://localhost',              // Local development
  'ws://192.168.1.100',         // Static IP for performance
  `ws://${window.location.hostname}` // Same host fallback
];
```

### Audio Parameters Mapping
Edit `AudioManager.js` methods:
```javascript
mapOSCToFMParams(plaitsData) {
  // Maps OSC parameters to audio synthesis parameters
}
```

## 📦 Binary Packaging

### pkg Configuration
`server/package.json`:
```json
{
  "bin": "server.js",
  "pkg": {
    "assets": [
      "../index.html",
      "../css/**/*",
      "../js/**/*",
      "../libraries/**/*"
    ]
  }
}
```

### Build Scripts
- `--public` flag creates macOS-compatible binaries
- `--targets` specifies platform (node18-macos-arm64, etc.)
- `--out-path dist` outputs to dist directory

### GitHub Actions Automation
- Triggers on git tags (`v*`)
- Builds for 3 platforms in parallel
- Creates GitHub release with binaries
- Requires `permissions: contents: write`

## 🧪 Testing

### Local Testing
```bash
# Start server
cd server && npm run dev

# Open client
open http://localhost

# Test OSC (requires SuperCollider)
# Send test messages to localhost:3333
```

### Network Testing
1. Find local IP: `ifconfig | grep "inet "`
2. Start server: `npm start`
3. Connect mobile device to `http://[your-ip]`
4. Test WebSocket connection and audio

### Performance Testing
- Test with 10-20 concurrent devices
- Monitor WebSocket connections in browser console
- Check audio synchronization across devices
- Verify round-robin distribution in server logs

## 🐛 Debugging

### Client Debug Tools
- **Eruda**: Mobile debugging console (included)
- **Browser Console**: WebSocket connection status
- **Debug Panel**: Shows in app after audio initialization

### Server Debug Output
```bash
# Verbose OSC message logging
console.log('Received OSC message:', oscMessage);

# Client connection tracking
console.log(`Client ${clientId} connected (${this.clients.size} total)`);
```

### Common Issues
- **Audio Context**: Requires user gesture (tap-to-play)
- **WebSocket Failures**: Check firewall/network settings
- **Binary Path Issues**: Use `--public` flag in pkg
- **macOS Gatekeeper**: Right-click → Open → Security & Privacy

## 🚀 Release Process

1. **Development**: Make changes, test locally
2. **Commit**: `git commit -m "your changes"`
3. **Push**: `git push origin master`
4. **Tag**: `git tag v1.x.x`
5. **Release**: `git push origin v1.x.x`
6. **Automated**: GitHub Actions builds and releases binaries

### Manual Release
```bash
# Build locally
npm run build:all

# Create release manually
gh release create v1.x.x dist/* --title "Release v1.x.x" --generate-notes
```