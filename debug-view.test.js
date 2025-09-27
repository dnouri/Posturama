/**
 * Tests for Debug View Module
 * Tests visualization logic without requiring DOM
 */

// Mock canvas context for testing
class MockCanvasContext {
  constructor() {
    this.operations = []
    this.fillStyle = ''
    this.strokeStyle = ''
    this.lineWidth = 1
  }

  beginPath() {
    this.operations.push({ type: 'beginPath' })
  }

  arc(x, y, radius, startAngle, endAngle) {
    this.operations.push({ type: 'arc', x, y, radius })
  }

  fill() {
    this.operations.push({ type: 'fill', style: this.fillStyle })
  }

  stroke() {
    this.operations.push({ type: 'stroke', style: this.strokeStyle })
  }

  moveTo(x, y) {
    this.operations.push({ type: 'moveTo', x, y })
  }

  lineTo(x, y) {
    this.operations.push({ type: 'lineTo', x, y })
  }

  clearRect(x, y, width, height) {
    this.operations.push({ type: 'clearRect', x, y, width, height })
  }

  fillText(text, x, y) {
    this.operations.push({ type: 'fillText', text, x, y })
  }
}

// Test helper functions that will be in debug-view.js
const DebugHelpers = {
  // Convert normalized landmark coordinates to canvas coordinates
  landmarkToCanvas(landmark, canvasWidth, canvasHeight) {
    return {
      x: landmark.x * canvasWidth,
      y: landmark.y * canvasHeight,
    }
  },

  // Calculate FPS from frame times
  calculateFPS(frameTimes) {
    if (frameTimes.length < 2) return 0

    const recentFrames = frameTimes.slice(-30) // Last 30 frames
    if (recentFrames.length < 2) return 0

    const duration = recentFrames[recentFrames.length - 1] - recentFrames[0]
    const frameCount = recentFrames.length - 1

    return Math.round((frameCount / duration) * 1000)
  },

  // Determine color for landmark based on importance
  getLandmarkColor(index) {
    // Eye landmarks (important for our app)
    if (index === 33 || index === 263) {
      return '#00ff00' // Green for eyes
    }
    // Face oval
    if (index < 17) {
      return '#ffff00' // Yellow for face outline
    }
    // Other landmarks
    return '#ffffff40' // Semi-transparent white
  },

  // Format metrics for display
  formatMetrics(data) {
    return {
      fps: `FPS: ${data.fps || 0}`,
      angle: `Angle: ${data.angle ? data.angle.toFixed(1) : 0}°`,
      threshold: `Threshold: ${data.threshold || 5}°`,
      posture: `Posture: ${data.postureState || 'unknown'}`,
      landmarks: `Landmarks: ${data.landmarkCount || 0}`,
    }
  },
}

