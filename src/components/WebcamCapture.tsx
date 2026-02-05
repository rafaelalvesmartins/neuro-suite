import { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { AlertCircle, ArrowDown } from 'lucide-react';
import HRVMonitor from './HRVMonitor';

interface WebcamCaptureProps {
  onBlinkDetected: (blinkRate: number, hrvValue?: number) => void;
  isScanning: boolean;
  isAnalyzing?: boolean;
  onScanComplete: () => void;
}

export default function WebcamCapture({ onBlinkDetected, isScanning, isAnalyzing = false, onScanComplete }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [currentBlinkRate, setCurrentBlinkRate] = useState(0);
  const [error, setError] = useState<string>('');
  const [hrvValue, setHRVValue] = useState<number | undefined>(undefined);
  const [faceDetected, setFaceDetected] = useState(true);
  const [lowLightWarning, setLowLightWarning] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const intervalRef = useRef<number>();
  const scanStartTimeRef = useRef<number>(0);
  const lastEARRef = useRef<number>(1);
  const blinkCountRef = useRef<number>(0);
  const noFaceFramesRef = useRef<number>(0);
  const lastBlinkTimeRef = useRef<number>(0);
  const backgroundDataRef = useRef<{ blinks: number[], timestamps: number[] }>({ blinks: [], timestamps: [] });

  // Detect platform
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

  // Initialize MediaPipe with robust configuration
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          numFaces: 1,
          runningMode: 'VIDEO',
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false,
          minFaceDetectionConfidence: isMobile ? 0.7 : 0.6,
          minFacePresenceConfidence: 0.5,
        });

        setFaceLandmarker(landmarker);
      } catch (err) {
        setError('Error initializing face detection');
        console.error(err);
      }
    };

    initMediaPipe();
  }, []);

  // Detect page visibility (background mode) - continues processing
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsBackgroundMode(isHidden);
      // Does not pause processing - continues in background
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Function to stop webcam
  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Control camera based on scanning state
  useEffect(() => {
    const startWebcam = async () => {
      setIsStreamReady(false);
      setFaceDetected(true); // Reset to avoid premature overlay

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
            frameRate: { ideal: 15 }
          },
        });

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;

          // Wait for metadata to load to ensure correct dimensions
          await new Promise<void>((resolve) => {
            if (video.readyState >= 2) {
              resolve();
            } else {
              video.onloadedmetadata = () => resolve();
            }
          });

          // Explicit call to ensure preview is displayed
          try {
            await video.play();
            setIsStreamReady(true);
            console.log('Camera preview started successfully, dimensions:', video.videoWidth, 'x', video.videoHeight);
          } catch (playErr) {
            console.warn('Autoplay blocked, waiting for interaction:', playErr);
            // Even with autoplay error, mark stream as ready
            setIsStreamReady(true);
          }
        }
      } catch (err) {
        setError('Error accessing camera. Please allow access.');
        console.error(err);
      }
    };

    if (isScanning) {
      startWebcam();
    } else if (!isAnalyzing) {
      // Only stop camera if NOT in Gemini analysis
      stopWebcam();
      setIsStreamReady(false);
    }

    return () => {
      if (!isAnalyzing) {
        stopWebcam();
        setIsStreamReady(false);
      }
    };
  }, [isScanning, isAnalyzing]);

  // Calculate EAR (Eye Aspect Ratio) - Correct formula
  const calculateEAR = (landmarks: any) => {
    // Correct indices of eye landmarks from MediaPipe
    // Left eye: outer corner, top1, top2, inner corner, bottom1, bottom2
    const leftEye = [33, 160, 158, 133, 144, 153];
    // Right eye: inner corner, top1, top2, outer corner, bottom1, bottom2
    const rightEye = [362, 385, 387, 263, 380, 373];

    const getEAR = (eye: number[]) => {
      // Eye points
      const outerCorner = landmarks[eye[0]];
      const top1 = landmarks[eye[1]];
      const top2 = landmarks[eye[2]];
      const innerCorner = landmarks[eye[3]];
      const bottom1 = landmarks[eye[4]];
      const bottom2 = landmarks[eye[5]];

      // Calculate vertical distances (eye height at 2 points)
      const vertical1 = Math.sqrt(
        Math.pow(top1.x - bottom1.x, 2) +
        Math.pow(top1.y - bottom1.y, 2) +
        Math.pow(top1.z - bottom1.z, 2)
      );
      const vertical2 = Math.sqrt(
        Math.pow(top2.x - bottom2.x, 2) +
        Math.pow(top2.y - bottom2.y, 2) +
        Math.pow(top2.z - bottom2.z, 2)
      );

      // Calculate horizontal distance (eye width)
      const horizontal = Math.sqrt(
        Math.pow(outerCorner.x - innerCorner.x, 2) +
        Math.pow(outerCorner.y - innerCorner.y, 2) +
        Math.pow(outerCorner.z - innerCorner.z, 2)
      );

      // EAR = (vertical1 + vertical2) / (2.0 * horizontal)
      return (vertical1 + vertical2) / (2.0 * horizontal);
    };

    const leftEAR = getEAR(leftEye);
    const rightEAR = getEAR(rightEye);

    return (leftEAR + rightEAR) / 2.0;
  };

  // Process frame with setInterval to work in background
  const processFrame = () => {
    if (!videoRef.current || !faceLandmarker || !isScanning) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState !== 4) {
      return;
    }

    try {
      // Detect face with optimized configuration
      const results = faceLandmarker.detectForVideo(video, Date.now());

      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const currentEAR = calculateEAR(landmarks);

        // Reset frame counter without face
        noFaceFramesRef.current = 0;
        setFaceDetected(true);
        setLowLightWarning(false);

        // Detect blink with differentiated threshold by platform
        const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        const EAR_THRESHOLD = isMobile ? 0.12 : 0.15;
        const EAR_OPEN = isMobile ? 0.18 : 0.20;
        const DEBOUNCE_MS = 100;

        const now = Date.now();
        const timeSinceLastBlink = now - lastBlinkTimeRef.current;

        if (lastEARRef.current > EAR_OPEN && currentEAR <= EAR_THRESHOLD && timeSinceLastBlink > DEBOUNCE_MS) {
          blinkCountRef.current += 1;
          setBlinkCount(blinkCountRef.current);
          lastBlinkTimeRef.current = now;

          console.log('Blink detected! Total:', blinkCountRef.current);

          // Save timestamp in background mode
          if (isBackgroundMode) {
            backgroundDataRef.current.blinks.push(blinkCountRef.current);
            backgroundDataRef.current.timestamps.push(now);
          }
        }

        lastEARRef.current = currentEAR;

        // Check scan time
        if (scanStartTimeRef.current === 0) {
          scanStartTimeRef.current = Date.now();
        }

        const elapsedTime = (Date.now() - scanStartTimeRef.current) / 1000;

        // Update blink rate in real-time (3 decimal places)
        if (elapsedTime > 0) {
          const currentRate = (blinkCountRef.current / elapsedTime) * 60;
          setCurrentBlinkRate(Math.round(currentRate * 1000) / 1000);
        }

        if (elapsedTime >= 60) {
          const blinkRate = blinkCountRef.current / (elapsedTime / 60);
          onBlinkDetected(blinkRate, hrvValue);
          stopWebcam();
          onScanComplete();
          return;
        }
      } else {
        // Increment frame counter without face
        noFaceFramesRef.current += 1;

        // Progressive alerts
        if (noFaceFramesRef.current > 10) { // ~1 second without face (10 frames at 100ms)
          setFaceDetected(false);
        }
        if (noFaceFramesRef.current > 30) { // ~3 seconds without face
          setLowLightWarning(true);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };

  // Control scan with setInterval for background
  useEffect(() => {
    if (isScanning && faceLandmarker) {
      console.log('Starting scan with faceLandmarker:', !!faceLandmarker);
      blinkCountRef.current = 0;
      setBlinkCount(0);
      setCurrentBlinkRate(0);
      scanStartTimeRef.current = 0;
      lastEARRef.current = 0.3;
      lastBlinkTimeRef.current = 0;

      // Use optimized setInterval (50ms)
      intervalRef.current = window.setInterval(() => {
        processFrame();
      }, 50);

      console.log('processFrame started with setInterval (50ms)');
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [isScanning, faceLandmarker]);

  const handleHRVDetected = (hrv: number, heartRate: number) => {
    console.log('HRV detected:', hrv, 'ms, HR:', heartRate, 'bpm');
    setHRVValue(hrv);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden shadow-medium bg-muted max-w-md mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full min-h-[300px] h-auto max-h-[400px] object-cover sm:max-h-[500px] bg-black"
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Camera off visual feedback - NOT shown during Gemini analysis */}
        {!isScanning && !isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center text-white px-4 space-y-2">
              <div className="text-5xl mb-3">📷</div>
              <p className="text-xl font-bold">Camera Off</p>
              <p className="text-sm text-white/70">Click "Start Scan" to activate</p>
            </div>
          </div>
        )}

        {/* Visual feedback overlay during scan */}
        {isScanning && (
          <>
            {/* Loading indicator while stream loads */}
            {!isStreamReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center text-white space-y-2">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm">Starting camera...</p>
                </div>
              </div>
            )}

            {/* Camera on indicator - only shows when stream is ready */}
            {isStreamReady && (
              <div className="absolute top-2 left-2 px-3 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-2 font-bold shadow-lg">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                Camera On
              </div>
            )}

            {/* Background mode indicator */}
            {isBackgroundMode && (
              <div className="absolute top-2 right-2 px-3 py-1 bg-blue-500/90 text-white text-xs rounded-full flex items-center gap-1 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
                Running in background
              </div>
            )}

            {/* Face not detected warning - only shows after stream loads */}
            {isStreamReady && !faceDetected && (
              <div className="absolute bottom-12 left-2 right-2 px-3 py-2 bg-yellow-500/90 text-white text-xs rounded-lg flex items-center gap-2">
                <ArrowDown className="h-4 w-4 flex-shrink-0 animate-bounce" />
                <span>Position your face in the camera</span>
              </div>
            )}

            {/* Low light warning */}
            {lowLightWarning && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-orange-500/90 text-white text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Low lighting? Move closer to the light!</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* HRV Monitor via rPPG */}
      <HRVMonitor
        videoRef={videoRef}
        canvasRef={canvasRef}
        isScanning={isScanning}
        onHRVDetected={handleHRVDetected}
      />

      {isScanning && (
        <div className="text-center space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Blinks</p>
              <p className="text-2xl font-bold text-primary">{blinkCount}</p>
            </div>
            <div className="p-3 bg-secondary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Current rate</p>
              <p className="text-2xl font-bold text-secondary">{currentBlinkRate}/min</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
            {faceDetected ? 'Face detected • ' : 'Position your face • '}
            {isBackgroundMode ? 'Can minimize window' : 'Work normally'}
          </div>
        </div>
      )}
    </div>
  );
}
