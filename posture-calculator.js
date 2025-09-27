/**
 * Posture Calculator Module
 * Pure functions for calculating head tilt and evaluating posture
 */

// Configuration constants
const POSTURE_CONFIG = {
  MIN_THRESHOLD: 3,
  MAX_THRESHOLD: 8,
  DEFAULT_THRESHOLD: 5,
}

class PostureCalculator {
  /**
   * Calculate head tilt angle from face landmarks
   * Uses eye corners for roll angle calculation
   * @param {Array} landmarks - Array of 478 face landmarks
   * @returns {number} Angle in degrees (positive = right tilt, negative = left tilt)
   */
  static calculateHeadTilt(landmarks) {
    if (!landmarks || landmarks.length < 478) {
      throw new Error('Invalid landmarks data')
    }

    // Use eye corners for roll angle calculation
    const leftEye = landmarks[33] // Left eye outer corner
    const rightEye = landmarks[263] // Right eye outer corner

    if (!leftEye || !rightEye) {
      throw new Error('Eye landmarks not found')
    }

    const deltaY = rightEye.y - leftEye.y
    const deltaX = rightEye.x - leftEye.x

    // Calculate angle in degrees
    const angleRadians = Math.atan2(deltaY, deltaX)
    const angleDegrees = angleRadians * (180 / Math.PI)

    return angleDegrees
  }

  /**
   * Evaluate posture based on tilt angle
   * @param {number} angle - Current tilt angle in degrees
   * @param {number} threshold - Maximum acceptable tilt in degrees
   * @returns {Object} Posture evaluation result
   */
  static evaluatePosture(angle, threshold = POSTURE_CONFIG.DEFAULT_THRESHOLD) {
    const absoluteAngle = Math.abs(angle)
    return {
      isGood: absoluteAngle <= threshold,
      angle: angle,
      deviation: absoluteAngle,
      direction: angle > 0 ? 'right' : angle < 0 ? 'left' : 'center',
    }
  }

  /**
   * Calculate symmetric points for more robust detection
   * Future enhancement - using multiple landmark pairs
   */
  static calculateHeadTiltSymmetric(landmarks) {
    if (!landmarks || landmarks.length < 478) {
      throw new Error('Invalid landmarks data')
    }

    // Multiple symmetric points for stability
    const leftTemple = landmarks[70]
    const rightTemple = landmarks[300]
    const leftJaw = landmarks[172]
    const rightJaw = landmarks[397]

    // Average the tilt from multiple pairs
    const templeTilt = Math.atan2(rightTemple.y - leftTemple.y, rightTemple.x - leftTemple.x)

    const jawTilt = Math.atan2(rightJaw.y - leftJaw.y, rightJaw.x - leftJaw.x)

    // Average and convert to degrees
    const averageTilt = (templeTilt + jawTilt) / 2
    return averageTilt * (180 / Math.PI)
  }
}

// Export for use in app
window.PostureCalculator = PostureCalculator
window.POSTURE_CONFIG = POSTURE_CONFIG
