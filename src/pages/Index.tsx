import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Activity, MessageCircle, Trophy, Users, Zap, Target, Shield } from "lucide-react";
import neuroSuiteLogo from '@/assets/neurosuite-logo.jpg';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <img 
              src={neuroSuiteLogo} 
              alt="NeuroSuite Logo" 
              className="h-10 sm:h-12 md:h-14 w-auto object-contain"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:py-12 md:py-16 max-w-6xl">
        {/* Hero Banner */}
        <section className="text-center mb-12 sm:mb-16 md:mb-20 space-y-4 sm:space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight px-2">
            Vire o Jogo do Estresse em <span className="bg-gradient-hero bg-clip-text text-transparent">60 segundos! 🚀</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Webcam lê piscadas + HRV, IA coach te dá plano PNL pra alta performance. 
            <span className="font-semibold text-foreground"> Reduz turnover 30%, NR-1 compliant.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 sm:pt-6 px-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')}
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-elegant hover:shadow-glow transition-all w-full sm:w-auto"
            >
              Teste Grátis Agora 😊
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => document.getElementById('beneficios')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
            >
              Saiba Mais
            </Button>
          </div>
        </section>

        {/* Benefícios Section */}
        <section id="beneficios" className="mb-12 sm:mb-16 md:mb-20 px-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Como o NeuroSuite Transforma Seu Bem-Estar 💪
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Scan Webcam Inteligente</CardTitle>
                    <CardDescription className="mt-2">
                      Detecta piscadas + HRV sem pulseira usando tecnologia MIT. 
                      Análise precisa do seu nível de estresse em tempo real.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-secondary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Coach IA Personalizado</CardTitle>
                    <CardDescription className="mt-2">
                      "Ei, o que te trava?" – Respiração 4-7-8, PNL e técnicas de neurociência 
                      pra você alcançar pico de energia em minutos.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-accent/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Gamificação Envolvente</CardTitle>
                    <CardDescription className="mt-2">
                      Conquiste badges "Zen Master", mantenha streaks 🔥 diários e 
                      transforme bem-estar em hábito com recompensas motivadoras.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="border-success/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Dashboard RH Preditivo</CardTitle>
                    <CardDescription className="mt-2">
                      Predições de risco de burnout, métricas de bem-estar da equipe e 
                      insights acionáveis pra reduzir turnover e aumentar produtividade.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Depoimentos Section */}
        <section className="mb-12 sm:mb-16 md:mb-20 px-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            O Que Nossos Usuários Dizem 💬
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Mudou minha semana! O scan detectou meu estresse antes mesmo de eu perceber. 
                  O coach IA me deu ferramentas práticas que uso todo dia."
                </p>
                <p className="font-semibold">— João Silva</p>
                <p className="text-sm text-muted-foreground">Analista de RH, Tech Corp</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/5 to-accent/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Finalmente consigo gerenciar meu estresse de forma científica. 
                  Os badges me motivam a manter a consistência. ON FIRE! 🔥"
                </p>
                <p className="font-semibold">— Maria Oliveira</p>
                <p className="text-sm text-muted-foreground">Desenvolvedora, StartupXYZ</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-primary/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Dashboard RH transformou nossa gestão de bem-estar. Reduzimos 25% do absenteísmo 
                  em 3 meses com insights preditivos."
                </p>
                <p className="font-semibold">— Carlos Mendes</p>
                <p className="text-sm text-muted-foreground">Diretor de Pessoas, FinanceGroup</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-12 sm:mb-16 md:mb-20 p-6 sm:p-8 md:p-12 bg-gradient-hero rounded-xl sm:rounded-2xl shadow-elegant mx-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Bora Virar o Jogo? 🚀
          </h3>
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Teste grátis agora e descubra como neurociência + IA podem transformar 
            seu bem-estar e performance em minutos.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-soft w-full sm:w-auto"
          >
            Começar Agora - É Grátis! 😊
          </Button>
        </section>

        {/* Features Highlight */}
        <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20 px-4">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">Resultados em 60s</h4>
            <p className="text-sm text-muted-foreground">
              Scan rápido via webcam + análise instantânea do seu estado de estresse
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">Planos Personalizados</h4>
            <p className="text-sm text-muted-foreground">
              Coach IA cria estratégias sob medida com PNL e neurociência aplicada
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">NR-1 Compliant</h4>
            <p className="text-sm text-muted-foreground">
              Conformidade total com normas de gestão de riscos psicossociais
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-lg mb-4">Testou? Dê seu Feedback! 💭</h4>
              <p className="text-muted-foreground mb-4">
                Sua opinião é valiosa! Ajude-nos a evoluir o NeuroSuite compartilhando 
                sua experiência através do nosso formulário de feedback.
              </p>
              <Button 
                variant="outline"
                onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSe81DxmsG0amW42BCTsr2w2nplmT8uLsedNpNVCE-pC7HCj_g/viewform?usp=dialog', '_blank')}
              >
                Enviar Feedback
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Contato</h4>
              <p className="text-muted-foreground mb-2">
                Dúvidas ou quer saber mais sobre o NeuroSuite?
              </p>
              <p className="text-muted-foreground">
                📧 Email: contato@neurosuite.com.br
              </p>
              <p className="text-muted-foreground">
                📱 WhatsApp: (11) 99999-9999
              </p>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">
              NeuroSuite v1.0 (Beta) | Desenvolvido por Lincolnectd Neurobusiness
            </p>
            <p>
              Neurociência + IA para Wellness Corporativo | Dados protegidos por LGPD 🔒
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
