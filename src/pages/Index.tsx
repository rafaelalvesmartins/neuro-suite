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
            Turn the Stress Game Around in <span className="bg-gradient-hero bg-clip-text text-transparent">60 seconds!</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Webcam reads blinks + HRV, AI coach gives you a NLP plan for high performance.
            <span className="font-semibold text-foreground"> Reduces turnover 30%, NR-1 compliant.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4 sm:pt-6 px-4">
            <Button
              size="lg"
              onClick={() => navigate('/auth')}
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-elegant hover:shadow-glow transition-all w-full sm:w-auto"
            >
              Try Free Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>
        </section>

        {/* Benefits Section */}
        <section id="benefits" className="mb-12 sm:mb-16 md:mb-20 px-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            How NeuroSuite Transforms Your Well-Being
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-primary/20 hover:shadow-elegant transition-all">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-hero rounded-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Smart Webcam Scan</CardTitle>
                    <CardDescription className="mt-2">
                      Detects blinks + HRV without a wristband using MIT technology.
                      Accurate real-time stress level analysis.
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
                    <CardTitle>Personalized AI Coach</CardTitle>
                    <CardDescription className="mt-2">
                      "Hey, what's holding you back?" – 4-7-8 breathing, NLP and neuroscience techniques
                      to help you reach peak energy in minutes.
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
                    <CardTitle>Engaging Gamification</CardTitle>
                    <CardDescription className="mt-2">
                      Earn "Zen Master" badges, maintain daily streaks and
                      turn well-being into a habit with motivating rewards.
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
                    <CardTitle>Predictive HR Dashboard</CardTitle>
                    <CardDescription className="mt-2">
                      Burnout risk predictions, team well-being metrics and
                      actionable insights to reduce turnover and increase productivity.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="mb-12 sm:mb-16 md:mb-20 px-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            What Our Users Say
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Changed my week! The scan detected my stress before I even noticed.
                  The AI coach gave me practical tools I use every day."
                </p>
                <p className="font-semibold">— John Smith</p>
                <p className="text-sm text-muted-foreground">HR Analyst, Tech Corp</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-secondary/5 to-accent/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "Finally able to manage my stress scientifically.
                  The badges motivate me to stay consistent. ON FIRE!"
                </p>
                <p className="font-semibold">— Mary Johnson</p>
                <p className="text-sm text-muted-foreground">Developer, StartupXYZ</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-primary/5">
              <CardContent className="pt-6">
                <p className="text-muted-foreground italic mb-4">
                  "HR Dashboard transformed our wellness management. We reduced absenteeism by 25%
                  in 3 months with predictive insights."
                </p>
                <p className="font-semibold">— Carlos Mendes</p>
                <p className="text-sm text-muted-foreground">People Director, FinanceGroup</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-12 sm:mb-16 md:mb-20 p-6 sm:p-8 md:p-12 bg-gradient-hero rounded-xl sm:rounded-2xl shadow-elegant mx-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
            Ready to Turn the Game?
          </h3>
          <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Try free now and discover how neuroscience + AI can transform
            your well-being and performance in minutes.
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate('/auth')}
            className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-soft w-full sm:w-auto"
          >
            Start Now - It's Free!
          </Button>
        </section>

        {/* Features Highlight */}
        <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16 md:mb-20 px-4">
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">Results in 60s</h4>
            <p className="text-sm text-muted-foreground">
              Quick webcam scan + instant analysis of your stress state
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Target className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">Personalized Plans</h4>
            <p className="text-sm text-muted-foreground">
              AI Coach creates custom strategies with NLP and applied neuroscience
            </p>
          </div>

          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h4 className="font-semibold text-lg">NR-1 Compliant</h4>
            <p className="text-sm text-muted-foreground">
              Full compliance with psychosocial risk management standards
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-lg mb-4">Tested it? Give us Feedback!</h4>
              <p className="text-muted-foreground mb-4">
                Your opinion is valuable! Help us improve NeuroSuite by sharing
                your experience through our feedback form.
              </p>
              <Button
                variant="outline"
                onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSe81DxmsG0amW42BCTsr2w2nplmT8uLsedNpNVCE-pC7HCj_g/viewform?usp=dialog', '_blank')}
              >
                Send Feedback
              </Button>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Contact</h4>
              <p className="text-muted-foreground mb-2">
                Questions or want to learn more about NeuroSuite?
              </p>
              <p className="text-muted-foreground">
                Email: contact@neurosuite.com
              </p>
              <p className="text-muted-foreground">
                WhatsApp: +1 (555) 123-4567
              </p>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p className="mb-2">
              NeuroSuite v1.0 (Beta) | Developed by Lincolnectd Neurobusiness
            </p>
            <p>
              Neuroscience + AI for Corporate Wellness | Data protected by GDPR
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
