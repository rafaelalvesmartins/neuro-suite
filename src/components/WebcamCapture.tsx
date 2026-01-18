import { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { AlertCircle, ArrowDown } from 'lucide-react';
import HRVMonitor from './HRVMonitor';

interface WebcamCaptureProps {
  onBlinkDetected: (blinkRate: number, hrvValue?: number) => void;
  isScanning: boolean;
  onScanComplete: () => void;
}

export default function WebcamCapture({ onBlinkDetected, isScanning, onScanComplete }: WebcamCaptureProps) {
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
  const intervalRef = useRef<number>();
  const scanStartTimeRef = useRef<number>(0);
  const lastEARRef = useRef<number>(1);
  const blinkCountRef = useRef<number>(0);
  const noFaceFramesRef = useRef<number>(0);
  const lastBlinkTimeRef = useRef<number>(0);
  const backgroundDataRef = useRef<{ blinks: number[], timestamps: number[] }>({ blinks: [], timestamps: [] });

  // Detectar plataforma
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

  // Inicializar MediaPipe com configuração robusta
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
        setError('Erro ao inicializar detecção facial');
        console.error(err);
      }
    };

    initMediaPipe();
  }, []);

  // Detectar visibilidade da página (background mode) - continua processamento
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      setIsBackgroundMode(isHidden);
      // Não pausa o processamento - continua em background
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Função para parar câmera
  const stopWebcam = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Controlar câmera baseado no estado de scanning
  useEffect(() => {
    const startWebcam = async () => {
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
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Erro ao acessar câmera. Permita o acesso.');
        console.error(err);
      }
    };

    if (isScanning) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isScanning]);

  // Calcular EAR (Eye Aspect Ratio) - Fórmula correta
  const calculateEAR = (landmarks: any) => {
    // Índices corretos dos landmarks dos olhos do MediaPipe
    // Left eye: outer corner, top1, top2, inner corner, bottom1, bottom2
    const leftEye = [33, 160, 158, 133, 144, 153];
    // Right eye: inner corner, top1, top2, outer corner, bottom1, bottom2  
    const rightEye = [362, 385, 387, 263, 380, 373];

    const getEAR = (eye: number[]) => {
      // Pontos do olho
      const outerCorner = landmarks[eye[0]];
      const top1 = landmarks[eye[1]];
      const top2 = landmarks[eye[2]];
      const innerCorner = landmarks[eye[3]];
      const bottom1 = landmarks[eye[4]];
      const bottom2 = landmarks[eye[5]];

      // Calcular distâncias verticais (altura do olho em 2 pontos)
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
      
      // Calcular distância horizontal (largura do olho)
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

  // Processar frame com setInterval para funcionar em background
  const processFrame = () => {
    if (!videoRef.current || !faceLandmarker || !isScanning) {
      return;
    }

    const video = videoRef.current;

    if (video.readyState !== 4) {
      return;
    }

    try {
      // Detectar face com configuração otimizada
      const results = faceLandmarker.detectForVideo(video, Date.now());
      
      if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];
        const currentEAR = calculateEAR(landmarks);
        
        // Log de debug detalhado com plataforma
        console.log('Platform:', navigator.userAgent, 'Landmarks:', results.faceLandmarks.length, 'EAR:', currentEAR?.toFixed(3) || 'N/A');

        // Reset contador de frames sem face
        noFaceFramesRef.current = 0;
        setFaceDetected(true);
        setLowLightWarning(false);

        // Detectar piscada com threshold diferenciado por plataforma
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
          
          console.log('Piscada detectada! Total:', blinkCountRef.current);
          
          // Salvar timestamp em background mode
          if (isBackgroundMode) {
            backgroundDataRef.current.blinks.push(blinkCountRef.current);
            backgroundDataRef.current.timestamps.push(now);
          }
        }

        lastEARRef.current = currentEAR;

        // Verificar tempo de scan
        if (scanStartTimeRef.current === 0) {
          scanStartTimeRef.current = Date.now();
        }

        const elapsedTime = (Date.now() - scanStartTimeRef.current) / 1000;
        
        // Atualizar taxa de piscadas em tempo real (3 casas decimais)
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
        // Incrementar contador de frames sem face
        noFaceFramesRef.current += 1;

        // Alertas progressivos
        if (noFaceFramesRef.current > 10) { // ~1 segundo sem face (10 frames a 100ms)
          setFaceDetected(false);
        }
        if (noFaceFramesRef.current > 30) { // ~3 segundos sem face
          setLowLightWarning(true);
        }
      }
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  };

  // Controlar scan com setInterval para background
  useEffect(() => {
    if (isScanning && faceLandmarker) {
      console.log('Starting scan with faceLandmarker:', !!faceLandmarker);
      blinkCountRef.current = 0;
      setBlinkCount(0);
      setCurrentBlinkRate(0);
      scanStartTimeRef.current = 0;
      lastEARRef.current = 0.3;
      lastBlinkTimeRef.current = 0;
      
      // Usar setInterval (50ms) otimizado
      intervalRef.current = window.setInterval(() => {
        processFrame();
      }, 50);
      
      console.log('processFrame iniciado com setInterval (50ms)');
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
    console.log('HRV detectado:', hrv, 'ms, HR:', heartRate, 'bpm');
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
          className="w-full h-auto max-h-[400px] object-cover sm:max-h-[500px]"
        />
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Feedback visual de câmera desligada */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <div className="text-center text-white px-4 space-y-2">
              <div className="text-5xl mb-3">📷</div>
              <p className="text-xl font-bold">Câmera Desligada</p>
              <p className="text-sm text-white/70">Clique em "Iniciar Scan" para ativar</p>
            </div>
          </div>
        )}
        
        {/* Feedback visual overlay durante scan */}
        {isScanning && (
          <>
            {/* Indicador de câmera ligada */}
            <div className="absolute top-2 left-2 px-3 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-2 font-bold shadow-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Câmera Ligada
            </div>
            
            {/* Background mode indicator */}
            {isBackgroundMode && (
              <div className="absolute top-2 right-2 px-3 py-1 bg-blue-500/90 text-white text-xs rounded-full flex items-center gap-1 animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" />
                Rodando em background
              </div>
            )}
            
            {/* Face not detected warning */}
            {!faceDetected && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="text-center space-y-2 p-4">
                  <ArrowDown className="h-8 w-8 text-yellow-400 mx-auto animate-bounce" />
                  <p className="text-white text-sm font-medium">Ajuste sua posição</p>
                  <p className="text-white/70 text-xs">Posicione seu rosto na câmera</p>
                </div>
              </div>
            )}
            
            {/* Low light warning */}
            {lowLightWarning && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-2 bg-orange-500/90 text-white text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Iluminação baixa? Aproxime-se da luz!</span>
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
              <p className="text-xs text-muted-foreground mb-1">Piscadas</p>
              <p className="text-2xl font-bold text-primary">{blinkCount}</p>
            </div>
            <div className="p-3 bg-secondary/10 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Taxa atual</p>
              <p className="text-2xl font-bold text-secondary">{currentBlinkRate}/min</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
            {faceDetected ? 'Face detectada • ' : 'Posicione seu rosto • '}
            {isBackgroundMode ? 'Pode minimizar janela' : 'Trabalhe normalmente'}
          </div>
        </div>
      )}
    </div>
  );
}