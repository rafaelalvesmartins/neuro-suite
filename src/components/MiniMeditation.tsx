import { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MiniMeditationProps {
  trigger: boolean; // Activates when HRV < 30
}

export default function MiniMeditation({ trigger }: MiniMeditationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [countdown, setCountdown] = useState(4);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes
  const synth = window.speechSynthesis;

  useEffect(() => {
    if (trigger && !isPlaying) {
      speak('Hey, your HRV is low. Let\'s breathe together now to reset your nervous system and get back to peak energy!');
    }
  }, [trigger]);

  useEffect(() => {
    if (!isPlaying) return;

    const phaseTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Switch phase
          if (currentPhase === 'inhale') {
            speak('Hold');
            setCurrentPhase('hold');
            return 4;
          } else if (currentPhase === 'hold') {
            speak('Release');
            setCurrentPhase('exhale');
            return 6;
          } else {
            speak('Inhale');
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
          speak('Congratulations! You\'ve rebalanced your nervous system. Now it\'s time for high performance!');
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
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    synth.speak(utterance);
  };

  const togglePlay = () => {
    if (!isPlaying) {
      speak('Let\'s begin. Inhale deeply through your nose');
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
      case 'inhale': return 'Inhale deeply through your nose 👃';
      case 'hold': return 'Hold your breath 🫁';
      case 'exhale': return 'Release slowly through your mouth 😮‍💨';
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
          Mini-Meditation (3min)
        </CardTitle>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          Your HRV is low! Let's rebalance with voice-guided breathing
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
                Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 p-6">
            <p className="text-sm text-muted-foreground">
              4-4-6 Technique: Inhale 4s, hold 4s, exhale 6s
            </p>
            <p className="text-xs text-muted-foreground">
              Based on Dr. Andrew Huberman (Stanford) - Nervous system regulation through controlled breathing
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
              Pause Meditation
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Start Meditation (with voice)
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          The voice guide uses native browser Text-to-Speech (free)
        </p>
      </CardContent>
    </Card>
  );
}
