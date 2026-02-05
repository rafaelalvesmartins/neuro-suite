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

      // Get scans from last 7 days (limit 100 for free tier)
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

        // Simple prediction based on patterns
        let predictionText = '';
        if (stats.highPercent > 30) {
          predictionText = `⚠️ High risk detected (${stats.highPercent}% high stress). Urgent interventions recommended.`;
        } else if (stats.moderatePercent > 50) {
          predictionText = `⚡ Attention: ${stats.moderatePercent}% at moderate stress. Suggest preventive breaks.`;
        } else {
          predictionText = `✅ Team is shining! ${stats.lowPercent}% at low stress. Continue wellness practices.`;
        }
        setPrediction(predictionText);
      }
    } catch (error) {
      console.error('Error loading HR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const csv = `Metric,Value
Low Stress (%),${stats.lowPercent}
Moderate Stress (%),${stats.moderatePercent}
High Stress (%),${stats.highPercent}
Total Scans,${stats.totalScans}
Average HRV (ms),${stats.avgHRV}
Prediction,"${prediction}"`;

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-dashboard-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const chartData = {
    labels: ['Low', 'Moderate', 'High'],
    datasets: [
      {
        label: '% Stress',
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
          <p className="text-muted-foreground">Loading HR data...</p>
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
            HR Dashboard - Well-Being Analysis (7 days)
          </CardTitle>
          <CardDescription>
            Aggregated anonymous data with RLS active • Limit 100 scans (free tier)
          </CardDescription>
          <Button onClick={exportCSV} variant="outline" size="sm" className="mt-3">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-xs text-muted-foreground mb-1">Low Stress</p>
              <p className="text-3xl font-bold text-green-500">{stats.lowPercent}%</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <p className="text-xs text-muted-foreground mb-1">Moderate</p>
              <p className="text-3xl font-bold text-yellow-500">{stats.moderatePercent}%</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="text-xs text-muted-foreground mb-1">High Stress</p>
              <p className="text-3xl font-bold text-red-500">{stats.highPercent}%</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-muted-foreground mb-1">Average HRV</p>
              <p className="text-3xl font-bold text-blue-500">{stats.avgHRV}<span className="text-sm">ms</span></p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                  title: {
                    display: true,
                    text: 'Stress Level Distribution',
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

          {/* Prediction */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm mb-1">Predictive Analysis (AI):</p>
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
                  <p className="font-semibold text-xs sm:text-sm mb-1">User Experience:</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">
                    Share your experience here to help us improve our platform
                  </p>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto font-semibold shadow-lg hover:scale-105 transition-transform text-xs sm:text-sm"
                    onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSe81DxmsG0amW42BCTsr2w2nplmT8uLsedNpNVCE-pC7HCj_g/viewform?usp=dialog', '_blank')}
                  >
                    Your Feedback Here
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-semibold mb-1">Metrics (last 7 days):</p>
            <p>• Total scans: {stats.totalScans}</p>
            <p>• Average HRV: {stats.avgHRV}ms {stats.avgHRV > 50 ? '(Good resilience)' : stats.avgHRV > 30 ? '(Normal)' : '(Attention needed)'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
