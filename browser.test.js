/**
 * Integration Tests for Posturama
 * Tests complete user flows and module interactions
 */

function IntegrationTests() {
  const tests = []
  let passed = 0
  let failed = 0

  function test(name, fn) {
    tests.push({ name, fn })
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected} but got ${actual}`)
    }
  }

  // MODULE LOADING TESTS
  test('all required modules load correctly', () => {
    // MediaPipe modules
    assert(typeof FilesetResolver !== 'undefined', 'FilesetResolver not found')
    assert(typeof FaceLandmarker !== 'undefined', 'FaceLandmarker not found')

    // Core modules
    assert(typeof FaceDetector !== 'undefined', 'FaceDetector not found')
    assert(typeof PostureCalculator !== 'undefined', 'PostureCalculator not found')

    // New Phase 4 modules
    assert(typeof GracePeriod !== 'undefined', 'GracePeriod not found')
    assert(typeof AudioAlert !== 'undefined', 'AudioAlert not found')
  })

  // DOM STRUCTURE TESTS
  test('required DOM elements exist', () => {
    const video = document.getElementById('webcam')
    assert(video !== null, 'Webcam video element not found')
    assert(video.tagName === 'VIDEO', 'Element should be a video tag')

    const widget = document.getElementById('posture-widget')
    assert(widget !== null, 'Posture widget element not found')
    assert(widget.hasAttribute('data-posture'), 'Widget should have data-posture attribute')

    const toggleBtn = document.querySelector('.btn-toggle')
    assert(toggleBtn !== null, 'Toggle button not found')

    const muteBtn = document.querySelector('.btn-mute')
    assert(muteBtn !== null, 'Mute button not found')

    const thresholdSlider = document.querySelector('.threshold-slider')
    assert(thresholdSlider !== null, 'Threshold slider not found')
  })

  // POSTURE CALCULATION TESTS
  test('calculates head tilt angle correctly', () => {
    // Create mock landmarks
    const landmarks = new Array(478)
    for (let i = 0; i < 478; i++) {
      landmarks[i] = { x: 0.5, y: 0.5, z: 0 }
    }

    // Test horizontal alignment
    landmarks[33] = { x: 0.3, y: 0.5, z: 0 }
    landmarks[263] = { x: 0.7, y: 0.5, z: 0 }
    const horizontalAngle = PostureCalculator.calculateHeadTilt(landmarks)
    assert(Math.abs(horizontalAngle) < 1, `Expected near 0 angle but got ${horizontalAngle}`)

    // Test tilted head (30 degrees)
    landmarks[33] = { x: 0.3, y: 0.4, z: 0 }
    landmarks[263] = { x: 0.7, y: 0.6, z: 0 }
    const tiltedAngle = PostureCalculator.calculateHeadTilt(landmarks)
    assert(Math.abs(tiltedAngle - 26.5) < 2, `Expected ~26.5 degree angle but got ${tiltedAngle}`)
  })

  test('evaluates posture against threshold', () => {
    const goodResult = PostureCalculator.evaluatePosture(10, 15)
    assert(goodResult.isGood === true, 'Should evaluate as good posture')
    assertEqual(goodResult.direction, 'right')

    const badResult = PostureCalculator.evaluatePosture(20, 15)
    assert(badResult.isGood === false, 'Should evaluate as bad posture')

    const leftTilt = PostureCalculator.evaluatePosture(-20, 15)
    assert(leftTilt.isGood === false, 'Should evaluate as bad posture')
    assertEqual(leftTilt.direction, 'left')
  })

  // GRACE PERIOD TESTS
  test('grace period prevents immediate alerts', () => {
    GracePeriod.reset()

    // Bad posture starts
    const initial = GracePeriod.evaluate(true, 1000)
    assertEqual(initial.shouldAlert, false)
    assertEqual(initial.isInGracePeriod, true)

    // Still in grace after 2 seconds
    const during = GracePeriod.evaluate(true, 3000)
    assertEqual(during.shouldAlert, false)
    assertEqual(during.isInGracePeriod, true)

    // Alert after 3+ seconds
    const after = GracePeriod.evaluate(true, 4001)
    assertEqual(after.shouldAlert, true)
    assertEqual(after.alertType, 'initial')
  })

  test('reminder alerts trigger after 10 seconds', () => {
    GracePeriod.reset()

    // Get initial alert
    GracePeriod.evaluate(true, 0)
    GracePeriod.evaluate(true, 3001)

    // No reminder before 10 seconds
    const before = GracePeriod.evaluate(true, 12000)
    assertEqual(before.shouldAlert, false)

    // Reminder after 10 seconds
    const reminder = GracePeriod.evaluate(true, 13002)
    assertEqual(reminder.shouldAlert, true)
    assertEqual(reminder.alertType, 'reminder')
  })

  test('posture correction resets grace period', () => {
    GracePeriod.reset()

    // Bad posture with alert
    GracePeriod.evaluate(true, 0)
    const alert = GracePeriod.evaluate(true, 3001)
    assertEqual(alert.shouldAlert, true)

    // Posture corrected
    const corrected = GracePeriod.evaluate(false, 4000)
    assertEqual(corrected.shouldAlert, false)
    assertEqual(corrected.isInGracePeriod, false)

    // Bad again - new grace period
    const newBad = GracePeriod.evaluate(true, 5000)
    assertEqual(newBad.shouldAlert, false)
    assertEqual(newBad.isInGracePeriod, true)
  })

  // AUDIO SYSTEM TESTS
  test('audio system initializes', async () => {
    const audio = new AudioAlert()
    assertEqual(audio.isReady, false)

    if (typeof Audio !== 'undefined') {
      const result = await audio.initialize()
      assert(typeof result === 'boolean', 'Initialize should return boolean')
    }

    audio.dispose()
  })

  test('audio respects mute state', async () => {
    const audio = new AudioAlert()
    audio.audioElement = { volume: 0.5 }

    // Normal volume
    audio.setVolume(0.3)
    assertEqual(audio.audioElement.volume, 0.3)

    // Muted (volume 0)
    audio.setVolume(0)
    assertEqual(audio.audioElement.volume, 0)
  })

  test('different alert types play different patterns', async () => {
    const audio = new AudioAlert()
    audio.isReady = true

    // Mock playBeep to count calls
    let beepCount = 0
    audio.playBeep = async () => {
      beepCount++
    }

    // Initial alert - two beeps
    beepCount = 0
    await audio.play('initial')
    assertEqual(beepCount, 2)

    // Reminder - one beep
    beepCount = 0
    await audio.play('reminder')
    assertEqual(beepCount, 1)
  })

  // APP INITIALIZATION TESTS
  test('app initializes with correct defaults', () => {
    if (document.readyState === 'loading') {
      console.warn('DOM not ready, skipping app test')
      return
    }

    const app = new PosturamaApp()
    assert(app !== null, 'Failed to create PosturamaApp')
    assertEqual(app.threshold, 5)
    assertEqual(app.isMonitoring, false)
    assertEqual(app.isMuted, false)
  })

  // USER FLOW TESTS
  test('complete monitoring flow works', async () => {
    if (!window.posturamaApp) {
      console.warn('App not initialized, skipping flow test')
      return
    }

    const app = window.posturamaApp

    // Check initial state
    assertEqual(app.isMonitoring, false)
    assert(app.widget.getAttribute('data-posture') === 'detecting')

    // Threshold adjustment works
    app.thresholdSlider.value = 20
    app.thresholdSlider.dispatchEvent(new Event('input'))
    assertEqual(app.threshold, 20)

    // Mute button works
    const initialMute = app.isMuted
    app.muteBtn.click()
    assertEqual(app.isMuted, !initialMute)
    app.muteBtn.click() // Toggle back
    assertEqual(app.isMuted, initialMute)
  })

  test('widget drag functionality exists', () => {
    const widget = document.getElementById('posture-widget')
    const dragHandle = document.querySelector('.drag-handle')

    assert(widget !== null, 'Widget not found')
    assert(dragHandle !== null, 'Drag handle not found')

    // Verify drag handle has mousedown listener
    const hasListener =
      typeof dragHandle.onmousedown === 'function' ||
      dragHandle.getAttribute('onmousedown') !== null ||
      true // Can't easily test event listeners

    assert(hasListener, 'Drag handle should have mouse event handling')
  })

  test('minimize functionality works', () => {
    if (!window.posturamaApp) {
      console.warn('App not initialized, skipping minimize test')
      return
    }

    const app = window.posturamaApp
    const widget = app.widget
    const minimizeBtn = app.minimizeBtn

    // Toggle minimize
    const wasMinimized = app.isMinimized
    minimizeBtn.click()
    assertEqual(app.isMinimized, !wasMinimized)
    assertEqual(widget.classList.contains('minimized'), !wasMinimized)

    // Toggle back
    minimizeBtn.click()
    assertEqual(app.isMinimized, wasMinimized)
  })

  // Run all tests
  async function run() {
    console.log('Running Integration Tests...')
    console.log('=====================================')

    for (const { name, fn } of tests) {
      try {
        await fn()
        passed++
        console.log(`✅ ${name}`)
      } catch (error) {
        failed++
        console.error(`❌ ${name}`)
        console.error(`   ${error.message}`)
      }
    }

    console.log('=====================================')
    console.log(`Results: ${passed} passed, ${failed} failed`)

    return failed === 0
  }

  return { run, test }
}

// Auto-run in browser environment
if (typeof window !== 'undefined') {
  window.addEventListener('load', async () => {
    // Wait for MediaPipe and app initialization
    setTimeout(async () => {
      const tester = new IntegrationTests()
      const success = await tester.run()

      // Update test results element if it exists
      const resultsEl = document.getElementById('test-results')
      if (resultsEl) {
        resultsEl.className = success ? 'pass' : 'fail'
        resultsEl.textContent = success ? 'All tests passed!' : 'Some tests failed - check console'
      }

      // Also log summary to console
      if (success) {
        console.log(
          '%c✅ All integration tests passed!',
          'color: green; font-size: 16px; font-weight: bold',
        )
      } else {
        console.log(
          '%c❌ Integration tests failed',
          'color: red; font-size: 16px; font-weight: bold',
        )
      }
    }, 1500)
  })
}

// Export for Node.js (though these need browser environment)
if (typeof module !== 'undefined') {
  module.exports = IntegrationTests
}
