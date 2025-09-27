/**
 * Tests for audio alert system
 * Handles posture alerts with sound feedback
 */

// Load the module being tested
if (typeof require !== 'undefined') {
  const AudioAlert = require('./audio-alert.js')
  global.AudioAlert = AudioAlert
}

// Tests
describe('AudioAlert', () => {
  test('should initialize audio system', async () => {
    const audio = new AudioAlert()
    assertEqual(audio.isReady, false)

    // In test environment, Audio might not be available
    if (typeof Audio !== 'undefined') {
      const result = await audio.initialize()
      // May succeed or fail depending on browser support
      assert(typeof result === 'boolean')
    }

    audio.dispose()
  })

  test('should track ready state', () => {
    const audio = new AudioAlert()
    assertEqual(audio.isReady, false)

    audio.isReady = true // Simulate successful init
    assertEqual(audio.isReady, true)

    audio.dispose()
    assertEqual(audio.isReady, false)
  })

  test('should track play count', async () => {
    const audio = new AudioAlert()
    assertEqual(audio.playCount, 0)

    // Simulate successful plays
    audio.isReady = true
    audio.playCount = 1
    assertEqual(audio.playCount, 1)

    audio.playCount = 5
    assertEqual(audio.playCount, 5)
  })

  test('should prevent playing when not ready', async () => {
    const audio = new AudioAlert()
    audio.isReady = false

    const result = await audio.play()
    assertEqual(result, false)
    assertEqual(audio.playCount, 0)
  })

  test('should prevent concurrent playback', async () => {
    const audio = new AudioAlert()
    audio.isReady = true
    audio.isPlaying = true

    const result = await audio.play()
    assertEqual(result, false)
  })

  test('should handle volume control', () => {
    const audio = new AudioAlert()
    audio.audioElement = { volume: 0.5 }

    audio.setVolume(0.7)
    assertEqual(audio.audioElement.volume, 0.7)

    // Test clamping
    audio.setVolume(1.5)
    assertEqual(audio.audioElement.volume, 1)

    audio.setVolume(-0.5)
    assertEqual(audio.audioElement.volume, 0)
  })

  test('should cleanup on dispose', () => {
    const audio = new AudioAlert()
    const mockElement = {
      pause: () => {},
      src: 'test',
    }

    audio.audioElement = mockElement
    audio.isReady = true
    audio.isPlaying = true

    audio.dispose()

    assertEqual(audio.audioElement, null)
    assertEqual(audio.isReady, false)
    assertEqual(audio.isPlaying, false)
  })

  test('should handle different alert types', async () => {
    const audio = new AudioAlert()

    // Mock the playBeep method to count calls
    let beepCount = 0
    audio.playBeep = async () => {
      beepCount++
    }
    audio.isReady = true

    // Initial alert - should beep twice
    beepCount = 0
    await audio.play('initial')
    assertEqual(beepCount, 2)

    // Reminder alert - should beep once
    beepCount = 0
    await audio.play('reminder')
    assertEqual(beepCount, 1)
  })
})
