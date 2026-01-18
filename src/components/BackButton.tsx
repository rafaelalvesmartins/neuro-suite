import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => window.location.href = 'https://neurosuite.com.br'}
      className="fixed top-4 left-4 z-40 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline">Voltar</span>
    </Button>
  );
}
