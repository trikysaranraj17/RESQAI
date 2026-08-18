import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RiskEngine } from '@/lib/riskEngine';
import { NotificationService } from '@/lib/notificationService';
import { realtimeHub } from '@/lib/realtime';
import { WeatherService } from '@/lib/weatherService';

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
    } = body;

    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'demo';

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

    // 4. Persist to Database Store
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
      isSimulated: appMode === 'demo',
    });

    // 5. Critical Alert Workflow Dispatch if Critical threshold crossed
    let alertLogs: any[] = [];
    if (aiAnalysis.riskLevel === 'Critical') {
      const alertResult = await NotificationService.dispatchCriticalAlert(incident, appMode);
      alertResult.logs.forEach((log) => db.addNotificationLog(log));
      alertLogs = alertResult.logs;

      db.logAudit({
        incidentId: incident.id,
        actor: 'AI Risk Engine',
        action: 'CRITICAL_ALERT_DISPATCHED',
        details: `Dispatched multi-channel critical alert (Voice, Email, SMS, WhatsApp) for ${incident.id}.`,
      });
    }

    // 6. Broadcast Realtime Event to all connected Control Center operator dashboards
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
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error handling SOS submission:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
