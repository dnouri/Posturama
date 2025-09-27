/**
 * Posturama - Main Application
 * Browser-based posture detection using MediaPipe Face Landmarks
 */

class PosturamaApp {
  constructor() {
    // DOM Elements
    this.widget = document.getElementById('posture-widget')
    this.video = document.getElementById('webcam')
    this.statusIcon = document.querySelector('.status-icon')
    this.statusText = document.querySelector('.status-text')
    this.angleDisplay = document.querySelector('.angle-display')
    this.thresholdSlider = document.querySelector('.threshold-slider')
    this.thresholdValue = document.querySelector('.threshold-value')
    this.toggleBtn = document.querySelector('.btn-toggle')
    this.muteBtn = document.querySelector('.btn-mute')
    this.debugBtn = document.querySelector('.btn-debug')

    // State
    this.isMonitoring = false
    this.isMuted = false
    this.threshold = 5
    this.currentAngle = 0
    this.postureState = 'detecting'

    // Face detection
    this.faceDetector = null
    this.stream = null

    // Audio system
    this.audioAlert = null

    // Debug view
    this.debugView = null

    // Initialize
    this.init()
  }

  async init() {
    this.setupControls()
    this.updateStatus('detecting', 'Click ▶ to start')

    // Initialize audio system
    if (window.AudioAlert) {
      this.audioAlert = new window.AudioAlert()
      await this.audioAlert.initialize()
      console.log('Audio system initialized:', this.audioAlert.isReady)
    }
  }

  // Control Setup
  setupControls() {
    // Threshold slider
    this.thresholdSlider.addEventListener('input', (e) => {
      this.threshold = parseFloat(e.target.value)
      this.thresholdValue.textContent = `${this.threshold}°`
    })

    // Toggle monitoring
    this.toggleBtn.addEventListener('click', () => {
      if (this.isMonitoring) {
        this.stopMonitoring()
      } else {
        this.startMonitoring()
      }
    })

    // Mute toggle
    this.muteBtn.addEventListener('click', () => {
      this.isMuted = !this.isMuted
      this.muteBtn.classList.toggle('muted', this.isMuted)
      this.muteBtn.textContent = this.isMuted ? '🔇' : '🔊'

      // Update audio volume
      if (this.audioAlert) {
        this.audioAlert.setVolume(this.isMuted ? 0 : 0.3)
      }
    })

    // Debug view
    this.debugBtn.addEventListener('click', () => {
      this.openDebugView()
    })
  }

  // Monitoring Control
  async startMonitoring() {
    this.isMonitoring = true
    this.toggleBtn.textContent = '⏸'
    this.toggleBtn.classList.add('playing')
    this.updateStatus('detecting', 'Starting camera...')

    try {
      // Setup camera
      await this.setupCamera()
      this.updateStatus('detecting', 'Camera ready')
      console.log('Camera initialized successfully')

      // Initialize face detector
      await this.initializeFaceDetector()
      console.log('MediaPipe ready')

      // Start detection loop
      this.startDetectionLoop()
    } catch (error) {
      if (error.name && error.name.includes('Camera')) {
        this.handleCameraError(error)
      } else {
        console.error('Initialization error:', error)
        this.updateStatus('detecting', 'Failed to load face detector')
      }
      this.stopMonitoring()
    }
  }

  async initializeFaceDetector() {
    if (!this.faceDetector) {
      this.faceDetector = new window.FaceDetector()
    }

    // Initialize with progress callback
    await this.faceDetector.initialize((status) => {
      this.updateStatus('detecting', status)
    })

    return true
  }

  // Detection Loop
  startDetectionLoop() {
    const targetFPS = 10
    const frameInterval = 1000 / targetFPS
    let lastFrameTime = 0

    const detectFrame = (timestamp) => {
      // Stop if monitoring disabled
      if (!this.isMonitoring) {
        return
      }

      // Throttle to target FPS
      if (timestamp - lastFrameTime >= frameInterval) {
        this.performDetection(timestamp)
        lastFrameTime = timestamp
      }

      // Continue loop
      requestAnimationFrame(detectFrame)
    }

    // Start the loop
    requestAnimationFrame(detectFrame)
  }

  performDetection(timestamp) {
    if (!this.faceDetector || !this.faceDetector.isReady) {
      return
    }

    try {
      // Detect faces in current frame
      const detection = this.faceDetector.detectFaces(this.video, timestamp)

      if (detection && detection.landmarks) {
        // Face detected - calculate head tilt
        try {
          const angle = window.PostureCalculator.calculateHeadTilt(detection.landmarks)
          this.currentAngle = angle

          // Evaluate posture against threshold
          const evaluation = window.PostureCalculator.evaluatePosture(angle, this.threshold)

          // Apply grace period logic
          const gracePeriodResult = window.GracePeriod.evaluate(!evaluation.isGood)

          // Update status based on grace period evaluation
          if (evaluation.isGood) {
            this.updateStatus('good', '✓ Good posture', angle)
          } else if (gracePeriodResult.isInGracePeriod) {
            // In grace period - show warning but don't alert yet
            const direction = evaluation.direction === 'right' ? '→' : '←'
            this.updateStatus('bad', `⏱ Tilted ${direction}`, angle)
          } else {
            // Grace period expired - full alert
            const direction = evaluation.direction === 'right' ? '→' : '←'
            this.updateStatus('bad', `⚠ Tilted ${direction}`, angle)

            // Trigger audio alert if needed
            if (gracePeriodResult.shouldAlert) {
              this.triggerAlert(gracePeriodResult.alertType)
            }
          }

          // Update debug view if open
          if (this.debugView && this.debugView.isVisible) {
            this.debugView.updateVisualization({
              landmarks: detection.landmarks,
              angle: angle,
              threshold: this.threshold,
              postureState: evaluation.isGood ? 'good' : 'bad',
              gracePeriod: gracePeriodResult,
            })
          }
        } catch (calcError) {
          console.error('Calculation error:', calcError)
          this.updateStatus('detecting', 'Processing error', null)
        }
      } else {
        // No face detected
        this.currentAngle = 0
        this.updateStatus('detecting', 'No face detected', null)

        // Update debug view with no landmarks
        if (this.debugView && this.debugView.isVisible) {
          this.debugView.updateVisualization({
            landmarks: [],
            angle: 0,
            threshold: this.threshold,
            postureState: 'detecting',
            gracePeriod: null,
          })
        }
      }
    } catch (error) {
      console.error('Detection error:', error)
      this.updateStatus('detecting', 'Detection error', null)
    }
  }

