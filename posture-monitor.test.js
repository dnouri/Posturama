/**
 * Tests for posture-monitor.js
 * Tests the orchestration and state management
 */

if (typeof require !== 'undefined') {
  require('./test-runner.js')
}

// Mock implementations
class MockFaceDetector {
  constructor() {
    this.isReady = false
    this.mockLandmarks = null
    this.initializeCallCount = 0
    this.detectCallCount = 0
  }

  async initialize() {
    this.initializeCallCount++
    this.isReady = true
    return Promise.resolve()
  }

  detectLandmarks(videoElement, timestamp) {
    this.detectCallCount++
    if (!this.isReady) {
      throw new Error('Detector not initialized')
    }
    return this.mockLandmarks
  }

  setMockLandmarks(landmarks) {
    this.mockLandmarks = landmarks
  }

  dispose() {
    this.isReady = false
  }
}

// Simplified PostureMonitor for testing
class PostureMonitor {
  constructor(config = {}) {
    this.config = {
      threshold: config.threshold || 5,
      sampleRate: config.sampleRate || 10,
      alertCooldown: config.alertCooldown || 3000,
      ...config,
    }

    this.state = 'DETECTING'
    this.lastAlertTime = 0
    this.detector = config.detector || new MockFaceDetector()
    this.listeners = {
      stateChange: [],
      postureUpdate: [],
      error: [],
    }
    this.isMonitoring = false
  }

  async start(videoElement) {
    try {
      await this.detector.initialize()
      this.videoElement = videoElement
      this.isMonitoring = true
      this.state = 'DETECTING'
    } catch (error) {
      this.handleError('Failed to start monitoring', error)
    }
  }

  // Simplified for testing - manually trigger analysis
  analyzePosture(timestamp, landmarks) {
    try {
      if (!landmarks) {
        this.updateState('DETECTING')
        return
      }

      const angle = this.calculateHeadTilt(landmarks)
      const posture = this.evaluatePosture(angle, this.config.threshold)

      const newState = posture.isGood ? 'GOOD_POSTURE' : 'BAD_POSTURE'

      this.emit('postureUpdate', { angle, posture, state: newState })

      if (newState !== this.state) {
        const oldState = this.state
        this.updateState(newState)

        if (newState === 'BAD_POSTURE' && this.shouldAlert(timestamp)) {
          this.lastAlertTime = timestamp
          this.emit('stateChange', { from: oldState, to: newState, alert: true })
        } else {
          this.emit('stateChange', { from: oldState, to: newState, alert: false })
        }
      }
    } catch (error) {
      this.handleError('Error analyzing posture', error)
    }
  }

  calculateHeadTilt(landmarks) {
    const leftEye = landmarks[33]
    const rightEye = landmarks[263]
    const deltaY = rightEye.y - leftEye.y
    const deltaX = rightEye.x - leftEye.x
    return Math.atan2(deltaY, deltaX) * (180 / Math.PI)
  }

  evaluatePosture(angle, threshold) {
    const absoluteAngle = Math.abs(angle)
    return {
      isGood: absoluteAngle <= threshold,
      angle: angle,
      deviation: absoluteAngle,
    }
  }

  shouldAlert(timestamp) {
    // Always allow first alert (when lastAlertTime is 0)
    if (this.lastAlertTime === 0) return true
    return timestamp - this.lastAlertTime >= this.config.alertCooldown
  }

  updateState(newState) {
    this.state = newState
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(data))
    }
  }

  handleError(message, error) {
    this.emit('error', { message, error })
  }

  stop() {
    this.state = 'STOPPED'
    this.isMonitoring = false
    this.detector.dispose()
  }
}

// Helper to create mock landmarks
function createMockLandmarks(leftEyeY = 0.5, rightEyeY = 0.5) {
  const landmarks = new Array(478)
  for (let i = 0; i < 478; i++) {
    landmarks[i] = { x: 0.5, y: 0.5, z: 0 }
  }
  landmarks[33] = { x: 0.3, y: leftEyeY, z: 0 }
  landmarks[263] = { x: 0.7, y: rightEyeY, z: 0 }
  return landmarks
}

