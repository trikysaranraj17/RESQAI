import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RiskEngine } from '@/lib/riskEngine';
import { NotificationService } from '@/lib/notificationService';
import { realtimeHub } from '@/lib/realtime';
import { WeatherService } from '@/lib/weatherService';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dwilzclyzdsfwqdzximc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3aWx6Y2x5emRzZndxZHp4aW1jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1NTk5NiwiZXhwIjoyMTAyNjMxOTk2fQ.Y5kOLKI9VPAJ4c5iGqy_ugkLAj0b5sBDOqH7b1xGK-Q';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let incidents = db.getAllIncidents();

    if (status && status !== 'ALL') {
      incidents = incidents.filter((i) => i.status === status);
    }
    if (priority && priority !== 'ALL') {
      incidents = incidents.filter((i) => i.priority === priority);
    }

    return NextResponse.json({ success: true, count: incidents.length, incidents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = 'Other',
      description = '',
      peopleAffected = 1,
      latitude = 37.7749,
      longitude = -122.4194,
      accuracy,
      address,
      media = [],
      voiceNote,
      citizenId,
      customTarget,
    } = body;

    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'live';

    // 1. Fetch current weather context to feed into multi-signal AI Risk Engine
    const weather = await WeatherService.getLatestWeather(appMode);

    // 2. Multi-Signal AI Risk Evaluation
    const hasMedia = Array.isArray(media) && media.length > 0;
    const hasVoiceNote = Boolean(voiceNote && (voiceNote.audioUrl || voiceNote.transcription));

    const aiAnalysis = RiskEngine.calculateRisk({
      type,
      description,
      peopleAffected: Number(peopleAffected) || 1,
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      address: address || 'Reported Emergency Zone',
      hasMedia,
      mediaType: hasMedia ? media[0].type : undefined,
      hasVoiceNote,
      voiceDurationSeconds: voiceNote?.durationSeconds,
      weather,
    });

    // 3. Status determination: If AI evaluates as Critical, elevate immediately to CRITICAL
    const initialStatus = aiAnalysis.riskLevel === 'Critical' ? 'CRITICAL' : 'NEW';

    // 4. Persist to In-Memory Database Store
    const incident = db.createIncident({
      citizenId,
      type,
      description,
      peopleAffected: Number(peopleAffected) || 1,
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      accuracy: accuracy ? Number(accuracy) : undefined,
      address: address || 'Reported Emergency Zone',
      priority: aiAnalysis.priority,
      riskScore: aiAnalysis.riskScore,
      riskLevel: aiAnalysis.riskLevel,
      status: initialStatus,
      media,
      voiceNote,
      aiAnalysis,
      isSimulated: false,
    });

    // 5. Critical Alert Workflow Dispatch (Voice Call + SMS + FormSubmit Email + WhatsApp)
    let alertLogs: any[] = [];
    const alertResult = await NotificationService.dispatchCriticalAlert(incident, customTarget);
    if (alertResult && alertResult.logs) {
      alertResult.logs.forEach((log: any) => db.addNotificationLog(log));
      alertLogs = alertResult.logs;
    }

    db.logAudit({
      incidentId: incident.id,
      actor: 'AI Risk Engine',
      action: 'CRITICAL_ALERT_DISPATCHED',
      details: `Dispatched multi-channel critical alert (Twilio Voice, Cellular SMS, FormSubmit Email, WhatsApp) for ${incident.id}.`,
    });

    // 6. Persist to Supabase PostgreSQL Database
    try {
      if (SUPABASE_URL && SUPABASE_KEY) {
        fetch(`${SUPABASE_URL}/rest/v1/incidents`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: incident.id,
            citizen_id: incident.citizenId,
            type: incident.type,
            description: incident.description,
            people_affected: incident.peopleAffected,
            latitude: incident.latitude,
            longitude: incident.longitude,
            accuracy: incident.accuracy,
            address: incident.address,
            priority: incident.priority,
            risk_score: incident.riskScore,
            risk_level: incident.riskLevel,
            status: incident.status,
            assigned_team: incident.assignedTeam || null,
            created_at: incident.createdAt,
            updated_at: incident.updatedAt,
            is_simulated: false,
          }),
        }).catch(err => console.warn('Supabase incident sync notice:', err.message));
      }
    } catch (err: any) {
      console.warn('Supabase incident sync error:', err.message);
    }

    // 7. Broadcast Realtime Event to all connected Control Center operator dashboards
    realtimeHub.broadcast('incident_created', {
      incident,
      alertsTriggered: alertLogs.length > 0,
      timestamp: new Date().toISOString(),
    });

    if (alertLogs.length > 0) {
      realtimeHub.broadcast('critical_alert', {
        incidentId: incident.id,
        riskScore: incident.riskScore,
        address: incident.address,
        alerts: alertLogs,
      });
    }

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      incident,
      aiAnalysis,
      alertsDispatched: alertLogs.length,
      alertLogs,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error handling SOS submission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
