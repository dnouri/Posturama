/**
 * Debug View Module
 * Provides visual debugging overlay for posture detection
 */

class DebugView {
  constructor() {
    this.isVisible = false
    this.overlay = null
    this.canvas = null
    this.ctx = null
    this.metricsPanel = null
    this.frameTimes = []
    this.lastFrameTime = 0
    this.isInitialized = false

    // Store references for cleanup
    this.animationId = null
    this.updateCallback = null
  }

  initialize() {
    if (this.isInitialized) return

    this.createOverlay()
    this.createCanvas()
    this.createMetricsPanel()
    this.setupEventListeners()

    this.isInitialized = true
  }

  createOverlay() {
    this.overlay = document.createElement('div')
    this.overlay.className = 'debug-overlay'
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `
    document.body.appendChild(this.overlay)
  }

  createCanvas() {
    // Container for video and canvas
    const container = document.createElement('div')
    container.style.cssText = `
      position: relative;
      width: 640px;
      height: 480px;
      background: #000;
      border: 2px solid #00ff00;
      border-radius: 8px;
      overflow: hidden;
    `

    // Create canvas for overlay
    this.canvas = document.createElement('canvas')
    this.canvas.width = 640
    this.canvas.height = 480
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `

    this.ctx = this.canvas.getContext('2d')
    container.appendChild(this.canvas)

    // Add video element (will be positioned behind canvas)
    const video = document.getElementById('webcam')
    if (video) {
      const videoClone = video.cloneNode()
      videoClone.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      `
      videoClone.id = 'debug-video'
      container.insertBefore(videoClone, this.canvas)
      videoClone.srcObject = video.srcObject
    }

    this.overlay.appendChild(container)
  }

  createMetricsPanel() {
    this.metricsPanel = document.createElement('div')
    this.metricsPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 15px;
      font-family: 'SF Mono', 'Monaco', monospace;
      font-size: 14px;
      border: 1px solid #00ff00;
      border-radius: 4px;
      min-width: 200px;
    `

    this.metricsPanel.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px;">DEBUG METRICS</div>
      <div id="debug-fps">FPS: --</div>
      <div id="debug-angle">Angle: --°</div>
      <div id="debug-threshold">Threshold: --°</div>
      <div id="debug-posture">Posture: --</div>
      <div id="debug-landmarks">Landmarks: --</div>
      <div id="debug-grace">Grace: --</div>
    `

    this.overlay.appendChild(this.metricsPanel)
  }

  setupEventListeners() {
    // Close on ESC or click
    const closeHandler = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return
      if (e.type === 'click' && e.target !== this.overlay) return
      this.hide()
    }

    this.overlay.addEventListener('click', closeHandler)
    document.addEventListener('keydown', closeHandler)

    // Add close button
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
    this.overlay.appendChild(closeBtn)
  }

  show() {
    if (!this.isInitialized) {
      this.initialize()
    }

    this.overlay.style.display = 'flex'
    this.isVisible = true

    // Start render loop
    this.startRenderLoop()
  }

  hide() {
    if (this.overlay) {
      this.overlay.style.display = 'none'
    }
    this.isVisible = false

    // Stop render loop
    this.stopRenderLoop()
  }

  startRenderLoop() {
    const render = (timestamp) => {
      if (!this.isVisible) return

      // Track frame times for FPS
      if (this.lastFrameTime > 0) {
        this.frameTimes.push(timestamp)
        // Keep only last 60 frame times
        if (this.frameTimes.length > 60) {
          this.frameTimes.shift()
        }
      }
      this.lastFrameTime = timestamp

      // Request next frame
      this.animationId = requestAnimationFrame(render)
    }

    this.animationId = requestAnimationFrame(render)
  }

  stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  updateVisualization(data) {
    if (!this.isVisible || !this.ctx) return

    const { landmarks, angle, threshold, postureState, gracePeriod } = data

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw landmarks
    if (landmarks && landmarks.length > 0) {
      this.drawLandmarks(landmarks)
      this.drawAngleVisualization(landmarks, angle)
      this.drawThresholdZone(angle, threshold)
    }

    // Update metrics
    this.updateMetrics({
      fps: this.calculateFPS(),
      angle,
      threshold,
      postureState,
      landmarkCount: landmarks ? landmarks.length : 0,
      gracePeriod,
    })
  }

  drawLandmarks(landmarks) {
    const ctx = this.ctx

    landmarks.forEach((landmark, index) => {
      const point = this.landmarkToCanvas(landmark)
      const color = this.getLandmarkColor(index)
      const size = index === 33 || index === 263 ? 4 : 2 // Bigger dots for eyes

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw connections (simplified face mesh)
    this.drawConnections(landmarks)
  }

  drawConnections(landmarks) {
    const ctx = this.ctx
    ctx.strokeStyle = '#ffffff30'
    ctx.lineWidth = 1

    // Draw line between eyes (our main measurement)
    if (landmarks[33] && landmarks[263]) {
      const leftEye = this.landmarkToCanvas(landmarks[33])
      const rightEye = this.landmarkToCanvas(landmarks[263])

      ctx.strokeStyle = '#00ff00'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(leftEye.x, leftEye.y)
      ctx.lineTo(rightEye.x, rightEye.y)
      ctx.stroke()

      // Add labels
      ctx.fillStyle = '#00ff00'
      ctx.font = '12px monospace'
      ctx.fillText('L', leftEye.x - 15, leftEye.y - 5)
      ctx.fillText('R', rightEye.x + 5, rightEye.y - 5)
    }
  }

  drawAngleVisualization(landmarks, angle) {
    if (!landmarks[33] || !landmarks[263]) return

    const ctx = this.ctx
    const leftEye = this.landmarkToCanvas(landmarks[33])
    const rightEye = this.landmarkToCanvas(landmarks[263])

    // Draw horizontal reference line
    ctx.strokeStyle = '#ffff0050'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(0, leftEye.y)
    ctx.lineTo(this.canvas.width, leftEye.y)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw angle arc
    const centerX = (leftEye.x + rightEye.x) / 2
    const centerY = (leftEye.y + rightEye.y) / 2
    const radius = 50

    ctx.strokeStyle = angle > 15 || angle < -15 ? '#ff0000' : '#00ff00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, (angle * Math.PI) / 180)
    ctx.stroke()

    // Draw angle text
    ctx.fillStyle = ctx.strokeStyle
    ctx.font = 'bold 16px monospace'
    ctx.fillText(`${angle.toFixed(1)}°`, centerX - 20, centerY - radius - 10)
  }

  drawThresholdZone(angle, threshold) {
    const ctx = this.ctx
    const centerX = this.canvas.width / 2
    const bottomY = this.canvas.height - 50

    // Draw threshold indicator bar
    const barWidth = 200
    const barHeight = 20
    const barX = centerX - barWidth / 2

    // Background
    ctx.fillStyle = '#ffffff20'
    ctx.fillRect(barX, bottomY, barWidth, barHeight)

    // Threshold zones
    const thresholdWidth = (threshold / 30) * barWidth
    ctx.fillStyle = '#00ff0050'
    ctx.fillRect(centerX - thresholdWidth / 2, bottomY, thresholdWidth, barHeight)

    // Current angle position
    const anglePos = (angle / 30) * (barWidth / 2)
    ctx.fillStyle = Math.abs(angle) <= threshold ? '#00ff00' : '#ff0000'
    ctx.fillRect(centerX + anglePos - 2, bottomY - 5, 4, barHeight + 10)

    // Labels
    ctx.fillStyle = '#ffffff'
    ctx.font = '10px monospace'
    ctx.fillText('-30°', barX - 25, bottomY + 15)
    ctx.fillText('0°', centerX - 5, bottomY + 35)
    ctx.fillText('+30°', barX + barWidth + 5, bottomY + 15)
  }

  landmarkToCanvas(landmark) {
    return {
      x: landmark.x * this.canvas.width,
      y: landmark.y * this.canvas.height,
    }
  }

  getLandmarkColor(index) {
    // Eye landmarks (important for our app)
    if (index === 33 || index === 263) {
      return '#00ff00'
    }
    // Face oval
    if (index < 17) {
      return '#ffff00'
    }
    // Other landmarks
    return '#ffffff40'
  }

  calculateFPS() {
    if (this.frameTimes.length < 2) return 0

    const recentFrames = this.frameTimes.slice(-30)
    if (recentFrames.length < 2) return 0

    const duration = recentFrames[recentFrames.length - 1] - recentFrames[0]
    const frameCount = recentFrames.length - 1

    return Math.round((frameCount / duration) * 1000)
  }

  updateMetrics(data) {
    if (!this.metricsPanel) return

    document.getElementById('debug-fps').textContent = `FPS: ${data.fps || 0}`
    document.getElementById('debug-angle').textContent =
      `Angle: ${data.angle ? data.angle.toFixed(1) : '--'}°`
    document.getElementById('debug-threshold').textContent = `Threshold: ${data.threshold || 5}°`
    document.getElementById('debug-posture').textContent =
      `Posture: ${data.postureState || 'unknown'}`
    document.getElementById('debug-landmarks').textContent = `Landmarks: ${data.landmarkCount}`

    // Grace period status
    let graceText = 'Grace: '
    if (data.gracePeriod) {
      if (data.gracePeriod.isInGracePeriod) {
        graceText += 'Active'
      } else if (data.gracePeriod.shouldAlert) {
        graceText += 'Alert!'
      } else {
        graceText += 'Inactive'
      }
    } else {
      graceText += '--'
    }
    document.getElementById('debug-grace').textContent = graceText
  }

  dispose() {
    this.stopRenderLoop()

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay)
    }

    this.overlay = null
    this.canvas = null
    this.ctx = null
    this.metricsPanel = null
    this.isInitialized = false
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
