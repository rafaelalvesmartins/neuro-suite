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

  // Carregar nome do usuário
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
        console.error('Erro ao carregar nome:', error);
      }
    };

    loadUserName();
  }, []);

  // Carregar última conversa ou criar mensagem inicial
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
            return; // Encontrou conversa, não precisa criar mensagem inicial
          }
        }
      } catch (error) {
        console.error('Erro ao carregar conversa:', error);
      }
      
      // Se não encontrou conversa e não há mensagens, criar mensagem inicial
      if (messages.length === 0) {
        let initialMessage = '';
        
        if (stressLevel === 'low') {
          initialMessage = 'Ótimo foco! 😊 Qual expectativa de performance você quer elevar? Sugestão PNL: Ancore uma memória de sucesso para manter alta produtividade.';
        } else if (stressLevel === 'moderate') {
          initialMessage = 'Para reduzir turnover, o que drena sua energia? 😐 Reframe como oportunidade (PNL) para equilibrar bem-estar e performance.';
        } else {
          initialMessage = 'Alerta burnout (NR-1). 😟 Qual pausa sensorial (respiração 4-7-8) te recarrega? Vamos criar um plano de reequilíbrio imediato.';
        }

        setMessages([{ role: 'assistant', content: initialMessage }]);
      }
    };

    if (stressLevel) {
      loadOrCreateConversation();
    }
  }, [stressLevel]);

  // Auto-scroll para última mensagem
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
      // Preparar contexto com HRV se fornecido
      let context = `Nível de estresse detectado: ${stressLevel}. `;
      const hrvNum = parseFloat(hrvValue);
      if (!isNaN(hrvNum)) {
        context += `HRV (RMSSD): ${hrvNum}ms. `;
        if (hrvNum < 30) {
          context += 'HRV baixa valida estresse alto - priorize bem-estar. ';
        }
      }

      // Chamar edge function do coach
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

      // Salvar conversa no banco
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
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportPlan = () => {
    const planText = messages
      .map((msg) => `${msg.role === 'user' ? 'Você' : 'NeuroCoach'}: ${msg.content}`)
      .join('\n\n');

    const blob = new Blob([planText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plano-neurosuite.txt';
    a.click();

    toast({
      title: 'Plano exportado! 📄',
      description: 'Seu plano foi baixado com sucesso.',
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-secondary" />
            NeuroCoach - Agente IA Personalizado
          </CardTitle>
          <CardDescription>
            Coaching com PNL baseado no seu NeuroScore para alta performance e compliance NR-1
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!communicationTone && (
            <div className="p-4 bg-accent/10 rounded-lg border-2 border-accent/30 space-y-3">
              <h3 className="font-semibold text-accent">🎯 Escolha teu tom de comunicação:</h3>
              <p className="text-sm text-muted-foreground">
                Selecione como prefere que o NeuroCoach se comunique com você
              </p>
              <Select value={communicationTone} onValueChange={setCommunicationTone}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um tom..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">
                    🔬 Técnico/Acadêmico - Formal, científico com referências
                  </SelectItem>
                  <SelectItem value="casual">
                    😎 Descolado Dia-a-Dia - Papo amigo, casual e motivador
                  </SelectItem>
                  <SelectItem value="spiritual">
                    🧘 Toque Mestre Espiritual Pragmático - Inspiracional e guia interior
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {communicationTone && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="hrv" className="text-sm font-medium">
                  HRV da Pulseira (RMSSD em ms) - Opcional
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
                  Mudar Tom
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
                Valores &lt;30 validam estresse alto. Default: 40ms
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
                    NeuroCoach está pensando...
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
              placeholder="Descreva como se sente ou o que quer melhorar..."
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
              Exportar Plano Semanal
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}