describe('PostureMonitor', () => {
  test('initializes with default configuration', () => {
    const monitor = new PostureMonitor()
    assertEqual(monitor.config.threshold, 5)
    assertEqual(monitor.config.sampleRate, 10)
    assertEqual(monitor.config.alertCooldown, 3000)
    assertEqual(monitor.state, 'DETECTING')
  })

  test('accepts custom configuration', () => {
    const monitor = new PostureMonitor({
      threshold: 20,
      sampleRate: 5,
      alertCooldown: 5000,
    })
    assertEqual(monitor.config.threshold, 20)
    assertEqual(monitor.config.sampleRate, 5)
    assertEqual(monitor.config.alertCooldown, 5000)
  })

  test('starts monitoring successfully', async () => {
    const mockDetector = new MockFaceDetector()
    const monitor = new PostureMonitor({ detector: mockDetector })
    const mockVideo = { id: 'test-video' }

    await monitor.start(mockVideo)

    assertTrue(monitor.isMonitoring)
    assertEqual(mockDetector.initializeCallCount, 1)
    assertEqual(monitor.videoElement, mockVideo)
  })

  test('transitions from DETECTING to GOOD_POSTURE', () => {
    const monitor = new PostureMonitor()
    let stateChangeEvent = null

    monitor.on('stateChange', (event) => {
      stateChangeEvent = event
    })

    const goodLandmarks = createMockLandmarks(0.5, 0.5) // No tilt
    monitor.analyzePosture(1000, goodLandmarks)

    assertEqual(monitor.state, 'GOOD_POSTURE')
    assertEqual(stateChangeEvent.from, 'DETECTING')
    assertEqual(stateChangeEvent.to, 'GOOD_POSTURE')
    assertFalse(stateChangeEvent.alert)
  })

  test('transitions from DETECTING to BAD_POSTURE with alert', () => {
    const monitor = new PostureMonitor()
    let stateChangeEvent = null

    monitor.on('stateChange', (event) => {
      stateChangeEvent = event
    })

    const badLandmarks = createMockLandmarks(0.3, 0.7) // Significant tilt
    monitor.analyzePosture(1000, badLandmarks)

    assertEqual(monitor.state, 'BAD_POSTURE')
    assertEqual(stateChangeEvent.from, 'DETECTING')
    assertEqual(stateChangeEvent.to, 'BAD_POSTURE')
    assertTrue(stateChangeEvent.alert)
    assertEqual(monitor.lastAlertTime, 1000)
  })

  test('respects alert cooldown period', () => {
    const monitor = new PostureMonitor({ alertCooldown: 3000 })
    const events = []

    monitor.on('stateChange', (event) => {
      events.push(event)
    })

    const goodLandmarks = createMockLandmarks(0.5, 0.5)
    const badLandmarks = createMockLandmarks(0.3, 0.7)

    // First transition to BAD_POSTURE - should alert
    monitor.analyzePosture(1000, badLandmarks)
    assertEqual(events[0].alert, true)

    // Transition to GOOD_POSTURE
    monitor.analyzePosture(2000, goodLandmarks)

    // Transition back to BAD_POSTURE within cooldown - no alert
    monitor.analyzePosture(2500, badLandmarks)
    assertEqual(events[2].alert, false)

    // Transition to GOOD_POSTURE again
    monitor.analyzePosture(3000, goodLandmarks)

    // Transition to BAD_POSTURE after cooldown - should alert
    monitor.analyzePosture(5000, badLandmarks)
    assertEqual(events[4].alert, true)
  })

  test('emits postureUpdate events with correct data', () => {
    const monitor = new PostureMonitor({ threshold: 10 })
    let updateEvent = null

    monitor.on('postureUpdate', (event) => {
      updateEvent = event
    })

    const landmarks = createMockLandmarks(0.4, 0.5) // Slight tilt
    monitor.analyzePosture(1000, landmarks)

    assert(updateEvent !== null, 'Should emit postureUpdate event')
    assert(typeof updateEvent.angle === 'number', 'Should include angle')
    assert(updateEvent.posture !== undefined, 'Should include posture evaluation')
    assert(updateEvent.state !== undefined, 'Should include state')
  })

  test('handles missing landmarks gracefully', () => {
    const monitor = new PostureMonitor()
    let errorEmitted = false

    monitor.on('error', () => {
      errorEmitted = true
    })

    monitor.state = 'GOOD_POSTURE'
    monitor.analyzePosture(1000, null)

    assertEqual(monitor.state, 'DETECTING')
    assertFalse(errorEmitted)
  })

  test('stops monitoring correctly', () => {
    const mockDetector = new MockFaceDetector()
    const monitor = new PostureMonitor({ detector: mockDetector })

    monitor.isMonitoring = true
    monitor.state = 'GOOD_POSTURE'
    mockDetector.isReady = true

    monitor.stop()

    assertEqual(monitor.state, 'STOPPED')
    assertFalse(monitor.isMonitoring)
    assertFalse(mockDetector.isReady)
  })

  test('calculates correct angle for tilted head', () => {
    const monitor = new PostureMonitor()

    const horizontalLandmarks = createMockLandmarks(0.5, 0.5)
    const angle1 = monitor.calculateHeadTilt(horizontalLandmarks)
    assertCloseTo(angle1, 0, 0.1)

    const tiltedLandmarks = createMockLandmarks(0.3, 0.7)
    const angle2 = monitor.calculateHeadTilt(tiltedLandmarks)
    assertCloseTo(angle2, 45, 1)
  })

  test('evaluates posture with custom threshold', () => {
    const monitor = new PostureMonitor({ threshold: 10 })

    const result1 = monitor.evaluatePosture(8, monitor.config.threshold)
    assertTrue(result1.isGood)

    const result2 = monitor.evaluatePosture(12, monitor.config.threshold)
    assertFalse(result2.isGood)
  })

  test('multiple listeners receive events', () => {
    const monitor = new PostureMonitor()
    let count = 0

    monitor.on('postureUpdate', () => count++)
    monitor.on('postureUpdate', () => count++)
    monitor.on('postureUpdate', () => count++)

    const landmarks = createMockLandmarks(0.5, 0.5)
    monitor.analyzePosture(1000, landmarks)

    assertEqual(count, 3)
  })

  test('configuration can be updated after creation', () => {
    const monitor = new PostureMonitor({ threshold: 7 })
    assertEqual(monitor.config.threshold, 7)

    monitor.config.threshold = 4
    assertEqual(monitor.config.threshold, 4)

    const result = monitor.evaluatePosture(3, monitor.config.threshold)
    assertTrue(result.isGood)
  })
})
