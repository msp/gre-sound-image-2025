# GRE-SI OSC WebSocket Bridge

A networked, browser based audiovisual instrument. Created for Matt Spendlove & Sally Golding's performance at Greenwich Sound Image 2025.

Server receives OSC messages from SuperCollider and distributes them to mobile web clients to partipate in the performance..


## 🚀 Quick Start

### Download and Run

1. **Download** the server binary from [Releases](../../releases):
   - **macOS Apple Silicon**: `gre-si-osc-websocket-bridge-macos-arm64`
   - **macOS Intel**: `gre-si-osc-websocket-bridge-macos-x64`
   - **Windows**: `gre-si-osc-websocket-bridge-win-x64.exe`

2. **Double-click** the binary to start the server

#### !! macOS Security Warning !!
macOS will show "cannot verify developer" warning for unsigned binaries:
1. Right-click the binary → "Open"
2. Dismiss the security warning dialog
3. Go to System Preferences → Security & Privacy → Click "Open Anyway"


### Server Status
When running, you'll see:
```
OSC WebSocket Bridge starting...
- OSC listening on port 3333
- HTTP/WebSocket server on port 80
OSC listener ready on port 3333
HTTP/WebSocket server listening on port 80
```

## 📱 Connect Devices

### Local Testing
- Open `http://localhost` in your browser.

### Performance Setup
1. **Find your computer's IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # Windows
   ipconfig
   ```

2. **Share with audience devices:** `http://192.168.1.100` (use your actual IP)

3. **Mobile devices:**
   - Connect to the same WiFi network
   - Navigate to the server URL
   - Tap "Tap to Play" to enable audio

## 🎵 SuperCollider Integration Test

Send OSC messages to the bridge server to mimic the performance. Cut and paste into a SC window and CMD-Enter to execute 

```supercollider
(
// Connect to the bridge server
~bridge = NetAddr("localhost", 3333);

// Send Plaits state updates
~bridge.sendMsg('/plaits/state',
    0,      // 0 or 1 (voice 2 not yet implemented)
	 "pitch", 90,    // Frequency in Hz
    "dur", 0.1,      // Duration in seconds
    "engine", 2,     // Plaits engine number
    "harm", 0.6,     // Harmonics
    "timbre", 0.8,   // Timbre
    "morph", 0.9,    // Morph
    "decay", 0.05     // Decay
);
)
```

### Visual Effects
- **Voice 0**: Full-screen color flash
- **Voice 1**: Left-to-right color wash animation synchronized to note duration


## 📄 Technical Details

For developers and technical collaborators, see [DEVELOPMENT.md](DEVELOPMENT.md) for:
- Development setup and building from source
- Code architecture and customization
- OSC message format details
- Debugging and testing procedures

**Project**: ACMI-202210 Microcinema
**License**: MIT