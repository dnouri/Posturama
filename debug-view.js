/**
 * Debug View Module
 * Provides visual debugging overlay for posture detection
 * Two states: off ↔ expanded
 */

class DebugView {
  constructor() {
    this.state = 'off' // off | expanded
    this.container = null
    this.canvas = null
    this.ctx = null
    this.frameTimes = []
    this.lastFrameTime = 0
    // Store original window dimensions for restoration
    this.originalOuterWidth = null
    this.originalOuterHeight = null
  }

  toggle() {
    if (this.state === 'off') {
      this.show()
    } else {
      this.hide()
    }
  }

  show() {
    this.state = 'expanded'
    this.cleanupExisting()

    // Store original dimensions before resizing
    this.originalOuterWidth = window.outerWidth
    this.originalOuterHeight = window.outerHeight

    // Calculate browser chrome to ensure proper content area
    const chromeHeight = window.outerHeight - window.innerHeight
    const chromeWidth = window.outerWidth - window.innerWidth
    // Resize to ensure 600px of content area for debug
    window.resizeTo(500 + chromeWidth, 600 + chromeHeight)
    this.createExpandedView()
  }

  hide() {
    this.state = 'off'
    this.cleanupExisting()

    // Restore original window dimensions
    if (this.originalOuterWidth !== null && this.originalOuterHeight !== null) {
      window.resizeTo(this.originalOuterWidth, this.originalOuterHeight)
    } else {
      // Fallback to default dimensions if original not captured
      // This should never happen, but log it if it does
      console.warn('Original dimensions not captured, using defaults')
      window.resizeTo(250, 400)
    }
  }

  cleanupExisting() {
    // Remove any existing debug container
    const existing = document.querySelector('.debug-overlay-expanded')
    if (existing) {
      existing.remove()
    }

    // Clear references
    this.container = null
    this.canvas = null
    this.ctx = null
  }

  createExpandedView() {
    this.container = document.createElement('div')
    this.container.className = 'debug-overlay-expanded'
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `

    // Video container
    const videoContainer = document.createElement('div')
    videoContainer.style.cssText = `
      position: relative;
      width: 480px;
      height: 360px;
      background: #000;
      border: 2px solid #00ff00;
      border-radius: 8px;
      overflow: hidden;
    `

    // Create video clone
    const video = document.getElementById('webcam')
    if (video && video.srcObject) {
      const videoClone = document.createElement('video')
      videoClone.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `
      videoClone.autoplay = true
      videoClone.playsInline = true
      videoClone.muted = true
      videoContainer.appendChild(videoClone)

      // Set srcObject after element is in DOM
      setTimeout(() => {
        if (video.srcObject && videoClone) {
          videoClone.srcObject = video.srcObject
          videoClone.play()
        }
      }, 0)
    }

    // Canvas for overlay
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'debug-canvas-expanded'
    this.canvas.width = 480
    this.canvas.height = 360
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `
    this.ctx = this.canvas.getContext('2d')
    videoContainer.appendChild(this.canvas)

    // Metrics panel
    const metricsPanel = document.createElement('div')
    metricsPanel.style.cssText = `
      margin-top: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 15px;
      font-family: 'SF Mono', 'Monaco', monospace;
      font-size: 14px;
      border: 1px solid #00ff00;
      border-radius: 4px;
      min-width: 300px;
    `
    metricsPanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">DEBUG METRICS</div>
      <div>FPS: <span class="debug-fps-value">0</span></div>
      <div>Angle: <span class="debug-angle-value">0</span>°</div>
      <div>Threshold: <span class="debug-threshold-value">5</span>°</div>
      <div>Posture: <span class="debug-posture-value">detecting</span></div>
      <div>Landmarks: <span class="debug-landmarks-value">0</span></div>
      <div>Grace: <span class="debug-grace-value">--</span></div>
    `

