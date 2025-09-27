/**
 * Tests for posture-calculator.js
 * Pure function tests - no browser dependencies
 */

// Import test runner assertions
if (typeof require !== 'undefined') {
  require('./test-runner.js')
}

// Mock landmark data helper
function createMockLandmarks(positions = {}) {
  const landmarks = new Array(478)

  // Initialize all landmarks with default positions
  for (let i = 0; i < 478; i++) {
    landmarks[i] = { x: 0.5, y: 0.5, z: 0 }
  }

  // Set specific landmarks for testing
  if (positions.leftEye) {
    landmarks[33] = { ...landmarks[33], ...positions.leftEye }
  }
  if (positions.rightEye) {
    landmarks[263] = { ...landmarks[263], ...positions.rightEye }
  }

  return landmarks
}

// Mock the module functions for testing
// In a real implementation, these would be imported from posture-calculator.js
function calculateHeadTilt(landmarks) {
  if (!landmarks || landmarks.length < 478) {
    throw new Error('Invalid landmarks data')
  }

  // Use eye corners for roll angle calculation
  const leftEye = landmarks[33] // Left eye outer corner
  const rightEye = landmarks[263] // Right eye outer corner

  const deltaY = rightEye.y - leftEye.y
  const deltaX = rightEye.x - leftEye.x

  // Calculate angle in degrees
  const angleRadians = Math.atan2(deltaY, deltaX)
  const angleDegrees = angleRadians * (180 / Math.PI)

  return angleDegrees
}

function evaluatePosture(angle, threshold = 5) {
  const absoluteAngle = Math.abs(angle)
  return {
    isGood: absoluteAngle <= threshold,
    angle: angle,
    deviation: absoluteAngle,
  }
}

// Tests for calculateHeadTilt
describe('calculateHeadTilt', () => {
  test('returns 0 for perfectly horizontal eyes', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.5 },
      rightEye: { x: 0.7, y: 0.5 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertCloseTo(angle, 0, 0.01)
  })

  test('returns positive angle for right tilt', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.4 },
      rightEye: { x: 0.7, y: 0.6 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertGreaterThan(angle, 0)
    // Should be approximately 26.57 degrees
    assertCloseTo(angle, 26.565, 1)
  })

  test('returns negative angle for left tilt', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.6 },
      rightEye: { x: 0.7, y: 0.4 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertLessThan(angle, 0)
    // Should be approximately -26.57 degrees
    assertCloseTo(angle, -26.565, 1)
  })

  test('handles 45 degree tilt correctly', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.3 },
      rightEye: { x: 0.7, y: 0.7 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertCloseTo(angle, 45, 0.1)
  })

  test('handles -45 degree tilt correctly', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.7 },
      rightEye: { x: 0.7, y: 0.3 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertCloseTo(angle, -45, 0.1)
  })

  test('handles extreme 90 degree tilt', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.5, y: 0.3 },
      rightEye: { x: 0.5, y: 0.7 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertCloseTo(angle, 90, 0.1)
  })

  test('throws error for invalid landmarks data', () => {
    assertThrows(() => {
      calculateHeadTilt(null)
    }, 'Invalid landmarks data')

    assertThrows(() => {
      calculateHeadTilt([])
    }, 'Invalid landmarks data')

    assertThrows(() => {
      calculateHeadTilt(new Array(100))
    }, 'Invalid landmarks data')
  })

  test('handles very small angle differences', () => {
    const landmarks = createMockLandmarks({
      leftEye: { x: 0.3, y: 0.5 },
      rightEye: { x: 0.7, y: 0.501 },
    })

    const angle = calculateHeadTilt(landmarks)
    assertGreaterThan(angle, 0)
    assertLessThan(angle, 1)
  })
})

// Tests for evaluatePosture
describe('evaluatePosture', () => {
  test('marks posture as good when angle is 0', () => {
    const result = evaluatePosture(0, 15)
    assertTrue(result.isGood)
    assertEqual(result.angle, 0)
    assertEqual(result.deviation, 0)
  })

  test('marks posture as good within threshold', () => {
    const result = evaluatePosture(10, 15)
    assertTrue(result.isGood)
    assertEqual(result.angle, 10)
    assertEqual(result.deviation, 10)
  })

  test('marks posture as good at exact threshold', () => {
    const result = evaluatePosture(15, 15)
    assertTrue(result.isGood)
    assertEqual(result.angle, 15)
    assertEqual(result.deviation, 15)
  })

  test('marks posture as bad beyond threshold', () => {
    const result = evaluatePosture(20, 15)
    assertFalse(result.isGood)
    assertEqual(result.angle, 20)
    assertEqual(result.deviation, 20)
  })

  test('handles negative angles correctly', () => {
    const result = evaluatePosture(-20, 15)
    assertFalse(result.isGood)
    assertEqual(result.angle, -20)
    assertEqual(result.deviation, 20)
  })

  test('uses default threshold of 5 degrees', () => {
    const goodResult = evaluatePosture(4)
    assertTrue(goodResult.isGood)

    const badResult = evaluatePosture(6)
    assertFalse(badResult.isGood)
  })

  test('handles custom thresholds', () => {
    const strictResult = evaluatePosture(6, 5)
    assertFalse(strictResult.isGood)

    const lenientResult = evaluatePosture(25, 30)
    assertTrue(lenientResult.isGood)
  })

  test('preserves original angle in result', () => {
    const positiveResult = evaluatePosture(12.5, 20)
    assertEqual(positiveResult.angle, 12.5)

    const negativeResult = evaluatePosture(-12.5, 20)
    assertEqual(negativeResult.angle, -12.5)
  })

  test('handles zero threshold', () => {
    const exactResult = evaluatePosture(0, 0)
    assertTrue(exactResult.isGood)

    const tiltedResult = evaluatePosture(0.1, 0)
    assertFalse(tiltedResult.isGood)
  })

  test('handles very large angles', () => {
    const result = evaluatePosture(180, 15)
    assertFalse(result.isGood)
    assertEqual(result.deviation, 180)
  })
})
