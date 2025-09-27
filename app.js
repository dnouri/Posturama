/**
 * Posturama - Main Application
 * Browser-based posture detection using MediaPipe Face Landmarks
 */

class PosturamaApp {
  constructor() {
    // DOM Elements
    this.widget = document.getElementById('posture-widget')
    this.dragHandle = document.querySelector('.drag-handle')
    this.video = document.getElementById('webcam')
    this.statusIcon = document.querySelector('.status-icon')
    this.statusText = document.querySelector('.status-text')
    this.angleDisplay = document.querySelector('.angle-display')
    this.thresholdSlider = document.querySelector('.threshold-slider')
    this.thresholdValue = document.querySelector('.threshold-value')
    this.toggleBtn = document.querySelector('.btn-toggle')
    this.muteBtn = document.querySelector('.btn-mute')
    this.debugBtn = document.querySelector('.btn-debug')
    this.minimizeBtn = document.querySelector('.btn-minimize')

    // State
    this.isMonitoring = false
    this.isMuted = false
    this.isMinimized = false
    this.threshold = window.POSTURE_CONFIG ? window.POSTURE_CONFIG.DEFAULT_THRESHOLD : 5
    this.currentAngle = 0
    this.postureState = 'detecting'

    // Drag state
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }

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
    this.setupDragAndDrop()
    this.setupControls()
    this.updateStatus('detecting', 'Click ▶ to start')

    // Initialize audio system
    if (window.AudioAlert) {
      this.audioAlert = new window.AudioAlert()
      await this.audioAlert.initialize()
      console.log('Audio system initialized:', this.audioAlert.isReady)
    }
  }

  // Drag and Drop Implementation
  setupDragAndDrop() {
    // Start dragging
    this.dragHandle.addEventListener('mousedown', (e) => {
      // Don't start drag if clicking minimize button
      if (e.target === this.minimizeBtn) return

      this.isDragging = true
      this.widget.classList.add('dragging')

      // Calculate offset from mouse to widget corner
      const rect = this.widget.getBoundingClientRect()
      this.dragOffset.x = e.clientX - rect.left
      this.dragOffset.y = e.clientY - rect.top

      // Prevent text selection while dragging
      e.preventDefault()
    })

    // Move widget
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return

      // Calculate new position
      let newX = e.clientX - this.dragOffset.x
      let newY = e.clientY - this.dragOffset.y

      // Keep widget within viewport
      const rect = this.widget.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height

      newX = Math.max(0, Math.min(newX, maxX))
      newY = Math.max(0, Math.min(newY, maxY))

      // Apply position
      this.widget.style.left = `${newX}px`
      this.widget.style.top = `${newY}px`
      this.widget.style.right = 'auto'
      this.widget.style.bottom = 'auto'
    })

    // Stop dragging
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false
        this.widget.classList.remove('dragging')
      }
    })

    // Handle window resize
    window.addEventListener('resize', () => {
      this.keepWidgetInViewport()
    })
  }

  keepWidgetInViewport() {
    const rect = this.widget.getBoundingClientRect()
    let adjusted = false

    // Check if widget is outside viewport
    if (rect.right > window.innerWidth) {
      this.widget.style.left = `${window.innerWidth - rect.width - 20}px`
      this.widget.style.right = 'auto'
      adjusted = true
    }

    if (rect.bottom > window.innerHeight) {
      this.widget.style.top = `${window.innerHeight - rect.height - 20}px`
      this.widget.style.bottom = 'auto'
      adjusted = true
    }

    if (rect.left < 0) {
      this.widget.style.left = '20px'
      this.widget.style.right = 'auto'
      adjusted = true
    }

    if (rect.top < 0) {
      this.widget.style.top = '20px'
      this.widget.style.bottom = 'auto'
      adjusted = true
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

    // Minimize toggle
    this.minimizeBtn.addEventListener('click', () => {
      this.toggleMinimize()
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

    let message = 'Camera error'
    let icon = '❌'

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      message = 'Camera permission denied'
      icon = '🔒'
      console.log('Please allow camera access in your browser settings')
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      message = 'No camera found'
      icon = '📷'
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      message = 'Camera is in use'
      icon = '⚠️'
    } else if (
      error.name === 'OverconstrainedError' ||
      error.name === 'ConstraintNotSatisfiedError'
    ) {
      message = 'Camera requirements not met'
      icon = '⚙️'
    }

    this.statusIcon.textContent = icon
    this.statusText.textContent = message
    this.widget.setAttribute('data-posture', 'detecting')
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
    }
  }

  toggleMinimize() {
    this.isMinimized = !this.isMinimized
    this.widget.classList.toggle('minimized', this.isMinimized)
    this.minimizeBtn.textContent = this.isMinimized ? '□' : '_'
  }

  openDebugView() {
    // Initialize debug view if needed
    if (!this.debugView && window.DebugView) {
      this.debugView = new window.DebugView()
    }

    if (this.debugView) {
      this.debugView.show()
      this.debugBtn.classList.add('active')

      // Update button state when debug view is closed
      const originalHide = this.debugView.hide.bind(this.debugView)
      this.debugView.hide = () => {
        originalHide()
        this.debugBtn.classList.remove('active')
      }
    } else {
      console.warn('Debug view not available')
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
