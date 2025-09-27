/**
 * Face Detector Module
 * Wraps MediaPipe Face Landmarker for posture detection
 */

class FaceDetector {
  constructor() {
    this.faceLandmarker = null
    this.isReady = false
    this.lastVideoTime = -1
  }

  async initialize(onProgress) {
    try {
      // Report progress
      if (onProgress) onProgress('Loading MediaPipe...')

      // Check if MediaPipe is loaded
      if (typeof window.FaceLandmarker === 'undefined') {
        throw new Error('MediaPipe not loaded. Please check your internet connection.')
      }

      // Create vision file set resolver
      if (onProgress) onProgress('Initializing vision...')
      const vision = await window.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      )

      // Download and initialize model
      if (onProgress) onProgress('Downloading face model...')
      this.faceLandmarker = await window.FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU', // Try GPU first, falls back to CPU
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false, // We don't need these
        outputFacialTransformationMatrixes: false, // We don't need these
      })

      this.isReady = true
      if (onProgress) onProgress('Face detector ready')
      return true
    } catch (error) {
      console.error('Failed to initialize face detector:', error)
      throw error
    }
  }

  detectFaces(videoElement, timestamp) {
    if (!this.isReady) {
      throw new Error('Face detector not initialized')
    }

    if (!videoElement || !videoElement.videoWidth) {
      return null
    }

    // Only process new frames
    if (videoElement.currentTime === this.lastVideoTime) {
      return null
    }
    this.lastVideoTime = videoElement.currentTime

    try {
      // Perform detection
      const results = this.faceLandmarker.detectForVideo(videoElement, timestamp)

      // Return landmarks if face detected
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        return {
          landmarks: results.faceLandmarks[0],
          imageWidth: videoElement.videoWidth,
          imageHeight: videoElement.videoHeight,
        }
      }

      return null
    } catch (error) {
      console.error('Detection error:', error)
      return null
    }
  }

  dispose() {
    if (this.faceLandmarker) {
      this.faceLandmarker.close()
      this.faceLandmarker = null
    }
    this.isReady = false
  }
}

// Export for use in app
window.FaceDetector = FaceDetector
