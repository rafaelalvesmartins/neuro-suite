import { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MiniMeditationProps {
  trigger: boolean; // Ativa quando HRV < 30
}

export default function MiniMeditation({ trigger }: MiniMeditationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutos
  const synth = window.speechSynthesis;

  useEffect(() => {
    if (trigger && !isPlaying) {
      speak('Ei, seu HRV tá baixo. Vamos respirar juntos agora pra resetar seu sistema nervoso e voltar ao pico de energia!');
    }
  }, [trigger]);

  useEffect(() => {
    if (!isPlaying) return;

    const phaseTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trocar fase
          if (currentPhase === 'inhale') {
            speak('Segure');
            setCurrentPhase('hold');
            return 4;
          } else if (currentPhase === 'hold') {
            speak('Solte o ar');
            setCurrentPhase('exhale');
            return 6;
          } else {
            speak('Inspire');
            setCurrentPhase('inhale');
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    const totalTimer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          speak('Parabéns! Você reequilibrou seu sistema nervoso. Agora é hora de alta performance!');
          return 180;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(phaseTimer);
      clearInterval(totalTimer);
    };
  }, [isPlaying, currentPhase]);

  const speak = (text: string) => {
    if (!synth) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      speak('Vamos começar. Inspire fundo pelo nariz');
      setCurrentPhase('inhale');
      setCountdown(4);
      setTimeRemaining(180);
    } else {
      synth.cancel();
    }
    setIsPlaying(!isPlaying);
  };

  const getPhaseText = () => {
    switch (currentPhase) {
      case 'inhale': return 'Inspire fundo pelo nariz 👃';
      case 'hold': return 'Segure o ar 🫁';
      case 'exhale': return 'Solte pela boca devagar 😮‍💨';
    }
  };

  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'inhale': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'hold': return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'exhale': return 'from-green-500/20 to-teal-500/20 border-green-500/30';
    }
  };

  if (!trigger) return null;

  return (
    <Card className="shadow-soft border-orange-500/30 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <Volume2 className="h-5 w-5" />
          🧘 Mini-Meditação (3min)
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Seu HRV tá baixo! Vamos reequilibrar com respiração guiada por voz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPlaying ? (
          <div className={`p-6 rounded-lg bg-gradient-to-br ${getPhaseColor()} border-2 transition-all duration-1000`}>
            <div className="text-center space-y-4">
              <p className="text-xl font-bold">{getPhaseText()}</p>
              <div className="text-6xl font-bold text-primary animate-pulse">
                {countdown}
              </div>
              <p className="text-sm text-muted-foreground">
                Tempo restante: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              Técnica 4-4-6: Inspire 4s, segure 4s, expire 6s
            </p>
            <p className="text-xs text-muted-foreground">
              💡 Baseado em Dr. Andrew Huberman (Stanford) - Regulação do sistema nervoso via respiração controlada
            </p>
          </div>
        )}

        <Button
          onClick={togglePlay}
          className="w-full"
          size="lg"
          variant={isPlaying ? 'secondary' : 'default'}
        >
          {isPlaying ? (
            <>
              <Pause className="mr-2 h-5 w-5" />
              Pausar Meditação
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Iniciar Meditação (com voz)
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          A voz guiada usa Text-to-Speech nativo do browser (gratuito)
        </p>
      </CardContent>
    </Card>
  );
}
