# Posturama - Implementation Tasks

## Introduction

Posturama is a real-time posture monitoring system that runs entirely in your browser. It uses your webcam and MediaPipe's face landmark detection to track head tilt and alert you when your posture needs correction.

### How It Works

The system detects 478 facial landmarks using MediaPipe, calculates the angle between your eyes (points 33 and 263), and compares this against a configurable threshold. When your head tilts beyond the threshold, the widget changes from green to red, providing immediate visual feedback.

### Architecture Overview

- **Pure Functions**: Core angle calculations are separated from side effects for easy testing
- **Modular Design**: Face detection, posture calculation, UI, and audio are independent modules
- **Event-Driven**: Components communicate through events, maintaining loose coupling
- **Browser-Only**: All processing happens locally - no server required, preserving privacy

### Key Technologies

- MediaPipe Face Landmarks for detection
- WebRTC for camera access
- Web Audio API for alerts (planned)
- Pure JavaScript with no framework dependencies

### Design Decisions Made

- **Floating widget** (200x220px) in bottom-right corner
- **Strict threshold** adjustment via slider (3-8 degrees, default 5°)
- **Grace period** of 3 seconds before alerts (planned)
- **Video only in debug mode** for privacy
- **Completely stateless** - no data persistence

---

## Completed Tasks ✅

### Phase 1: Foundation

- [x] Research MediaPipe Face Landmarks documentation
- [x] Create test infrastructure (test-runner.js)
- [x] Write tests for core logic (44 unit tests passing)
- [x] Create Makefile for development workflow

### Phase 2: Core Implementation

- [x] Create basic HTML structure with widget container
- [x] Style floating widget (dark theme, 220px min-height to fit all controls)
- [x] Implement drag-to-move functionality
- [x] Setup webcam feed and permissions with error handling
- [x] Load MediaPipe library (fixed ES6 module loading issue)
- [x] Initialize FaceLandmarker with GPU acceleration
- [x] Run face detection loop at 10 FPS
- [x] Extract eye landmarks (points 33 and 263)
- [x] Calculate head tilt angle using atan2
- [x] Implement threshold evaluation (default 5°, range 3-8°)
- [x] Add visual feedback (green=good, red=bad, yellow=detecting)
- [x] Fix widget height issue (was 150px, now 220px minimum)
- [x] Add browser integration tests

### Phase 3: User Interface

- [x] Add threshold slider control (5-30°)
- [x] Create start/stop button (green pulsing play button)
- [x] Add mute button for future audio control
- [x] Add minimize functionality
- [x] Show real-time angle display
- [x] Display posture state with icons (✅/⚠️/⏳)

### Phase 4: Enhanced Feedback ✅

- [x] **Add grace period for alerts (3 seconds)**
  - Only trigger alert after sustained bad posture
  - Reset timer when posture improves
  - Prevent alert fatigue from temporary movements

- [x] **Create audio alert system**
  - Simple tone when posture becomes bad
  - Periodic reminders every 10 seconds while bad
  - Implement cooldown to prevent spam
  - Respect mute button state

### Phase 5: Debug & Visualization ✅

- [x] **Build debug mode with video display**
  - Show webcam feed with landmark overlay
  - Display all 478 landmark points
  - Draw angle visualization
  - Show threshold zones
  - Add FPS counter
  - Real-time metrics display

---

## Pending Tasks 📋

### Phase 6: Polish & Robustness

- [ ] **Handle edge cases**
  - Face leaves/enters frame smoothly
  - Multiple faces (use closest/largest)
  - Poor lighting conditions
  - Camera disconnection/reconnection

- [ ] **Performance optimization**
  - Reduce CPU when minimized
  - Adaptive FPS based on movement
  - Optimize landmark calculations

- [ ] **Improve user experience**
  - Add onboarding/calibration flow
  - Keyboard shortcuts (Space=pause, M=mute)
  - Better error messages
  - Loading progress indicator

### Phase 7: Future Enhancements (Optional)

- [ ] **Alternative landmark strategies**
  - Use symmetric points (temples + jaw) for stability
  - Implement face plane calculation for 3D accuracy
  - Add forward/backward lean detection

- [ ] **Data & Analytics**
  - Session statistics (% good posture)
  - Daily/weekly trends
  - Export data option
  - Streak tracking

- [ ] **Mobile/Embedded Support**
  - PWA manifest for installable app
  - Responsive design for phones
  - Raspberry Pi deployment guide
  - Electron desktop app

---

## Current File Structure

### Core Application

```
index.html          # Main app entry point
style.css           # Widget styling (dark theme)
app.js              # Main application logic
face-detector.js    # MediaPipe wrapper
posture-calculator.js # Angle calculation (pure functions)
```

### Tests

```
test-runner.js      # Custom test framework (no dependencies)
*.test.js           # Unit tests for each module
browser.test.js     # Browser integration tests
browser-test.html   # Browser test runner
Makefile            # Test commands (make test)
```

---

## Known Issues & Fixes

### ✅ Fixed Issues

1. **Module loading error** - MediaPipe exports ES6 modules, fixed by importing as module and exposing to window
2. **Widget height too small** - Was 150px with overflow:hidden, cutting off controls. Now 220px minimum
3. **Play button not visible** - Was hidden below fold, fixed by adjusting widget height and removing flex:1 from status

### 🐛 Current Issues

1. **MediaPipe download size** - ~7MB model download on first load
2. **Browser compatibility** - Best on Chrome/Edge, some issues on Safari
3. **CPU usage** - ~15-20% when actively monitoring

---

## Development Commands

```bash
# Run all tests
make test

# Run specific test file
make test-file FILE=posture-calculator.test.js

# Start local server
make serve

# Check project structure
make check

# Run browser integration tests
make test-browser
```

---

## Next Steps

1. Implement grace period to reduce false positives
2. Add audio feedback for better awareness
3. Create debug view for troubleshooting
4. Optimize performance for lower-end devices
5. Add progressive web app capabilities

The core posture detection is fully functional. The remaining tasks focus on user experience improvements and edge case handling.
