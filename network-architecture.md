# Network Architecture Diagram

```
    Mobile Devices (Audience)
           │
           │ WiFi Connection (Physical)
           │ HTTP/WebSocket Traffic (Logical)
           │ → http://192.168.1.100
           │
    ┌─────────────────┐
    │   WiFi Router   │ ← Ubiquiti Setup
    │   (U6 Pro +     │
    │   Cloud Gateway)│
    └─────────────────┘
           │
           │ Ethernet (Physical)
           │
    ┌─────────────────┐
    │   Matt's PC     │
    │ 192.168.1.100   │
    │                 │
    │ ┌─────────────┐ │
    │ │SuperCollider│ │ ← Generates OSC messages
    │ └─────────────┘ │
    │        │        │
    │        v (OSC)  │
    │ ┌─────────────┐ │
    │ │HTTP &       │ │ ← Receives OSC, serves web app,
    │ │WebSocket    │ │   distributes to devices via WebSocket
    │ │Server :80   │ │   using round-robin
    │ │             │ │
    │ └─────────────┘ │
    └─────────────────┘

Communication Flow:
1. SuperCollider sends OSC messages locally on Matt's PC
2. Mobile devices connect via WiFi and request web app via HTTP
3. HTTP server serves web app, WebSocket connection established
4. SuperCollider → WebSocket server → round-robin to specific device
5. Device receives audio/visual parameters and plays synchronized content
6. No device-to-device communication needed
```

## Sequence Diagram: Client-Server Communication

```
Mobile Device          Matt's PC (192.168.1.100:80)
     │                           │
     │ HTTP GET /                │
     │ ────────────────────────> │
     │                           │
     │ HTML/JS/CSS               │
     │ <──────────────────────── │
     │                           │
     │ WebSocket Upgrade         │
     │ (same port 80)            │
     │ ────────────────────────> │
     │                           │
     │ WebSocket Connected       │
     │ <──────────────────────── │
     │                           │
     │                           │ ← SuperCollider sends OSC
     │                           │
     │ Audio/Visual Parameters   │
     │ <──────────────────────── │ (Round-robin selection)
     │                           │
     │ [Play sound + visuals]    │
     │                           │
     │ (Connection stays open)   │
     │ <──────────────────────── │
     │                           │
```