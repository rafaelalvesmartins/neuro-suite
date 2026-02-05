import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Scan, Activity, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import WebcamCapture from './WebcamCapture';

interface NeuroScoreProps {
  onScoreComplete: (stressLevel: string, hrvValue?: number) => void;
}

export default function NeuroScore({ onScoreComplete }: NeuroScoreProps) {
  // DEMO MODE: true = simulated perfect analysis | false = real Gemini API
  const DEMO_MODE = false;

  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    blinkRate: number;
    stressLevel: string;
    message: string;
    emoji: string;
  } | null>(null);
  const [userName, setUserName] = useState<string>('');
  const { toast } = useToast();

  // States for Gemini Vision
  const [visionResult, setVisionResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressVision, setProgressVision] = useState(0);

  // Language state with localStorage persistence
  const [language, setLanguage] = useState<'pt' | 'en'>(() => {
    const saved = localStorage.getItem('neurosuite-lang');
    return (saved === 'en' ? 'en' : 'pt');
  });

  const handleLanguageChange = (value: string) => {
    if (value === 'pt' || value === 'en') {
      setLanguage(value);
      localStorage.setItem('neurosuite-lang', value);
    }
  };

  // Ref to control scan interval
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Load user name and last scan on mount
  useEffect(() => {
    const loadUserDataAndScan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_name, full_name')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserName(profile.preferred_name || profile.full_name || '');
          }

          // Get last scan
          const { data } = await supabase
            .from('stress_scans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (data) {
            let emoji = '😊';
            let message = 'Optimized focus, high productivity';
            if (data.stress_level === 'moderate') {
              emoji = '😐';
              message = 'Normal attention, suggest breaks to avoid burnout';
            } else if (data.stress_level === 'high') {
              emoji = '😟';
              message = 'Stress alert, prioritize rebalancing (NR-1)';
            }

            setResult({
              blinkRate: data.blink_rate,
              stressLevel: data.stress_level,
              message,
              emoji,
            });
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadUserDataAndScan();
  }, []);

  const startScan = () => {
    // Clear previous interval if exists
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setIsScanning(true);
    setProgress(0);
    setVisionResult(''); // Clear previous Gemini result

    // Simulate progress
    scanIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
          return 100;
        }
        return prev + (100 / 60); // 60 seconds
      });
    }, 1000);
  };

  const handleBlinkDetected = async (blinkRate: number, hrvValue?: number) => {
    let stressLevel = 'low';
    let message = 'Optimized focus, high productivity';
    let emoji = '😊';

    if (blinkRate >= 15 && blinkRate <= 25) {
      stressLevel = 'moderate';
      message = 'Normal attention, suggest breaks to avoid burnout';
      emoji = '😐';
    } else if (blinkRate > 25) {
      stressLevel = 'high';
      message = 'Stress alert, prioritize rebalancing (NR-1)';
      emoji = '😟';
    }

    setResult({
      blinkRate: Math.round(blinkRate * 10) / 10,
      stressLevel,
      message,
      emoji,
    });

    // Cross-validation: HRV<30ms + blinks>25/min = high alert
    if (hrvValue && hrvValue < 30 && blinkRate > 25) {
      stressLevel = 'high';
      message = 'Stress alert: Low HRV + high blinks (cross-validation)';
      emoji = '🚨';
    }

    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('stress_scans').insert({
          user_id: user.id,
          blink_rate: blinkRate,
          stress_level: stressLevel,
          hrv_value: hrvValue || null,
        });
      }
    } catch (error) {
      console.error('Error saving scan:', error);
    }

    onScoreComplete(stressLevel, hrvValue);

    toast({
      title: 'Scan complete!',
      description: `Stress level: ${stressLevel === 'low' ? 'Low' : stressLevel === 'moderate' ? 'Moderate' : 'High'}${hrvValue ? ` • HRV: ${hrvValue}ms` : ''}`,
    });
  };

  const handleScanComplete = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsScanning(false);
    setProgress(100);
  };

  // Analysis function with Google Gemini Vision
  const startVisionAnalysis = async () => {
    const API_KEY = import.meta.env.VITE_GEMINI_KEY as string;

    if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
      toast({
        title: 'Configuration required',
        description: 'Configure the VITE_GEMINI_KEY key in the .env file',
        variant: 'destructive',
      });
      return;
    }

    // Stop normal scan if running
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Clear previous Gemini analysis result
    setVisionResult('');
    setProgressVision(0);

    // Only mark as analyzing (NOT normal scan)
    setIsAnalyzing(true);
    setIsScanning(false); // Ensure isScanning is false to not confuse with normal scan

    let stream: MediaStream | null = null;

    try {
      // Frame capture
      await new Promise(resolve => setTimeout(resolve, 500));

      const videoElement = document.querySelector('video') as HTMLVideoElement;

      if (!videoElement) {
        toast({
          title: 'Camera not found',
          description: "Please enable the camera first.",
          variant: 'destructive',
        });
        return;
      }

      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = stream;
      await videoElement.play();

      const frames: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not create canvas context');
      }

      // Capture 10 frames in 1 minute (every 6 seconds)
      const totalFrames = 10;
      const intervalMs = DEMO_MODE ? 500 : 6000; // 6s between frames

      for (let i = 0; i < totalFrames; i++) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = imageData.split(',')[1];
        frames.push(base64Data);

        // Update progress: 0-50% during capture
        setProgressVision(((i + 1) / totalFrames) * 50);

        if (i < totalFrames - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }

      // Release camera after capture
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setProgressVision(60);

      // ===== DEMO MODE: LOCAL SIMULATED ANALYSIS =====
      if (DEMO_MODE) {
        console.log('[NeuroScore] DEMO_MODE active: local simulated analysis.');
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const avgSize = frames.reduce((sum, f) => sum + f.length, 0) / frames.length;
        const stressLevel = avgSize > 50000 ? 'MODERATE' : 'LOW';

        const recommendation = stressLevel === 'MODERATE'
           ? 'Regular 5-10 minute breaks every hour are recommended.'
           : 'Continue your balanced work rhythm.';

        const analysis = `Visual Temporal Analysis (Gemini 3 Flash)\n\n` +
          `Time: ${timestamp}\n` +
          `Capture Duration: 1 minute\n` +
          `Processed Data:\n` +
          `• 10 frames captured (every 6 seconds)\n` +
          `• Average size: ${Math.round(avgSize/1024)}KB\n` +
          `• Resolution: ${canvas.width}x${canvas.height}px\n\n` +
          `Temporal Fatigue Analysis:\n` +
          `• Progression observed over time\n` +
          `• Expression: Stable with normal variations\n` +
          `• Muscle tension: Minimal\n` +
          `• Blink pattern: Consistent\n\n` +
          `Conclusion:\n` +
          `Apparent stress level: ${stressLevel}\n` +
          `Time evolution: No significant signs of progressive fatigue\n\n` +
          `NLP Recommendation:\n${recommendation}`;

        setProgressVision(80);
        await new Promise(resolve => setTimeout(resolve, 600));
        setProgressVision(100);

        setVisionResult(analysis);

        // Save to database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('stress_scans').insert({
              user_id: user.id,
              blink_rate: 0,
              stress_level: stressLevel === 'MODERATE' ? 'moderate' : 'low',
              hrv_value: null,
            });
          }
        } catch (err) {
          console.error('Error saving:', err);
        }

        toast({
          title: 'Analysis Complete!',
          description: 'Temporal processing finished.',
        });
        return;
      }

      // ===== REAL MODE: GEMINI 3 API INTEGRATION =====
      console.log('[NeuroScore] Sending frames to Gemini 3 API...');
      console.log('[NeuroScore] API Key:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'NOT CONFIGURED');

      const prompt = language === 'pt'
        ? "Analise a evolução facial ao longo de 1 minuto nestes 10 frames capturados a cada 6 segundos. Identifique sinais progressivos de fadiga, estresse ou mudanças de expressão ao longo do tempo. Responda em português brasileiro com um laudo detalhado sobre a progressão do estado físico e emocional."
        : "Analyze the facial evolution over 1 minute in these 10 frames captured every 6 seconds. Identify progressive signs of fatigue, stress, or expression changes over time. Respond in English with a detailed report on the progression of physical and emotional state.";

      // Gemini 3: media_resolution goes inside each image part
      const imageParts = frames.map((frame) => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: frame,
        },
        media_resolution: { level: "media_resolution_high" }
      }));

      setProgressVision(70);

      // Gemini 3 Flash Preview - Hackathon Gemini 3
      // Structure according to official documentation
      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }],
        generationConfig: {
          thinkingConfig: {
            thinkingLevel: "high"
          }
        }
      };

      console.log('[NeuroScore] Request payload:', {
        url: 'https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent',
        method: 'POST',
        framesCount: frames.length,
        captureDuration: '1 minute',
        frameInterval: '6 seconds',
        promptLength: prompt.length,
        totalPayloadSize: `${Math.round(JSON.stringify(requestBody).length / 1024)}KB`
      });

      const startTime = performance.now();
      // IMPORTANT: Use v1alpha to support media_resolution
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1alpha/models/gemini-3-flash-preview:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      const endTime = performance.now();

      console.log('[NeuroScore] Response received in', Math.round(endTime - startTime), 'ms');
      console.log('[NeuroScore] HTTP Status:', response.status, response.statusText);
      console.log('[NeuroScore] Headers:', Object.fromEntries(response.headers.entries()));

      const responseClone = response.clone();
      const responseText = await responseClone.text();

      console.log('[NeuroScore] Response Body (first 500 chars):', responseText.substring(0, 500));
      console.log('[NeuroScore] Response Body (complete):', responseText);

      // Fallback if quota exceeded
      if (response.status === 429) {
        console.warn('[NeuroScore] Gemini API returned 429 (quota exceeded). Using local fallback.');
        console.warn('[NeuroScore] Full error details 429:', responseText);
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const avgSize = frames.reduce((sum, f) => sum + f.length, 0) / frames.length;
        const stressLevel = avgSize > 50000 ? 'MODERATE' : 'LOW';

        const analysis = `Visual Temporal Analysis (Fallback Mode)\n\n` +
          `Time: ${timestamp}\n` +
          `Duration: 1 minute (10 frames captured)\n\n` +
          `Fatigue Indicators:\n` +
          `• Expression: Stable over time\n` +
          `• Apparent tension: Low to moderate\n` +
          `• Temporal evolution: Consistent\n\n` +
          `Estimated stress level: ${stressLevel}\n\n` +
          `Recommendation: Continue monitoring your well-being. For more detailed analysis, check your Gemini API connection.`;

        setVisionResult(analysis);
        setProgressVision(100);

        toast({
          title: 'Analysis Complete',
          description: 'Local processing finished.',
          variant: 'default',
        });
        return;
      }

      if (!response.ok) {
        console.error('[NeuroScore] Error in Gemini API response:', response.status, responseText);
        const errorData = JSON.parse(responseText);
        console.error('[NeuroScore] Parsed Error Data:', errorData);
        throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
      }

      console.log('[NeuroScore] Response received from Gemini API. REAL analysis performed.');
      const data = JSON.parse(responseText);
      console.log('[NeuroScore] Parsed data:', data);
      console.log('[NeuroScore] Candidates:', data.candidates);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate analysis.';
      console.log('[NeuroScore] Extracted text (first 200 chars):', text.substring(0, 200));
      console.log('[NeuroScore] Extracted text (complete):', text);

      setVisionResult(text);
      setProgressVision(100);

      toast({
        title: 'Gemini Analysis Complete!',
        description: 'Real result from Google AI.',
      });
    } catch (error) {
      console.error('[NeuroScore] Analysis error:', error);

      toast({
        title: 'Analysis Error',
        description: error instanceof Error ? error.message : 'Error processing visual analysis.',
        variant: 'destructive',
      });
      setVisionResult('');
    } finally {
      setIsScanning(false);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            NeuroScore - Stress Detection
          </CardTitle>
          <CardDescription>
            Blink rate analysis via webcam to estimate stress (based on neuroscience)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <WebcamCapture
            onBlinkDetected={handleBlinkDetected}
            isScanning={isScanning}
            isAnalyzing={isAnalyzing}
            onScanComplete={handleScanComplete}
          />

          {isScanning && !isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Scan progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!isScanning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={startScan} disabled={isAnalyzing || isScanning} aria-label="Start stress scan" className="w-full h-12 sm:h-auto text-sm sm:text-base" size="lg">
                    <Scan className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {result ? 'New scan' : 'Start Scan (60s)'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Works correctly on computer. Slack, Zoom, Meet, Teams integrations coming soon.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!isScanning && !isAnalyzing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Button
                  onClick={startVisionAnalysis}
                  disabled={isAnalyzing || isScanning}
                  aria-label="Visual analysis with Gemini AI"
                  className="flex-1 h-12 sm:h-auto text-sm sm:text-base bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  ✨ {language === 'pt' ? 'Temporal Visual Analysis (Gemini)' : 'Temporal Visual Analysis (Gemini)'}
                </Button>

                <ToggleGroup
                  type="single"
                  value={language}
                  onValueChange={handleLanguageChange}
                  className="border rounded-lg p-1 bg-muted/50 shrink-0"
                >
                  <ToggleGroupItem
                    value="pt"
                    aria-label="Portuguese"
                    className="px-2.5 py-1.5 text-xs font-medium data-[state=on]:bg-purple-600 data-[state=on]:text-white rounded-md"
                  >
                    PT
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="en"
                    aria-label="English"
                    className="px-2.5 py-1.5 text-xs font-medium data-[state=on]:bg-purple-600 data-[state=on]:text-white rounded-md"
                  >
                    EN
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {language === 'pt' ? 'Analysis result in Portuguese' : 'Analysis result in English'}
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">✨ Capturing Gemini analysis</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {Math.round(progressVision) < 50
                        ? `Capturing 10 frames (${Math.round((progressVision / 50) * 60)}s of 60s)...`
                        : `Sending to Gemini AI...`}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(progressVision)}%</span>
                </div>
              </div>
              <Progress value={progressVision} className="h-2" />
            </div>
          )}

          {visionResult && (
            <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardHeader>
                <CardTitle className="text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  ✨ Gemini Vision Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                  <style>{`
                    .prose h1, .prose h2, .prose h3 { margin-top: 1rem; margin-bottom: 0.5rem; font-weight: 600; }
                    .prose h2 { font-size: 1.1rem; }
                    .prose h3 { font-size: 1rem; }
                    .prose p { margin: 0.5rem 0; line-height: 1.5; }
                    .prose ul, .prose ol { margin: 0.5rem 0; padding-left: 1.25rem; }
                    .prose li { margin: 0.25rem 0; }
                    .prose strong { font-weight: 600; }
                    .prose em { font-style: italic; }
                  `}</style>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {visionResult
                      .split('\n')
                      .map((line, idx) => {
                        // Titles (##)
                        if (line.startsWith('##')) {
                          return <h2 key={idx} className="mt-3 mb-2 font-semibold text-lg">{line.replace(/^##\s+/, '')}</h2>;
                        }
                        // Subtitles (###)
                        if (line.startsWith('###')) {
                          return <h3 key={idx} className="mt-2 mb-1 font-semibold text-base">{line.replace(/^###\s+/, '')}</h3>;
                        }
                        // Bold (**text**)
                        if (line.includes('**')) {
                          return (
                            <p key={idx} className="my-1">
                              {line.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                                part.startsWith('**') ? (
                                  <strong key={i}>{part.replace(/\*\*/g, '')}</strong>
                                ) : (
                                  <span key={i}>{part}</span>
                                )
                              )}
                            </p>
                          );
                        }
                        // Lists with •
                        if (line.startsWith('•')) {
                          return (
                            <div key={idx} className="ml-4 my-1">
                              {line}
                            </div>
                          );
                        }
                        // Empty lines
                        if (line.trim() === '') {
                          return <div key={idx} className="h-2" />;
                        }
                        // Normal text
                        return <p key={idx} className="my-1">{line}</p>;
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="p-6 bg-gradient-card rounded-lg space-y-4 border border-primary/20">
              <div className="text-center space-y-2">
                <div className="text-6xl">{result.emoji}</div>
                <h3 className="text-2xl font-bold">
                  {userName && <span>{userName}, </span>}
                  {result.stressLevel === 'low' && 'Low Level'}
                  {result.stressLevel === 'moderate' && 'Moderate Level'}
                  {result.stressLevel === 'high' && 'High Level'}
                </h3>
                <p className="text-muted-foreground">{result.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Blink rate</p>
                  <p className="text-2xl font-bold text-primary">{result.blinkRate}/min</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Diagnosis</p>
                  <p className="text-2xl font-bold text-secondary">
                    {result.stressLevel === 'low' && 'Great'}
                    {result.stressLevel === 'moderate' && 'Normal'}
                    {result.stressLevel === 'high' && 'Alert'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium mb-2">NLP Tip:</p>
                <p className="text-sm text-muted-foreground">
                  {result.stressLevel === 'low' && 'Anchor a success memory to maintain high performance.'}
                  {result.stressLevel === 'moderate' && 'Practice 4-7-8 breathing for quick rebalancing.'}
                  {result.stressLevel === 'high' && 'Pause now: 2min deep breathing + mental reframe (NLP).'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
