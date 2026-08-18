import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RiskEngine } from '@/lib/riskEngine';
import { WeatherService } from '@/lib/weatherService';
import { realtimeHub } from '@/lib/realtime';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const incident = db.getIncidentById(params.id);
    if (!incident) {
      return NextResponse.json({ success: false, error: 'Incident not found' }, { status: 404 });
    }

    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'demo';
    const weather = await WeatherService.getLatestWeather(appMode);

    const hasMedia = Array.isArray(incident.media) && incident.media.length > 0;
    const hasVoiceNote = Boolean(incident.voiceNote);

    const aiAnalysis = RiskEngine.calculateRisk({
      type: incident.type,
      description: incident.description,
      peopleAffected: incident.peopleAffected,
      latitude: incident.latitude,
      longitude: incident.longitude,
      address: incident.address,
      hasMedia,
      mediaType: hasMedia ? incident.media![0].type : undefined,
      hasVoiceNote,
      voiceDurationSeconds: incident.voiceNote?.durationSeconds,
      weather,
    });

    const updated = db.updateIncident(
      params.id,
      {
        aiAnalysis,
        riskScore: aiAnalysis.riskScore,
        riskLevel: aiAnalysis.riskLevel,
        priority: aiAnalysis.priority,
      },
      'AI Analysis Re-evaluation'
    );

    realtimeHub.broadcast('incident_updated', {
      incident: updated,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, incident: updated, aiAnalysis });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