    // Close button
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕ Close Debug'
    closeBtn.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: #ff0000;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
      border-radius: 4px;
    `
    closeBtn.onclick = () => this.hide()

    this.container.appendChild(videoContainer)
    this.container.appendChild(metricsPanel)
    this.container.appendChild(closeBtn)

    document.body.appendChild(this.container)
  }

  updateVisualization(data) {
    if (this.state === 'off' || !this.container) return

    const { landmarks, angle, threshold, postureState, gracePeriod } = data

    // Update metrics
    this.updateMetrics({
      fps: this.calculateFPS(),
      angle,
      threshold,
      postureState,
      landmarkCount: landmarks ? landmarks.length : 0,
      gracePeriod,
    })

    // Draw visualization
    if (this.ctx && this.canvas) {
      this.drawVisualization(landmarks, angle, threshold)
    }
  }

  updateMetrics(data) {
    if (!this.container) return

    // Update all metrics
    const fpsEl = this.container.querySelector('.debug-fps-value')
    if (fpsEl) fpsEl.textContent = data.fps || 0

    const angleEl = this.container.querySelector('.debug-angle-value')
    if (angleEl) angleEl.textContent = data.angle ? data.angle.toFixed(1) : '0'

    const thresholdEl = this.container.querySelector('.debug-threshold-value')
    if (thresholdEl) thresholdEl.textContent = data.threshold || 5

    const postureEl = this.container.querySelector('.debug-posture-value')
    if (postureEl) postureEl.textContent = data.postureState || 'detecting'

    const landmarksEl = this.container.querySelector('.debug-landmarks-value')
    if (landmarksEl) landmarksEl.textContent = data.landmarkCount

    const graceEl = this.container.querySelector('.debug-grace-value')
    if (graceEl) {
      let graceText = ''
      if (data.gracePeriod) {
        graceText = data.gracePeriod.isInGracePeriod
          ? 'Active'
          : data.gracePeriod.shouldAlert
            ? 'Alert!'
            : 'Inactive'
      } else {
        graceText = '--'
      }
      graceEl.textContent = graceText
    }
  }

  drawVisualization(landmarks, angle, threshold) {
    if (!this.ctx || !this.canvas) return

    const width = this.canvas.width
    const height = this.canvas.height

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height)

    if (!landmarks || landmarks.length === 0) return

    const ctx = this.ctx

    // Draw all landmarks with reduced opacity
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * width
      const y = landmark.y * height

      // Highlight eye landmarks
      if (index === 33 || index === 263) {
        ctx.fillStyle = '#00ff00'
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()

        // Label eyes
        ctx.fillStyle = '#00ff00'
        ctx.font = '12px monospace'
        ctx.fillText(index === 33 ? 'L' : 'R', x - 10, y - 10)
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Draw eye connection line
    if (landmarks[33] && landmarks[263]) {
      const leftEye = {
        x: landmarks[33].x * width,
        y: landmarks[33].y * height,
      }
      const rightEye = {
        x: landmarks[263].x * width,
        y: landmarks[263].y * height,
      }

      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(leftEye.x, leftEye.y)
      ctx.lineTo(rightEye.x, rightEye.y)
      ctx.stroke()

      // Draw horizontal reference
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(0, leftEye.y)
      ctx.lineTo(width, leftEye.y)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw angle arc
      const centerX = (leftEye.x + rightEye.x) / 2
      const centerY = (leftEye.y + rightEye.y) / 2
      const radius = 50

      ctx.strokeStyle = Math.abs(angle) <= threshold ? '#00ff00' : '#ff0000'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, (angle * Math.PI) / 180)
      ctx.stroke()

      // Draw angle text
      ctx.fillStyle = ctx.strokeStyle
      ctx.font = 'bold 16px monospace'
      ctx.fillText(`${angle.toFixed(1)}°`, centerX - 20, centerY - radius - 10)
    }
  }

  calculateFPS() {
    const now = Date.now()
    this.frameTimes.push(now)

    // Keep only last 60 frames
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift()
    }

    if (this.frameTimes.length < 2) return 0

    const duration = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0]
    const frameCount = this.frameTimes.length - 1

    return Math.round((frameCount / duration) * 1000)
  }

  // Getter for compatibility
  get isVisible() {
    return this.state !== 'off'
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.DebugView = DebugView
}
// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugView
}
