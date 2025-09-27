# Posturama

Real-time posture monitoring for healthier computer work.

**Live Demo:** [https://dnouri.github.io/Posturama](https://dnouri.github.io/Posturama)

## What it does

Posturama helps prevent cervicogenic headaches and asymmetrical neck strain by monitoring lateral head tilt during computer work. By maintaining neutral head alignment, users can reduce muscle tension imbalances that contribute to workplace-related neck discomfort.

The app uses your webcam to detect head position and provides immediate visual feedback when your posture needs correction, helping you build better ergonomic habits over time.

## Key Features

- **Real-time monitoring** - Detects head tilt angle 10 times per second using MediaPipe face landmarks
- **Visual feedback** - Widget turns green for good posture, red when correction needed
- **Adjustable threshold** - Customize sensitivity from 5-30 degrees based on your needs
- **Grace period** - 3-second buffer prevents alert fatigue from temporary movements
- **Audio alerts** - Optional sound notifications with periodic reminders
- **Privacy-first** - All processing happens locally in your browser, no data ever leaves your device
- **Debug mode** - Visualize landmark detection and angle measurements for troubleshooting

## Installation

Open `index.html` in your browser. That's it.

For the best experience, serve the files locally:

```bash
make serve
# or
python3 -m http.server 8000
```

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari (limited)

Requires webcam access permissions.

## Technical Highlights

- **Pure JavaScript** - No frameworks or build tools required
- **Test-driven development** - 58 unit tests with custom test runner
- **Modular architecture** - Clean separation of concerns with event-driven design
- **MediaPipe integration** - Leverages Google's face landmark detection
- **CI/CD ready** - GitHub Actions for testing, linting, and deployment

## Project Structure

```
├── index.html              # Main application
├── app.js                  # Application orchestration
├── posture-calculator.js   # Pure functions for angle calculation
├── face-detector.js        # MediaPipe wrapper
├── grace-period.js         # Alert timing logic
├── audio-alert.js          # Sound notifications
├── debug-view.js           # Debug visualization
└── test-runner.js          # Custom test framework
```

## Development

```bash
# Run tests
make test

# Check code formatting
make lint

# Format code
make format

# Run tests and lint (pre-commit)
make check

# Start development server
make serve
```

## Important Notice

This app monitors only lateral (sideways) head tilt and does not assess forward head posture or overall postural alignment. It is designed as an ergonomic awareness tool to complement, not replace, proper workstation setup and regular movement breaks. Users experiencing ongoing neck pain or headaches should consult healthcare professionals.

## License

MIT

## Author

Daniel Nouri - [dnouri](https://github.com/dnouri)
