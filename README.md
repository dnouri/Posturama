# Posturama

Real-time posture monitoring for healthier computer work.

**➜ Try it now:** [Posturama](https://dnouri.github.io/Posturama) _(No installation required)_

## What it does

Posturama helps prevent cervicogenic headaches and asymmetrical neck strain by monitoring lateral head tilt during computer work. By maintaining neutral head alignment, users can reduce muscle tension imbalances that contribute to workplace-related neck discomfort.

The app uses your webcam to detect head position and provides immediate visual feedback when your posture needs correction, helping you build better ergonomic habits over time.

## Quick Start

1. **Open** [Posturama](https://dnouri.github.io/Posturama) in your browser
2. **Click** "Start Monitoring"
3. **Allow** camera access when prompted
4. **Position** the small monitor window where you can see it
5. **Work** normally - Posturama will alert you when your posture needs adjustment

That's it! The launcher window closes automatically once monitoring starts.

## Using Posturama

### The Monitor Window

The compact monitor shows your posture status at a glance:

- **Green (✅)** - Good posture, keep it up!
- **Yellow (⏳)** - Detecting your position
- **Red (⚠️)** - Time to straighten your head

### Controls

- **▶/⏸ Button** - Start or pause monitoring
- **Threshold Slider** - Adjust sensitivity (3-8 degrees)
  - Lower = more strict
  - Higher = more lenient
  - Default: 5°
- **🔊/🔇 Button** - Toggle sound alerts
- **🐛 Button** - Open debug view to see what the camera sees

### Privacy First

- ✅ All processing happens in your browser
- ✅ No video is recorded or stored
- ✅ No data ever leaves your device
- ✅ No account or sign-up required

## Requirements

- Modern browser (Chrome, Firefox, or Edge)
- Webcam
- Popup windows must be allowed (you'll be prompted)

## Important Notice

This app monitors only lateral (sideways) head tilt and does not assess forward head posture or overall postural alignment. It is designed as an ergonomic awareness tool to complement, not replace, proper workstation setup and regular movement breaks. Users experiencing ongoing neck pain or headaches should consult healthcare professionals.

---

# Technical Documentation

_For developers and contributors_

## Architecture Overview

Posturama uses a popup window architecture to ensure continuous monitoring without browser tab throttling. The app leverages MediaPipe's face landmark detection to calculate head tilt angle in real-time.

### Why Popup Windows?

Browser tabs throttle JavaScript to 1Hz when inactive. Since posture monitoring needs to run continuously in the background, Posturama uses a dedicated popup window that remains active even when not in focus.

### Key Components

```
├── index.html              # Launcher page
├── monitor.html            # Popup monitor window
├── app.js                  # Application orchestration
├── posture-calculator.js   # Pure functions for angle calculation
├── face-detector.js        # MediaPipe wrapper
├── grace-period.js         # Alert timing logic
├── audio-alert.js          # Sound notifications
├── debug-view.js           # Debug visualization
├── style.css               # Popup window styles
└── test-runner.js          # Custom test framework
```

## Technical Features

- **Pure JavaScript** - No frameworks, no build tools, no dependencies
- **Test-Driven Development** - 65+ tests with custom test runner
- **Modular Architecture** - Event-driven design with clean separation of concerns
- **MediaPipe Integration** - Google's 478-point face landmark detection
- **Grace Period System** - 3-second buffer prevents alert fatigue
- **Web Audio API** - Generated tones for audio alerts (no audio files)

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/dnouri/posturama.git
cd posturama

# Run tests
make test

# Start development server
make serve
# Then open http://localhost:8000
```

### Testing

```bash
# Run all tests
make test

# Run specific test file
make test-file FILE=posture-calculator.test.js

# Watch mode
make test-watch

# Coverage summary
make test-coverage
```

### Code Quality

```bash
# Check formatting
make lint

# Auto-format code
make format

# Run all checks (tests + lint)
make check
```

## How It Works (Technical)

### Detection Pipeline

1. **Video Capture** → Webcam at 640×480 resolution
2. **Face Detection** → MediaPipe FaceLandmarker identifies 478 facial landmarks
3. **Angle Calculation** → Extract eye positions (landmarks 33 & 263), calculate tilt angle
4. **Posture Evaluation** → Compare angle against threshold
5. **Grace Period** → 3-second buffer for temporary movements
6. **Feedback Loop** → Visual/audio alerts if bad posture persists

### State Management

```javascript
DETECTING → GOOD_POSTURE ↔ BAD_POSTURE
```

- **DETECTING**: No face found or initializing
- **GOOD_POSTURE**: Head tilt within threshold
- **BAD_POSTURE**: Head tilt exceeds threshold after grace period

### Performance Optimizations

- Processes at 10 FPS (balanced accuracy vs CPU usage)
- Throttled render updates to prevent UI jank
- Efficient landmark extraction (only uses 2 of 478 points)
- Canvas rendering only when debug view is active

## Debug Mode

The debug view provides real-time visualization for troubleshooting:

1. Click 🐛 to open debug mode
2. Window expands to 500×600px
3. Shows:
   - Live camera feed with overlay
   - Eye position markers
   - Angle visualization
   - FPS counter
   - All metrics (angle, threshold, state, grace period)
4. Click ✕ to return to normal size

## Contributing

Contributions welcome! The codebase follows:

- Test-first development
- No external dependencies
- Clean, modular architecture
- Comprehensive documentation

Run `make check` before submitting PRs.

## License

MIT
