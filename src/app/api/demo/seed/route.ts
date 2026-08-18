import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { RiskEngine } from '@/lib/riskEngine';
import { NotificationService } from '@/lib/notificationService';
import { realtimeHub } from '@/lib/realtime';
import { WeatherService } from '@/lib/weatherService';

export async function POST(req: NextRequest) {
  try {
    const { scenario } = await req.json();

    if (scenario === 'reset') {
      db.resetToDefault();
      realtimeHub.broadcast('incident_updated', { reset: true, timestamp: new Date().toISOString() });
      return NextResponse.json({ success: true, message: 'Database reset to default seed state' });
    }

    const appMode = (process.env.APP_MODE as 'demo' | 'live') || 'demo';
    const weather = await WeatherService.getLatestWeather(appMode);

    let incidentData: any = {};

    if (scenario === 'flash_flood') {
      incidentData = {
        type: 'Flood',
        description: 'Raging torrent water has flooded ground-floor apartments and vehicles are floating downstream. 6 residents trapped on roof calling for help!',
        peopleAffected: 6,
        latitude: 37.7815,
        longitude: -122.4110,
        accuracy: 4.8,
        address: 'North Basin Marina & 5th Avenue',
        media: [
          {
            id: `MED-SCENARIO-${Date.now()}`,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80',
            capturedAt: new Date().toISOString(),
          }
        ],
        voiceNote: {
          id: `VN-SCENARIO-${Date.now()}`,
          audioUrl: '',
          durationSeconds: 18,
          transcription: 'The water is rising above the first floor balcony! Send emergency rescue boats urgently!',
          transcriptionConfidence: 0.96,
          recordedAt: new Date().toISOString(),
        }
      };
    } else if (scenario === 'wildfire') {
      incidentData = {
        type: 'Fire',
        description: 'Brush fire accelerated by 50km/h wind gusts jumping Ridge Valley perimeter fence toward residential cul-de-sac. Dense smoke.',
        peopleAffected: 12,
        latitude: 37.7600,
        longitude: -122.4400,
        accuracy: 8.0,
        address: 'Ridge Valley Wooded Crest, Zone 3',
        media: [
          {
            id: `MED-SCENARIO-${Date.now()}`,
            type: 'image',
            url: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&w=800&q=80',
            capturedAt: new Date().toISOString(),
          }
        ]
      };
    } else if (scenario === 'landslide') {
      incidentData = {
        type: 'Building Damage',
        description: 'Massive hillside slippage has engulfed two lanes of Highway 101 approach. Power lines severed and sparking.',
        peopleAffected: 3,
        latitude: 37.7900,
        longitude: -122.4050,
        accuracy: 6.0,
        address: 'North Approach Overpass, Highway 101',
      };
    } else {
      return NextResponse.json({ success: false, error: 'Unknown scenario' }, { status: 400 });
    }

    const aiAnalysis = RiskEngine.calculateRisk({
      type: incidentData.type,
      description: incidentData.description,
      peopleAffected: incidentData.peopleAffected,
      latitude: incidentData.latitude,
      longitude: incidentData.longitude,
      address: incidentData.address,
      hasMedia: Boolean(incidentData.media?.length),
      mediaType: incidentData.media?.length ? incidentData.media[0].type : undefined,
      hasVoiceNote: Boolean(incidentData.voiceNote),
      voiceDurationSeconds: incidentData.voiceNote?.durationSeconds,
      weather,
    });

    const incident = db.createIncident({
      ...incidentData,
      priority: aiAnalysis.priority,
      riskScore: aiAnalysis.riskScore,
      riskLevel: aiAnalysis.riskLevel,
      status: aiAnalysis.riskLevel === 'Critical' ? 'CRITICAL' : 'NEW',
      aiAnalysis,
      isSimulated: true,
    });

    if (aiAnalysis.riskLevel === 'Critical') {
      const alertResult = await NotificationService.dispatchCriticalAlert(incident, appMode);
      alertResult.logs.forEach((l) => db.addNotificationLog(l));

      realtimeHub.broadcast('critical_alert', {
        incidentId: incident.id,
        riskScore: incident.riskScore,
        address: incident.address,
        alerts: alertResult.logs,
      });
    }

    realtimeHub.broadcast('incident_created', {
      incident,
      scenario,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, scenario, incident });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
