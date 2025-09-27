/**
 * Tests for grace period logic
 * Ensures alerts only trigger after sustained bad posture
 */

// Load the module being tested
if (typeof require !== 'undefined') {
  const GracePeriod = require('./grace-period.js')
  global.GracePeriod = GracePeriod
}

// Tests
describe('GracePeriod', () => {
  test('should not alert immediately when posture becomes bad', () => {
    GracePeriod.reset()
    const result = GracePeriod.evaluate(true, 1000)
    assertEqual(result.shouldAlert, false)
    assertEqual(result.isInGracePeriod, true)
  })

  test('should remain in grace period for 3 seconds', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start

    // After 1 second - still in grace
    const result1 = GracePeriod.evaluate(true, 2000)
    assertEqual(result1.shouldAlert, false)
    assertEqual(result1.isInGracePeriod, true)

    // After 2.5 seconds - still in grace
    const result2 = GracePeriod.evaluate(true, 3500)
    assertEqual(result2.shouldAlert, false)
    assertEqual(result2.isInGracePeriod, true)
  })

  test('should alert after grace period expires', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start

    // After 3+ seconds - should alert
    const result = GracePeriod.evaluate(true, 4001)
    assertEqual(result.shouldAlert, true)
    assertEqual(result.isInGracePeriod, false)
    assertEqual(result.alertType, 'initial')
  })

  test('should reset when posture becomes good', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start bad posture
    GracePeriod.evaluate(true, 2000) // Still bad

    // Posture becomes good
    const goodResult = GracePeriod.evaluate(false, 3000)
    assertEqual(goodResult.shouldAlert, false)
    assertEqual(goodResult.isInGracePeriod, false)

    // Bad again - should restart grace period
    const badAgain = GracePeriod.evaluate(true, 4000)
    assertEqual(badAgain.shouldAlert, false)
    assertEqual(badAgain.isInGracePeriod, true)
  })

  test('should not alert repeatedly after initial alert', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start
    GracePeriod.evaluate(true, 4001) // First alert

    // Immediate next evaluation - no alert
    const result = GracePeriod.evaluate(true, 4100)
    assertEqual(result.shouldAlert, false)
    assertEqual(result.isInGracePeriod, false)
  })

  test('should send reminder after 10 seconds', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start
    GracePeriod.evaluate(true, 4001) // First alert at 4001

    // After 9 seconds - no reminder yet
    const before = GracePeriod.evaluate(true, 13000)
    assertEqual(before.shouldAlert, false)

    // After 10+ seconds - reminder
    const reminder = GracePeriod.evaluate(true, 14002)
    assertEqual(reminder.shouldAlert, true)
    assertEqual(reminder.alertType, 'reminder')
  })

  test('should handle posture corrections during grace period', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start bad
    GracePeriod.evaluate(true, 2000) // Still bad (in grace)
    GracePeriod.evaluate(false, 2500) // Corrected during grace

    // No alert should have triggered
    assertEqual(GracePeriod.lastAlertTime, null)

    // Bad again - new grace period
    const result = GracePeriod.evaluate(true, 3000)
    assertEqual(result.isInGracePeriod, true)
    assertEqual(result.shouldAlert, false)
  })

  test('should reset reminder timer after posture correction', () => {
    GracePeriod.reset()
    GracePeriod.evaluate(true, 1000) // Start
    GracePeriod.evaluate(true, 4001) // First alert
    GracePeriod.evaluate(true, 8000) // Waiting for reminder

    // Correct posture
    GracePeriod.evaluate(false, 9000)

    // Bad again
    GracePeriod.evaluate(true, 10000) // New grace period

    // After new grace period - should get initial alert, not reminder
    const result = GracePeriod.evaluate(true, 13001)
    assertEqual(result.shouldAlert, true)
    assertEqual(result.alertType, 'initial')
  })
})
