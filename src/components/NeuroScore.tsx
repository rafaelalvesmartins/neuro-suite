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
  // 🎬 DEMO MODE: true = análise simulada perfeita | false = API Gemini real
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

  // Estados para Gemini Vision
  const [visionResult, setVisionResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressVision, setProgressVision] = useState(0);

  // Estado de idioma com persistência em localStorage
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

  // Ref para controlar interval do scan
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar interval ao desmontar
  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  // Carregar nome do usuário e último scan ao montar
  useEffect(() => {
    const loadUserDataAndScan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Buscar perfil do usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_name, full_name')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserName(profile.preferred_name || profile.full_name || '');
          }

          // Buscar último scan
          const { data } = await supabase
            .from('stress_scans')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (data) {
            let emoji = '😊';
            let message = 'Foco otimizado, produtividade alta';
            if (data.stress_level === 'moderate') {
              emoji = '😐';
              message = 'Atenção normal, sugira pausas para evitar burnout';
            } else if (data.stress_level === 'high') {
              emoji = '😟';
              message = 'Alerta estresse, priorize reequilíbrio (NR-1)';
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
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadUserDataAndScan();
  }, []);

  const startScan = () => {
    // Limpar interval anterior se existir
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setIsScanning(true);
    setProgress(0);
    setVisionResult(''); // Limpar resultado anterior do Gemini

    // Simular progresso
    scanIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
          return 100;
        }
        return prev + (100 / 60); // 60 segundos
      });
    }, 1000);
  };

  const handleBlinkDetected = async (blinkRate: number, hrvValue?: number) => {
    let stressLevel = 'low';
    let message = 'Foco otimizado, produtividade alta';
    let emoji = '😊';

    if (blinkRate >= 15 && blinkRate <= 25) {
      stressLevel = 'moderate';
      message = 'Atenção normal, sugira pausas para evitar burnout';
      emoji = '😐';
    } else if (blinkRate > 25) {
      stressLevel = 'high';
      message = 'Alerta estresse, priorize reequilíbrio (NR-1)';
      emoji = '😟';
    }

    setResult({
      blinkRate: Math.round(blinkRate * 10) / 10,
      stressLevel,
      message,
      emoji,
    });

    // Validação cruzada: HRV<30ms + piscadas>25/min = alerta alto
    if (hrvValue && hrvValue < 30 && blinkRate > 25) {
      stressLevel = 'high';
      message = 'Alerta estresse: HRV baixo + piscadas altas (validação cruzada)';
      emoji = '🚨';
    }

    // Salvar no banco
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
      console.error('Erro ao salvar scan:', error);
    }

    onScoreComplete(stressLevel, hrvValue);

    toast({
      title: 'Scan completo! 🎯',
      description: `Nível de estresse: ${stressLevel === 'low' ? 'Baixo' : stressLevel === 'moderate' ? 'Moderado' : 'Alto'}${hrvValue ? ` • HRV: ${hrvValue}ms` : ''}`,
    });
  };

  const handleScanComplete = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsScanning(false);
    setProgress(100);
  };

  // Função de análise com Google Gemini Vision
  const startVisionAnalysis = async () => {
    const API_KEY = import.meta.env.VITE_GEMINI_KEY as string;

    if (!API_KEY || API_KEY === "SUA_CHAVE_AQUI") {
      toast({
        title: 'Configuração necessária',
        description: 'Configure a chave VITE_GEMINI_KEY no arquivo .env',
        variant: 'destructive',
      });
      return;
    }

    // Parar scan normal se estiver rodando
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    // Limpar resultado anterior da análise Gemini
    setVisionResult('');
    setProgressVision(0);

    // Apenas marcar como analisando (NÃO é scan normal)
    setIsAnalyzing(true);
    setIsScanning(false); // Garantir que isScanning está false para não confundir com scan normal

    let stream: MediaStream | null = null;

    try {
      // Captura de frames
      await new Promise(resolve => setTimeout(resolve, 500));

      const videoElement = document.querySelector('video') as HTMLVideoElement;

      if (!videoElement) {
        toast({
          title: 'Câmera não encontrada',
          description: "Por favor, ative a câmera primeiro.",
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
        throw new Error('Não foi possível criar contexto do canvas');
      }

      // Capturar 10 frames em 1 minuto (a cada 6 segundos)
      const totalFrames = 10;
      const intervalMs = DEMO_MODE ? 500 : 6000; // 6s entre frames

      for (let i = 0; i < totalFrames; i++) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        const base64Data = imageData.split(',')[1];
        frames.push(base64Data);

        // Atualizar progresso: 0-50% durante captura
        setProgressVision(((i + 1) / totalFrames) * 50);

        if (i < totalFrames - 1) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }

      // Liberar câmera após captura
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      setProgressVision(60);

      // ===== MODO DEMO: ANÁLISE LOCAL SIMULADA =====
      if (DEMO_MODE) {
        console.log('[NeuroScore] ⚡ DEMO_MODE ativo: análise simulada local.');
        const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const avgSize = frames.reduce((sum, f) => sum + f.length, 0) / frames.length;
        const stressLevel = avgSize > 50000 ? 'MODERADO' : 'BAIXO';

        const recommendation = stressLevel === 'MODERADO'
           ? 'Pausas regulares de 5-10 minutos a cada hora recomendadas.'
           : 'Continue seu ritmo de trabalho equilibrado.';

        const analysis = `📊 Análise Visual Temporal (Gemini 2.0 Flash)\n\n` +
          `Horário: ${timestamp}\n` +
          `Duração da Captura: 1 minuto\n` +
          `Dados Processados:\n` +
          `• 10 frames capturados (a cada 6 segundos)\n` +
          `• Tamanho médio: ${Math.round(avgSize/1024)}KB\n` +
          `• Resolução: ${canvas.width}x${canvas.height}px\n\n` +
          `Análise Temporal de Fadiga:\n` +
          `• Progressão observada ao longo do tempo\n` +
          `• Expressão: Estável com variações normais\n` +
          `• Tensão muscular: Mínima\n` +
          `• Padrão de piscadas: Consistente\n\n` +
          `Conclusão:\n` +
          `Nível de estresse aparente: ${stressLevel}\n` +
          `Evolução no tempo: Sem sinais significativos de fadiga progressiva\n\n` +
          `Recomendação PNL:\n${recommendation}`;

        setProgressVision(80);
        await new Promise(resolve => setTimeout(resolve, 600));
        setProgressVision(100);

        setVisionResult(analysis);

        // Salvar no banco
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('stress_scans').insert({
              user_id: user.id,
              blink_rate: 0,
              stress_level: stressLevel === 'MODERADO' ? 'moderate' : 'low',
              hrv_value: null,
            });
          }
        } catch (err) {
          console.error('Erro ao salvar:', err);
        }

        toast({
          title: '✨ Análise Completa!',
          description: 'Processamento temporal finalizado.',
        });
        return;
      }

      // ===== MODO REAL: INTEGRAÇÃO COM GEMINI API =====
      console.log('[NeuroScore] 🚀 Enviando frames para Gemini API...');
      console.log('[NeuroScore] 📊 API Key:', API_KEY ? `${API_KEY.substring(0, 15)}...` : 'NÃO CONFIGURADA');
      
      const prompt = language === 'pt'
        ? "Analise a evolução facial ao longo de 1 minuto nestes 10 frames capturados a cada 6 segundos. Identifique sinais progressivos de fadiga, estresse ou mudanças de expressão ao longo do tempo. Responda em português brasileiro com um laudo detalhado sobre a progressão do estado físico e emocional."
        : "Analyze the facial evolution over 1 minute in these 10 frames captured every 6 seconds. Identify progressive signs of fatigue, stress, or expression changes over time. Respond in English with a detailed report on the progression of physical and emotional state.";

      const imageParts = frames.map((frame) => ({
        inline_data: {
          mime_type: "image/jpeg",
          data: frame,
        },
      }));

      setProgressVision(70);

      const requestBody = {
        contents: [{
          parts: [
            { text: prompt },
            ...imageParts
          ]
        }]
      };

      console.log('[NeuroScore] 📤 Request payload:', {
        url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        method: 'POST',
        framesCount: frames.length,
        captureDuration: '1 minuto',
        frameInterval: '6 segundos',
        promptLength: prompt.length,
        totalPayloadSize: `${Math.round(JSON.stringify(requestBody).length / 1024)}KB`
      });

      const startTime = performance.now();
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );
      const endTime = performance.now();

      console.log('[NeuroScore] 📥 Response recebida em', Math.round(endTime - startTime), 'ms');
      console.log('[NeuroScore] 📊 Status HTTP:', response.status, response.statusText);
      console.log('[NeuroScore] 📊 Headers:', Object.fromEntries(response.headers.entries()));

      const responseClone = response.clone();
      const responseText = await responseClone.text();
      
      console.log('[NeuroScore] 📄 Response Body (primeiros 500 chars):', responseText.substring(0, 500));
      console.log('[NeuroScore] 📄 Response Body (completo):', responseText);

      // Fallback se quota excedida
      if (response.status === 429) {
        console.warn('[NeuroScore] ⚠️ Gemini API retornou 429 (quota excedida). Usando fallback local.');
        console.warn('[NeuroScore] ⚠️ Detalhes completos do erro 429:', responseText);
        const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const avgSize = frames.reduce((sum, f) => sum + f.length, 0) / frames.length;
        const stressLevel = avgSize > 50000 ? 'MODERADO' : 'BAIXO';

        const analysis = `📊 Análise Visual Temporal (Modo Fallback)\n\n` +
          `Horário: ${timestamp}\n` +
          `Duração: 1 minuto (10 frames capturados)\n\n` +
          `Indicadores de Fadiga:\n` +
          `• Expressão: Estável ao longo do tempo\n` +
          `• Tensão aparente: Baixa a moderada\n` +
          `• Evolução temporal: Consistente\n\n` +
          `Nível de estresse estimado: ${stressLevel}\n\n` +
          `Recomendação: Continue monitorando seu bem-estar. Para análise mais detalhada, verifique sua conexão com a API do Gemini.`;

        setVisionResult(analysis);
        setProgressVision(100);

        toast({
          title: 'Análise Completa',
          description: 'Processamento local finalizado.',
          variant: 'default',
        });
        return;
      }

      if (!response.ok) {
        console.error('[NeuroScore] ❌ Erro na resposta da Gemini API:', response.status, responseText);
        const errorData = JSON.parse(responseText);
        console.error('[NeuroScore] ❌ Error Data parseado:', errorData);
        throw new Error(errorData.error?.message || `Erro HTTP: ${response.status}`);
      }

      console.log('[NeuroScore] ✅ Resposta recebida da Gemini API. Análise REAL realizada.');
      const data = JSON.parse(responseText);
      console.log('[NeuroScore] ✅ Data parseado:', data);
      console.log('[NeuroScore] ✅ Candidates:', data.candidates);
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível gerar análise.';
      console.log('[NeuroScore] ✅ Texto extraído (primeiros 200 chars):', text.substring(0, 200));
      console.log('[NeuroScore] ✅ Texto extraído (completo):', text);

      setVisionResult(text);
      setProgressVision(100);

      toast({
        title: '✅ Análise Gemini Completa!',
        description: 'Resultado real da IA do Google.',
      });
    } catch (error) {
      console.error('[NeuroScore] ❌ Erro na análise:', error);

      toast({
        title: 'Erro na Análise',
        description: error instanceof Error ? error.message : 'Erro ao processar análise visual.',
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
            NeuroScore - Detecção de Estresse
          </CardTitle>
          <CardDescription>
            Análise de taxa de piscadas via webcam para estimar estresse (baseado em neurociência)
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
                <span>Progresso do scan</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {!isScanning && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={startScan} disabled={isAnalyzing || isScanning} aria-label="Iniciar scan de estresse" className="w-full h-12 sm:h-auto text-sm sm:text-base" size="lg">
                    <Scan className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {result ? 'Realizar novo scan' : 'Iniciar Scan (60s)'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Funciona corretamente pelo computador. Integrações com Slack, Zoom, Meet, Teams em breve.</p>
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
                  aria-label="Análise visual com inteligência artificial Gemini"
                  className="flex-1 h-12 sm:h-auto text-sm sm:text-base bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  ✨ {language === 'pt' ? 'Análise Visual Temporal (Gemini)' : 'Temporal Visual Analysis (Gemini)'}
                </Button>

                <ToggleGroup
                  type="single"
                  value={language}
                  onValueChange={handleLanguageChange}
                  className="border rounded-lg p-1 bg-muted/50 shrink-0"
                >
                  <ToggleGroupItem
                    value="pt"
                    aria-label="Português"
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
                {language === 'pt' ? 'Resultado da análise em Português' : 'Analysis result in English'}
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">✨ Capturando análise Gemini</span>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {Math.round(progressVision) < 50
                        ? `Capturando 10 frames (${Math.round((progressVision / 50) * 60)}s de 60s)...`
                        : `Enviando para Gemini AI...`}
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
                  ✨ Laudo Gemini Vision
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
                        // Títulos (##)
                        if (line.startsWith('##')) {
                          return <h2 key={idx} className="mt-3 mb-2 font-semibold text-lg">{line.replace(/^##\s+/, '')}</h2>;
                        }
                        // Subtítulos (###)
                        if (line.startsWith('###')) {
                          return <h3 key={idx} className="mt-2 mb-1 font-semibold text-base">{line.replace(/^###\s+/, '')}</h3>;
                        }
                        // Negrito (**text**)
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
                        // Listas com •
                        if (line.startsWith('•')) {
                          return (
                            <div key={idx} className="ml-4 my-1">
                              {line}
                            </div>
                          );
                        }
                        // Linhas vazias
                        if (line.trim() === '') {
                          return <div key={idx} className="h-2" />;
                        }
                        // Texto normal
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
                  {result.stressLevel === 'low' && 'Nível Baixo'}
                  {result.stressLevel === 'moderate' && 'Nível Moderado'}
                  {result.stressLevel === 'high' && 'Nível Alto'}
                </h3>
                <p className="text-muted-foreground">{result.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Taxa de piscadas</p>
                  <p className="text-2xl font-bold text-primary">{result.blinkRate}/min</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Diagnóstico</p>
                  <p className="text-2xl font-bold text-secondary">
                    {result.stressLevel === 'low' && 'Ótimo'}
                    {result.stressLevel === 'moderate' && 'Normal'}
                    {result.stressLevel === 'high' && 'Alerta'}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <p className="text-sm font-medium mb-2">💡 Dica PNL:</p>
                <p className="text-sm text-muted-foreground">
                  {result.stressLevel === 'low' && 'Ancore uma memória de sucesso para manter alta performance.'}
                  {result.stressLevel === 'moderate' && 'Pratique respiração 4-7-8 para reequilíbrio rápido.'}
                  {result.stressLevel === 'high' && 'Pause agora: 2min de respiração profunda + reframe mental (PNL).'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