  stopMonitoring() {
    this.isMonitoring = false
    this.toggleBtn.textContent = '▶'
    this.toggleBtn.classList.remove('playing')

    // Stop camera stream
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
      this.video.srcObject = null
    }

    // Dispose face detector
    if (this.faceDetector) {
      this.faceDetector.dispose()
      this.faceDetector = null
    }

    // Reset grace period
    if (window.GracePeriod) {
      window.GracePeriod.reset()
    }

    this.updateStatus('detecting', 'Monitoring stopped')
    console.log('Monitoring stopped')
  }

  // Camera Setup
  async setupCamera() {
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user',
      },
      audio: false,
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints)
      this.video.srcObject = this.stream

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play()
          resolve()
        }
      })

      return true
    } catch (error) {
      throw error
    }
  }

  handleCameraError(error) {
    console.error('Camera error:', error)

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      // Show error overlay without destroying DOM
      const errorOverlay = document.createElement('div')
      errorOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--color-background);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `
      errorOverlay.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: #f3f4f6;">
          <h2 style="margin: 0 0 1rem 0; color: #ef4444;">🔒 Camera Access Required</h2>
          <p style="margin: 0 0 1rem 0; line-height: 1.5;">
            Posturama needs camera access to monitor your posture.
          </p>
          <p style="margin: 0 0 1.5rem 0; color: #9ca3af; font-size: 0.9em;">
            Please close this window, grant camera permission when prompted, and try again.
          </p>
          <button onclick="window.close()"
            style="background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem;
                   border-radius: 8px; cursor: pointer; font-size: 1rem;">
            Close Window
          </button>
        </div>
      `
      document.body.appendChild(errorOverlay)
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      this.statusIcon.textContent = '📷'
      this.statusText.textContent = 'No camera found'
      this.widget.setAttribute('data-posture', 'detecting')
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      this.statusIcon.textContent = '⚠️'
      this.statusText.textContent = 'Camera is in use'
      this.widget.setAttribute('data-posture', 'detecting')
    } else {
      this.statusIcon.textContent = '❌'
      this.statusText.textContent = 'Camera error'
      this.widget.setAttribute('data-posture', 'detecting')
    }
  }

  // UI Updates
  updateStatus(state, message, angle = null) {
    this.postureState = state
    this.widget.setAttribute('data-posture', state)

    // Update icon based on state
    const icons = {
      good: '✅',
      bad: '⚠️',
      detecting: '⏳',
    }
    this.statusIcon.textContent = icons[state] || '❓'

    // Update text
    this.statusText.textContent = message

    // Update angle display
    if (angle !== null) {
      this.angleDisplay.textContent = `Angle: ${angle.toFixed(1)}°`
    } else {
      this.angleDisplay.innerHTML = '&nbsp;'
    }
  }

  openDebugView() {
    // Initialize debug view if needed
    if (!this.debugView && window.DebugView) {
      this.debugView = new window.DebugView()
    }

    if (this.debugView) {
      this.debugView.toggle()

      // Update button active state based on debug view state
      if (this.debugView.state === 'off') {
        this.debugBtn.classList.remove('active')
      } else {
        this.debugBtn.classList.add('active')
      }
    }
  }

  async triggerAlert(alertType) {
    console.log(`🔔 Alert: ${alertType} - Fix your posture!`)

    // Visual feedback - make widget pulse
    if (alertType === 'initial') {
      this.widget.style.animation = 'none'
      setTimeout(() => {
        this.widget.style.animation = 'pulse-warning 2s infinite'
      }, 10)
    }

    // Audio alert
    if (!this.isMuted && this.audioAlert && this.audioAlert.isReady) {
      await this.audioAlert.play(alertType)
    }
  }
}

// Initialize app when DOM and MediaPipe are ready
function initializeApp() {
  window.posturamaApp = new PosturamaApp()
  console.log('Posturama initialized')
}

// Wait for both DOM and MediaPipe to be ready
let domReady = false
let mediaPipeReady = false

document.addEventListener('DOMContentLoaded', () => {
  domReady = true
  if (mediaPipeReady) initializeApp()
})

window.addEventListener('mediapipe-ready', () => {
  mediaPipeReady = true
  if (domReady) initializeApp()
})

// Fallback if MediaPipe is already loaded
setTimeout(() => {
  if (window.mediaPipeReady && domReady && !window.posturamaApp) {
    initializeApp()
  }
}, 100)
