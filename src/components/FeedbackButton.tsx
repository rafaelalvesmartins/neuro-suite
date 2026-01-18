import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export default function FeedbackButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSe81DxmsG0amW42BCTsr2w2nplmT8uLsedNpNVCE-pC7HCj_g/viewform?usp=dialog', '_blank')}
      className="fixed bottom-4 right-4 z-40 shadow-lg hover:shadow-xl transition-all gap-2"
    >
      <MessageSquare className="h-4 w-4" />
      <span className="hidden sm:inline">Seu Feedback Aqui</span>
      <span className="sm:hidden">Feedback</span>
    </Button>
  );
}
