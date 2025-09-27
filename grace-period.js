/**
 * Grace Period Module
 * Manages alert timing to prevent fatigue from temporary bad posture
 */

const GracePeriod = {
  DURATION_MS: 3000,
  REMINDER_INTERVAL_MS: 10000,

  // Track bad posture timing
  badPostureStartTime: null,
  lastAlertTime: null,

  // Main logic - returns alert decision
  evaluate(isPostureBad, currentTime = Date.now()) {
    if (!isPostureBad) {
      // Good posture - reset everything
      this.badPostureStartTime = null
      this.lastAlertTime = null
      return { shouldAlert: false, isInGracePeriod: false }
    }

    // Bad posture detected
    if (!this.badPostureStartTime) {
      // Just started being bad
      this.badPostureStartTime = currentTime
      return { shouldAlert: false, isInGracePeriod: true }
    }

    // Check if grace period expired
    const elapsed = currentTime - this.badPostureStartTime
    if (elapsed < this.DURATION_MS) {
      // Still in grace period
      return { shouldAlert: false, isInGracePeriod: true }
    }

    // Grace period expired - check if we should alert
    if (!this.lastAlertTime) {
      // First alert
      this.lastAlertTime = currentTime
      return { shouldAlert: true, isInGracePeriod: false, alertType: 'initial' }
    }

    // Check for reminder
    const timeSinceLastAlert = currentTime - this.lastAlertTime
    if (timeSinceLastAlert >= this.REMINDER_INTERVAL_MS) {
      this.lastAlertTime = currentTime
      return { shouldAlert: true, isInGracePeriod: false, alertType: 'reminder' }
    }

    // Already alerted, waiting for next reminder
    return { shouldAlert: false, isInGracePeriod: false }
  },

  reset() {
    this.badPostureStartTime = null
    this.lastAlertTime = null
  },
}

// Export for browser and Node.js
if (typeof window !== 'undefined') {
  window.GracePeriod = GracePeriod
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GracePeriod
}
