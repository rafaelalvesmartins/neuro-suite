import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, Send, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface NeuroCoachProps {
  stressLevel: string;
}

export default function NeuroCoach({ stressLevel }: NeuroCoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hrvValue, setHrvValue] = useState('40');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [communicationTone, setCommunicationTone] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load user name
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_name, full_name')
            .eq('id', user.id)
            .single();

          if (profile) {
            setUserName(profile.preferred_name || profile.full_name || '');
          }
        }
      } catch (error) {
        console.error('Error loading name:', error);
      }
    };

    loadUserName();
  }, []);

  // Load last conversation or create initial message
  useEffect(() => {
    const loadOrCreateConversation = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('coach_conversations')
            .select('*')
            .eq('user_id', user.id)
            .eq('stress_level', stressLevel)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (data && data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages as unknown as Message[]);
            setConversationId(data.id);
            return; // Found conversation, no need to create initial message
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }

      // If no conversation found and no messages, create initial message
      if (messages.length === 0) {
        let initialMessage = '';

        if (stressLevel === 'low') {
          initialMessage = 'Great focus! What performance expectation do you want to elevate? NLP suggestion: Anchor a success memory to maintain high productivity.';
        } else if (stressLevel === 'moderate') {
          initialMessage = 'To reduce turnover, what drains your energy? Reframe it as an opportunity (NLP) to balance well-being and performance.';
        } else {
          initialMessage = 'Burnout alert (NR-1). What sensory break (4-7-8 breathing) recharges you? Let\'s create an immediate rebalancing plan.';
        }

        setMessages([{ role: 'assistant', content: initialMessage }]);
      }
    };

    if (stressLevel) {
      loadOrCreateConversation();
    }
  }, [stressLevel]);

  // Auto-scroll to last message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare context with HRV if provided
      let context = `Detected stress level: ${stressLevel}. `;
      const hrvNum = parseFloat(hrvValue);
      if (!isNaN(hrvNum)) {
        context += `HRV (RMSSD): ${hrvNum}ms. `;
        if (hrvNum < 30) {
          context += 'Low HRV validates high stress - prioritize well-being. ';
        }
      }

      // Call coach edge function
      const { data, error } = await supabase.functions.invoke('neuro-coach', {
        body: {
          messages: [...messages, userMessage],
          stressLevel,
          context,
          userName,
          communicationTone,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Save conversation to database
      const allMessages = [...messages, userMessage, assistantMessage];

      if (conversationId) {
        await supabase
          .from('coach_conversations')
          .update({
            messages: allMessages as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newConv } = await supabase
            .from('coach_conversations')
            .insert([{
              user_id: user.id,
              stress_level: stressLevel,
              messages: allMessages as any,
            }])
            .select()
            .single();

          if (newConv) {
            setConversationId(newConv.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportPlan = () => {
    const planText = messages
      .map((msg) => `${msg.role === 'user' ? 'You' : 'NeuroCoach'}: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neurosuite-plan.txt';
    a.click();

    toast({
      title: 'Plan exported!',
      description: 'Your plan has been downloaded successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-secondary" />
            NeuroCoach - Personalized AI Agent
          </CardTitle>
          <CardDescription>
            Coaching with NLP based on your NeuroScore for high performance and NR-1 compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!communicationTone && (
            <div className="p-4 bg-accent/10 rounded-lg border-2 border-accent/30 space-y-3">
              <h3 className="font-semibold text-accent">Choose your communication tone:</h3>
              <p className="text-sm text-muted-foreground">
                Select how you prefer NeuroCoach to communicate with you
              </p>
              <Select value={communicationTone} onValueChange={setCommunicationTone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a tone..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">
                    Technical/Academic - Formal, scientific with references
                  </SelectItem>
                  <SelectItem value="casual">
                    Casual Everyday - Friendly chat, casual and motivating
                  </SelectItem>
                  <SelectItem value="spiritual">
                    Pragmatic Spiritual Master - Inspirational and inner guide
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {communicationTone && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="hrv" className="text-sm font-medium">
                  Wristband HRV (RMSSD in ms) - Optional
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCommunicationTone('');
                    setMessages([]);
                    setConversationId(null);
                  }}
                  className="text-xs"
                >
                  Change Tone
                </Button>
              </div>
              <Input
                id="hrv"
                type="number"
                placeholder="40"
                value={hrvValue}
                onChange={(e) => setHrvValue(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Values &lt;30 validate high stress. Default: 40ms
              </p>
            </div>
          )}

          {communicationTone && (
            <div className="h-[60vh] max-h-[400px] overflow-y-auto space-y-3 sm:space-y-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
              {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] p-2.5 sm:p-3 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border shadow-soft'
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-3 rounded-lg bg-card border shadow-soft">
                  <p className="text-sm text-muted-foreground animate-pulse">
                    NeuroCoach is thinking...
                  </p>
                </div>
              </div>
            )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {communicationTone && (
            <div className="flex gap-2">
            <Textarea
              placeholder="Describe how you feel or what you want to improve..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm"
            />
              <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon" className="h-10 w-10 sm:h-12 sm:w-12">
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          )}

          {communicationTone && messages.length > 2 && (
            <Button onClick={exportPlan} variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Export Weekly Plan
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
