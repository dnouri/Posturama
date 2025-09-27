/**
 * Audio Alert Module
 * Provides sound feedback for posture alerts
 */

class AudioAlert {
  constructor() {
    this.isReady = false
    this.isPlaying = false
    this.lastError = null
    this.audioElement = null
    this.playCount = 0
  }

  async initialize() {
    try {
      // Create audio element with data URI to avoid external file dependency
      this.audioElement = new Audio()

      // Simple beep sound as data URI (200Hz sine wave, 200ms)
      // This is a tiny WAV file encoded as base64
      const beepDataUri =
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYmNkZWZpSGZpUmZZkJSPhY+DjYGKv4j+Rn1EPEo8SPxJPEo8S/2Mvg0+zD+MP4t/yz/LP8t/zD+Mvs09jL2L/Eo8SPxEPEZ9SP5Kv4GNg42Fj4+RmWZqZW5kY2JhYGBe3VvZ2FaU0tDOzUvKyUgGRMJDQUS'

      this.audioElement.src = beepDataUri
      this.audioElement.volume = 0.3 // Not too loud

      // Test if audio can play
      await this.audioElement.load()
      this.isReady = true
      return true
    } catch (error) {
      this.lastError = error.message
      this.isReady = false
      return false
    }
  }

  async play(alertType = 'initial') {
    if (!this.isReady) {
      console.warn('Audio system not ready')
      return false
    }

    if (this.isPlaying) {
      console.warn('Audio already playing')
      return false
    }

    try {
      this.isPlaying = true

      // Different patterns for different alert types
      if (alertType === 'initial') {
        // Two quick beeps
        await this.playBeep()
        await this.delay(100)
        await this.playBeep()
      } else if (alertType === 'reminder') {
        // Single longer beep
        await this.playBeep(300)
      }

      this.playCount++
      this.isPlaying = false
      return true
    } catch (error) {
      this.lastError = error.message
      this.isPlaying = false
      console.error('Audio play failed:', error)
      return false
    }
  }

  async playBeep(duration = 200) {
    if (!this.audioElement) return

    // Clone the audio element for concurrent playback
    const audio = this.audioElement.cloneNode()
    audio.volume = this.audioElement.volume

    const playPromise = audio.play()

    if (playPromise !== undefined) {
      await playPromise.catch((err) => {
        console.warn('Audio playback blocked:', err)
      })
      // Stop after duration
      await this.delay(duration)
      audio.pause()
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  setVolume(level) {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, level))
    }
  }

  dispose() {
    if (this.audioElement) {
      this.audioElement.pause()
      this.audioElement.src = ''
      this.audioElement = null
    }
    this.isReady = false
    this.isPlaying = false
  }
}

// Export for browser and Node.js
if (typeof window !== 'undefined') {
  window.AudioAlert = AudioAlert
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioAlert
}
