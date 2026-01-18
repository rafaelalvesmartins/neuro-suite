import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Download, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardRH() {
  const [stats, setStats] = useState({
    lowPercent: 0,
    moderatePercent: 0,
    highPercent: 0,
    totalScans: 0,
    avgHRV: 0,
  });
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRHData();
  }, []);

  const loadRHData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar scans dos últimos 7 dias (limite 100 para free tier)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: scans, error } = await supabase
        .from('stress_scans')
        .select('stress_level, hrv_value')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (scans && scans.length > 0) {
        const total = scans.length;
        const low = scans.filter(s => s.stress_level === 'low').length;
        const moderate = scans.filter(s => s.stress_level === 'moderate').length;
        const high = scans.filter(s => s.stress_level === 'high').length;

        const hrvValues = scans.filter(s => s.hrv_value).map(s => Number(s.hrv_value));
        const avgHRV = hrvValues.length > 0
          ? hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length
          : 0;

        setStats({
          lowPercent: Math.round((low / total) * 100),
          moderatePercent: Math.round((moderate / total) * 100),
          highPercent: Math.round((high / total) * 100),
          totalScans: total,
          avgHRV: Math.round(avgHRV),
        });

        // Predição simples baseada em padrões
        let predictionText = '';
        if (stats.highPercent > 30) {
          predictionText = `⚠️ Risco alto detectado (${stats.highPercent}% estresse alto). Intervenções urgentes recomendadas.`;
        } else if (stats.moderatePercent > 50) {
          predictionText = `⚡ Atenção: ${stats.moderatePercent}% em estresse moderado. Sugira pausas preventivas.`;
        } else {
          predictionText = `✅ Time tá brilhando! ${stats.lowPercent}% em baixo estresse. Continue com práticas de bem-estar.`;
        }
        setPrediction(predictionText);
      }
    } catch (error) {
      console.error('Erro ao carregar dados RH:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = `Métrica,Valor
Estresse Baixo (%),${stats.lowPercent}
Estresse Moderado (%),${stats.moderatePercent}
Estresse Alto (%),${stats.highPercent}
Total de Scans,${stats.totalScans}
HRV Médio (ms),${stats.avgHRV}
Predição,"${prediction}"`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-rh-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const chartData = {
    labels: ['Baixo', 'Moderado', 'Alto'],
    datasets: [
      {
        label: '% de Estresse',
        data: [stats.lowPercent, stats.moderatePercent, stats.highPercent],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(234, 179, 8, 0.6)',
          'rgba(239, 68, 68, 0.6)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados RH...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-soft border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            Dashboard RH - Análise de Bem-Estar (7 dias)
          </CardTitle>
          <CardDescription>
            Dados agregados anônimos com RLS ativo • Limite 100 scans (free tier)
          </CardDescription>
          <Button onClick={exportCSV} variant="outline" size="sm" className="mt-3">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Baixo Estresse</p>
              <p className="text-3xl font-bold text-green-500">{stats.lowPercent}%</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Moderado</p>
              <p className="text-3xl font-bold text-yellow-500">{stats.moderatePercent}%</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">Alto Estresse</p>
              <p className="text-3xl font-bold text-red-500">{stats.highPercent}%</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">HRV Médio</p>
              <p className="text-3xl font-bold text-blue-500">{stats.avgHRV}<span className="text-sm">ms</span></p>
            </div>
          </div>

          {/* Gráfico */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: 'Distribuição de Níveis de Estresse',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value) => value + '%',
                    },
                  },
                },
              }}
            />
          </div>

          {/* Predição */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">🤖 Análise Preditiva (IA):</p>
                  <p className="text-sm text-muted-foreground">{prediction}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Survey */}
          <Card className="bg-gradient-to-r from-green-500/10 to-teal-500/10 border-green-500/30">
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex items-start gap-2 sm:gap-3">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs sm:text-sm mb-1">📋 Experiência do Usuário:</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                    Compartilhe sua experiência aqui para melhorarmos nossa plataforma
                  </p>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto font-semibold shadow-lg hover:scale-105 transition-transform text-xs sm:text-sm"
                    onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSe81DxmsG0amW42BCTsr2w2nplmT8uLsedNpNVCE-pC7HCj_g/viewform?usp=dialog', '_blank')}
                  >
                    Seu Feedback Aqui
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Métricas */}
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">📊 Métricas (últimos 7 dias):</p>
            <p>• Total de scans: {stats.totalScans}</p>
            <p>• HRV médio: {stats.avgHRV}ms {stats.avgHRV > 50 ? '(Boa resiliência)' : stats.avgHRV > 30 ? '(Normal)' : '(Atenção necessária)'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