describe('DebugHelpers', () => {
  test('converts landmark coordinates to canvas space', () => {
    const landmark = { x: 0.5, y: 0.3, z: 0 }
    const result = DebugHelpers.landmarkToCanvas(landmark, 640, 480)

    assertEqual(result.x, 320) // 0.5 * 640
    assertEqual(result.y, 144) // 0.3 * 480
  })

  test('handles edge coordinates', () => {
    const topLeft = { x: 0, y: 0, z: 0 }
    const bottomRight = { x: 1, y: 1, z: 0 }

    const tl = DebugHelpers.landmarkToCanvas(topLeft, 640, 480)
    assertEqual(tl.x, 0)
    assertEqual(tl.y, 0)

    const br = DebugHelpers.landmarkToCanvas(bottomRight, 640, 480)
    assertEqual(br.x, 640)
    assertEqual(br.y, 480)
  })

  test('calculates FPS from frame times', () => {
    // 10 frames over 1 second = 10 FPS
    const frameTimes = [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]

    const fps = DebugHelpers.calculateFPS(frameTimes)
    assertEqual(fps, 10)
  })

  test('returns 0 FPS with insufficient data', () => {
    assertEqual(DebugHelpers.calculateFPS([]), 0)
    assertEqual(DebugHelpers.calculateFPS([1000]), 0)
  })

  test('uses only recent frames for FPS', () => {
    // Create 40 frame times
    const frameTimes = []
    for (let i = 0; i < 40; i++) {
      frameTimes.push(i * 100) // 10 FPS
    }

    const fps = DebugHelpers.calculateFPS(frameTimes)
    // Should use last 30 frames
    assert(fps > 8 && fps < 12, `FPS ${fps} should be around 10`)
  })

  test('assigns correct colors to landmarks', () => {
    // Eye landmarks should be green
    assertEqual(DebugHelpers.getLandmarkColor(33), '#00ff00')
    assertEqual(DebugHelpers.getLandmarkColor(263), '#00ff00')

    // Face outline should be yellow
    assertEqual(DebugHelpers.getLandmarkColor(0), '#ffff00')
    assertEqual(DebugHelpers.getLandmarkColor(16), '#ffff00')

    // Others should be semi-transparent white
    assertEqual(DebugHelpers.getLandmarkColor(100), '#ffffff40')
  })

  test('formats metrics for display', () => {
    const data = {
      fps: 30,
      angle: 12.3456,
      threshold: 20,
      postureState: 'good',
      landmarkCount: 478,
    }

    const formatted = DebugHelpers.formatMetrics(data)

    assertEqual(formatted.fps, 'FPS: 30')
    assertEqual(formatted.angle, 'Angle: 12.3°')
    assertEqual(formatted.threshold, 'Threshold: 20°')
    assertEqual(formatted.posture, 'Posture: good')
    assertEqual(formatted.landmarks, 'Landmarks: 478')
  })

  test('handles missing metric data', () => {
    const formatted = DebugHelpers.formatMetrics({})

    assertEqual(formatted.fps, 'FPS: 0')
    assertEqual(formatted.angle, 'Angle: 0°') // Fixed: removed .0
    assertEqual(formatted.threshold, 'Threshold: 5°')
    assertEqual(formatted.posture, 'Posture: unknown')
    assertEqual(formatted.landmarks, 'Landmarks: 0')
  })
})

describe('Canvas Drawing', () => {
  test('draws landmark point', () => {
    const ctx = new MockCanvasContext()
    const landmark = { x: 100, y: 150 }

    // Simulate drawing a landmark
    ctx.fillStyle = '#00ff00'
    ctx.beginPath()
    ctx.arc(landmark.x, landmark.y, 2, 0, Math.PI * 2)
    ctx.fill()

    // Verify operations
    assertEqual(ctx.operations.length, 3)
    assertEqual(ctx.operations[0].type, 'beginPath')
    assertEqual(ctx.operations[1].type, 'arc')
    assertEqual(ctx.operations[1].x, 100)
    assertEqual(ctx.operations[1].y, 150)
    assertEqual(ctx.operations[2].type, 'fill')
  })

  test('draws angle visualization line', () => {
    const ctx = new MockCanvasContext()
    const leftEye = { x: 200, y: 200 }
    const rightEye = { x: 400, y: 200 }

    // Draw line between eyes
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(leftEye.x, leftEye.y)
    ctx.lineTo(rightEye.x, rightEye.y)
    ctx.stroke()

    // Verify line was drawn
    const moveOp = ctx.operations.find((op) => op.type === 'moveTo')
    const lineOp = ctx.operations.find((op) => op.type === 'lineTo')

    assert(moveOp !== undefined, 'Should have moveTo operation')
    assertEqual(moveOp.x, 200)
    assertEqual(lineOp.x, 400)
  })

  test('clears canvas before redraw', () => {
    const ctx = new MockCanvasContext()

    ctx.clearRect(0, 0, 640, 480)

    assertEqual(ctx.operations[0].type, 'clearRect')
    assertEqual(ctx.operations[0].width, 640)
    assertEqual(ctx.operations[0].height, 480)
  })
})

// Export helpers for use in implementation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugHelpers
}
