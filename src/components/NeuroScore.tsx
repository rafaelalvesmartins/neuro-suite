import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Scan, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import WebcamCapture from './WebcamCapture';

interface NeuroScoreProps {
  onScoreComplete: (stressLevel: string, hrvValue?: number) => void;
}

export default function NeuroScore({ onScoreComplete }: NeuroScoreProps) {
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
    setIsScanning(true);
    setProgress(0);
    // NÃO limpar resultado - mantém última leitura visível

    // Simular progresso
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
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
    setIsScanning(false);
    setProgress(100);
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
            onScanComplete={handleScanComplete}
          />

          {isScanning && (
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
                  <Button onClick={startScan} className="w-full h-12 sm:h-auto text-sm sm:text-base" size="lg">
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