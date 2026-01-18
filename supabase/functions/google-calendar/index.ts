import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Get the redirect URI from the request origin
    const origin = req.headers.get('origin') || 'http://localhost:5173';
    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar?action=callback`;

    if (action === 'auth') {
      // Step 1: Generate OAuth URL
      const state = crypto.randomUUID();
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID || '');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly');
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(
        JSON.stringify({ authUrl: authUrl.toString(), state }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'callback') {
      // Step 2: Handle OAuth callback
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(
          `<html><body><script>window.opener.postMessage({error: '${error}'}, '*'); window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      if (!code) {
        return new Response(
          `<html><body><script>window.opener.postMessage({error: 'No code received'}, '*'); window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID || '',
          client_secret: GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        return new Response(
          `<html><body><script>window.opener.postMessage({error: '${tokens.error_description || tokens.error}'}, '*'); window.close();</script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } }
        );
      }

      // Send tokens back to opener window
      return new Response(
        `<html><body><script>window.opener.postMessage({success: true, access_token: '${tokens.access_token}', refresh_token: '${tokens.refresh_token || ''}'}, '*'); window.close();</script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    if (action === 'events') {
      // Step 3: Fetch calendar events
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'No access token provided' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const accessToken = authHeader.replace('Bearer ', '');
      
      // Get events from the last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      calendarUrl.searchParams.set('timeMin', thirtyDaysAgo.toISOString());
      calendarUrl.searchParams.set('timeMax', now.toISOString());
      calendarUrl.searchParams.set('singleEvents', 'true');
      calendarUrl.searchParams.set('orderBy', 'startTime');
      calendarUrl.searchParams.set('maxResults', '100');

      const eventsResponse = await fetch(calendarUrl.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const eventsData = await eventsResponse.json();

      if (eventsData.error) {
        return new Response(
          JSON.stringify({ error: eventsData.error.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter and process events
      const events = eventsData.items || [];
      
      // Find Google Meet events (have conferenceData with Google Meet)
      const meetEvents = events.filter((event: any) => 
        event.conferenceData?.conferenceSolution?.name === 'Google Meet' ||
        event.hangoutLink
      );

      // Calculate total meeting time in minutes
      let totalMeetingMinutes = 0;
      meetEvents.forEach((event: any) => {
        if (event.start?.dateTime && event.end?.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          totalMeetingMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        }
      });

      // Get upcoming meetings
      const upcomingMeetings = meetEvents
        .filter((event: any) => new Date(event.start?.dateTime || event.start?.date) > now)
        .slice(0, 5)
        .map((event: any) => ({
          id: event.id,
          title: event.summary || 'Sem título',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.[0]?.uri,
          attendees: event.attendees?.length || 0,
        }));

      return new Response(
        JSON.stringify({
          totalMeetings: meetEvents.length,
          totalMinutes: Math.round(totalMeetingMinutes),
          upcomingMeetings,
          lastSync: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
