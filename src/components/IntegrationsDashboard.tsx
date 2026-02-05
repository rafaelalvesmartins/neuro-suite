import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Video, MessageSquare, Users, Clock, AlertTriangle,
  TrendingUp, Brain, Target, Zap, RefreshCw, Send,
  CheckCircle2, XCircle, Loader2, Calendar, ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UpcomingMeeting {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink?: string;
  attendees: number;
}

interface IntegrationStatus {
  connected: boolean;
  status: 'online' | 'away' | 'busy' | 'offline';
  meetingTime: number;
  messagesCount: number;
  lastSync: string;
  accessToken?: string;
  upcomingMeetings?: UpcomingMeeting[];
  isReal?: boolean;
}

interface MeetingCheckIn {
  type: 'pre' | 'post';
  purpose: string;
  objectives: string;
  expectations: string;
  feedback?: string;
}

export default function IntegrationsDashboard() {
  const { toast } = useToast();
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [checkInType, setCheckInType] = useState<'pre' | 'post'>('pre');
  const [checkInData, setCheckInData] = useState<MeetingCheckIn>({
    type: 'pre',
    purpose: '',
    objectives: '',
    expectations: '',
  });
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({
    meet: {
      connected: false,
      status: 'offline',
      meetingTime: 0,
      messagesCount: 0,
      lastSync: '-',
      isReal: false,
    },
    zoom: {
      connected: false,
      status: 'offline',
      meetingTime: 0,
      messagesCount: 0,
      lastSync: '-',
      isReal: false,
    },
    slack: {
      connected: false,
      status: 'offline',
      meetingTime: 0,
      messagesCount: 0,
      lastSync: '-',
      isReal: false,
    },
    teams: {
      connected: false,
      status: 'offline',
      meetingTime: 0,
      messagesCount: 0,
      lastSync: '-',
      isReal: false,
    },
  });

  // Aggregated metrics
  const totalMeetingTime = Object.values(integrations).reduce((acc, i) => acc + i.meetingTime, 0);
  const totalMessages = Object.values(integrations).reduce((acc, i) => acc + i.messagesCount, 0);
  const connectedCount = Object.values(integrations).filter(i => i.connected).length;

  // Calculate overload level
  const getOverloadLevel = () => {
    if (totalMeetingTime > 360) return { level: 'critical', color: 'destructive', percent: 100 };
    if (totalMeetingTime > 240) return { level: 'high', color: 'warning', percent: 80 };
    if (totalMeetingTime > 120) return { level: 'moderate', color: 'secondary', percent: 50 };
    return { level: 'healthy', color: 'default', percent: 30 };
  };

  const overload = getOverloadLevel();

  // Fetch real calendar data from Google
  const fetchGoogleCalendarData = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=events`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      throw error;
    }
  }, []);

  // Handle OAuth message from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.success && event.data?.access_token) {
        setLoadingPlatform('meet');

        try {
          const calendarData = await fetchGoogleCalendarData(event.data.access_token);

          setIntegrations(prev => ({
            ...prev,
            meet: {
              connected: true,
              status: 'online',
              meetingTime: calendarData.totalMinutes || 0,
              messagesCount: calendarData.totalMeetings || 0,
              lastSync: new Date().toLocaleTimeString('en-US'),
              accessToken: event.data.access_token,
              upcomingMeetings: calendarData.upcomingMeetings || [],
              isReal: true,
            },
          }));

          toast({
            title: 'Google Meet connected!',
            description: `${calendarData.totalMeetings} meetings found in the last 30 days.`,
          });
        } catch (error: any) {
          toast({
            title: 'Error fetching data',
            description: error.message || 'Could not sync calendar.',
            variant: 'destructive',
          });
        } finally {
          setLoadingPlatform(null);
        }
      } else if (event.data?.error) {
        toast({
          title: 'Authentication error',
          description: event.data.error,
          variant: 'destructive',
        });
        setLoadingPlatform(null);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchGoogleCalendarData, toast]);

  // Connect to Google Meet via OAuth
  const connectGoogleMeet = async () => {
    setLoadingPlatform('meet');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=auth`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      window.open(
        data.authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error: any) {
      toast({
        title: 'Error starting OAuth',
        description: error.message || 'Configure Google credentials first.',
        variant: 'destructive',
      });
      setLoadingPlatform(null);
    }
  };

  // Sync existing connection
  const syncGoogleMeet = async () => {
    const accessToken = integrations.meet.accessToken;
    if (!accessToken) return;

    setLoadingPlatform('meet');
    try {
      const calendarData = await fetchGoogleCalendarData(accessToken);

      setIntegrations(prev => ({
        ...prev,
        meet: {
          ...prev.meet,
          meetingTime: calendarData.totalMinutes || 0,
          messagesCount: calendarData.totalMeetings || 0,
          lastSync: new Date().toLocaleTimeString('en-US'),
          upcomingMeetings: calendarData.upcomingMeetings || [],
        },
      }));

      toast({
        title: 'Synced!',
        description: 'Calendar data updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Sync error',
        description: 'Token expired. Reconnect Google Meet.',
        variant: 'destructive',
      });
      // Reset connection if token expired
      setIntegrations(prev => ({
        ...prev,
        meet: { ...prev.meet, connected: false, accessToken: undefined, isReal: false },
      }));
    } finally {
      setLoadingPlatform(null);
    }
  };

  // Mock connection for other platforms (demo)
  const connectMockIntegration = async (platform: string) => {
    setLoadingPlatform(platform);

    toast({
      title: `Connecting ${getPlatformDisplayName(platform)}...`,
      description: 'Demo mode - simulated data',
    });

    setTimeout(() => {
      setIntegrations(prev => ({
        ...prev,
        [platform]: {
          connected: true,
          status: 'online',
          meetingTime: Math.floor(Math.random() * 180) + 30,
          messagesCount: Math.floor(Math.random() * 50) + 10,
          lastSync: new Date().toLocaleTimeString('en-US'),
          isReal: false,
        },
      }));
      setLoadingPlatform(null);
      toast({
        title: `${getPlatformDisplayName(platform)} connected!`,
        description: 'Demo data synced.',
      });
    }, 1500);
  };

  // Router for platform connections
  const connectIntegration = (platform: string) => {
    if (platform === 'meet') {
      connectGoogleMeet();
    } else {
      connectMockIntegration(platform);
    }
  };

  // AI pre/post meeting check-in
  const generateAICheckIn = async () => {
    if (!checkInData.purpose && checkInType === 'pre') {
      toast({
        title: 'Required field',
        description: 'Enter the meeting purpose',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setAiResponse('');

    try {
      const prompt = checkInType === 'pre'
        ? `You are a high performance coach with NLP expertise. The user is about to enter a meeting with:
Purpose: ${checkInData.purpose}
Objectives: ${checkInData.objectives}
Expectations: ${checkInData.expectations}

Ask 3 powerful questions (NLP) to align mindset before the meeting. Be concise and motivating.`
        : `You are a high performance coach with NLP expertise. The user just finished a meeting:
Original purpose: ${checkInData.purpose}
Feedback: ${checkInData.feedback || 'Not provided'}

Give constructive NLP-based feedback: what went well, what to improve, and a positive anchor. Maximum 3 paragraphs.`;

      const { data, error } = await supabase.functions.invoke('neuro-coach', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          stressLevel: overload.level,
          context: `Integrations: ${connectedCount} connected. Meeting time today: ${totalMeetingTime}min.`,
          userName: '',
          communicationTone: 'casual',
        },
      });

      if (error) throw error;
      setAiResponse(data.response);
    } catch (error: any) {
      console.error('AI Error:', error);
      toast({
        title: 'Error',
        description: 'Could not generate feedback. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'away': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'busy': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'meet': return <Video className="h-5 w-5 text-green-600" />;
      case 'zoom': return <Video className="h-5 w-5 text-blue-500" />;
      case 'slack': return <MessageSquare className="h-5 w-5" />;
      case 'teams': return <Users className="h-5 w-5" />;
      default: return null;
    }
  };

  const getPlatformDisplayName = (platform: string) => {
    switch (platform) {
      case 'meet': return 'Google Meet';
      case 'zoom': return 'Zoom';
      case 'slack': return 'Slack';
      case 'teams': return 'Teams';
      default: return platform;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Call Time</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalMeetingTime} min</p>
            <p className="text-xs text-muted-foreground">today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" />
              <span className="text-sm text-muted-foreground">Messages</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalMessages}</p>
            <p className="text-xs text-muted-foreground">sent today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              <span className="text-sm text-muted-foreground">Integrations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{connectedCount}/4</p>
            <p className="text-xs text-muted-foreground">connected</p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${overload.level === 'critical' ? 'from-destructive/20 to-destructive/10' : overload.level === 'high' ? 'from-yellow-500/20 to-yellow-500/10' : 'from-green-500/20 to-green-500/10'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${overload.level === 'critical' ? 'text-destructive' : overload.level === 'high' ? 'text-yellow-500' : 'text-green-500'}`} />
              <span className="text-sm text-muted-foreground">Overload</span>
            </div>
            <p className="text-2xl font-bold mt-1 capitalize">{overload.level}</p>
            <Progress value={overload.percent} className="h-1 mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Integrations</TabsTrigger>
          <TabsTrigger value="checkin">AI Check-in</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(integrations).map(([platform, data]) => (
              <Card key={platform} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getPlatformIcon(platform)}
                      {getPlatformDisplayName(platform)}
                    </CardTitle>
                    {data.connected && getStatusIcon(data.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {data.connected ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Status</span>
                        <div className="flex items-center gap-2">
                          {data.isReal ? (
                            <Badge variant="default" className="text-xs bg-green-600">Real</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Demo</Badge>
                          )}
                          <Badge variant="outline" className="capitalize">{data.status}</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Call time</span>
                        <span className="font-medium">{data.meetingTime} min</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Messages</span>
                        <span className="font-medium">{data.messagesCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last sync</span>
                        <span className="text-xs">{data.lastSync}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => platform === 'meet' && integrations.meet.accessToken ? syncGoogleMeet() : connectIntegration(platform)}
                        disabled={loadingPlatform === platform}
                      >
                        {loadingPlatform === platform ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sync
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground mb-3">
                        {platform === 'meet' ? 'Connect with real OAuth' : 'Connect to monitor (demo)'}
                      </p>
                      <Button
                        onClick={() => connectIntegration(platform)}
                        disabled={loadingPlatform === platform}
                        className="w-full"
                      >
                        {loadingPlatform === platform ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Connect {getPlatformDisplayName(platform)}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Upcoming Meetings - Google Meet */}
          {integrations.meet.connected && integrations.meet.upcomingMeetings && integrations.meet.upcomingMeetings.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Meetings
                </CardTitle>
                <CardDescription>Click to join directly in Google Meet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {integrations.meet.upcomingMeetings.map((meeting) => {
                    const startDate = new Date(meeting.start);
                    const endDate = new Date(meeting.end);
                    const isToday = startDate.toDateString() === new Date().toDateString();

                    return (
                      <div
                        key={meeting.id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{meeting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {isToday ? 'Today' : startDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })} • {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {meeting.attendees > 0 && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" /> {meeting.attendees} attendees
                            </p>
                          )}
                        </div>
                        {meeting.meetLink && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => window.open(meeting.meetLink, '_blank')}
                            className="gap-2"
                          >
                            <Video className="h-4 w-4" />
                            Join
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checkin" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                AI Meeting Check-in
              </CardTitle>
              <CardDescription>
                NLP-based feedback before and after meetings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={checkInType === 'pre' ? 'default' : 'outline'}
                  onClick={() => {
                    setCheckInType('pre');
                    setAiResponse('');
                  }}
                  className="flex-1"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Pre-Meeting
                </Button>
                <Button
                  variant={checkInType === 'post' ? 'default' : 'outline'}
                  onClick={() => {
                    setCheckInType('post');
                    setAiResponse('');
                  }}
                  className="flex-1"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Post-Meeting
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Meeting purpose</label>
                  <Textarea
                    placeholder="E.g.: Project alignment, quarterly feedback..."
                    value={checkInData.purpose}
                    onChange={(e) => setCheckInData(prev => ({ ...prev, purpose: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                {checkInType === 'pre' ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Your objectives</label>
                      <Textarea
                        placeholder="What do you want to achieve in this meeting?"
                        value={checkInData.objectives}
                        onChange={(e) => setCheckInData(prev => ({ ...prev, objectives: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Expectations</label>
                      <Textarea
                        placeholder="What's the ideal outcome?"
                        value={checkInData.expectations}
                        onChange={(e) => setCheckInData(prev => ({ ...prev, expectations: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-sm font-medium">How was the meeting?</label>
                    <Textarea
                      placeholder="Briefly describe what happened, feelings, results..."
                      value={checkInData.feedback || ''}
                      onChange={(e) => setCheckInData(prev => ({ ...prev, feedback: e.target.value }))}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                )}

                <Button
                  onClick={generateAICheckIn}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating feedback...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {checkInType === 'pre' ? 'Prepare Mindset' : 'Get Feedback'}
                    </>
                  )}
                </Button>

                {aiResponse && (
                  <div className="p-4 bg-muted/50 rounded-lg border mt-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      NeuroCoach says:
                    </h4>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Productivity Insights
              </CardTitle>
              <CardDescription>
                Analysis based on integration data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectedCount === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Connect at least one integration to see insights
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('overview')}>
                    Connect Integrations
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Preventive alerts */}
                  {totalMeetingTime > 240 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">
                            Alert: Too many meetings
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            You've already spent {totalMeetingTime} minutes in calls today.
                            Consider blocking time for focused work.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {totalMessages > 40 && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                            High communication volume
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {totalMessages} messages today. Consider batching responses
                            at specific times for better productivity.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Positive metrics */}
                  {totalMeetingTime < 120 && connectedCount > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-green-700 dark:text-green-400">
                            Good balance today!
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Healthy meeting time. Keep it up to maintain
                            productivity and well-being.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicator summary */}
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Estimated focus time</p>
                      <p className="text-xl font-bold">{Math.max(0, 480 - totalMeetingTime)} min</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Estimated interruptions</p>
                      <p className="text-xl font-bold">{Math.floor(totalMessages / 5)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
