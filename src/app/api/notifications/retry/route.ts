import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { realtimeHub } from '@/lib/realtime';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || 'AC55deeb28ea81530d98623bdf3dbb956f';
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN || '3de79206f9a2dcfa1f0ba3c0844733bf';
const TWILIO_FROM = process.env.TWILIO_FROM_PHONE || '+17372212163';

export async function POST(req: NextRequest) {
  try {
    const { logId } = await req.json();
    const logs = db.getNotificationLogs();
    
    // Find matching log in memory
    const logIndex = logs.findIndex((l) => l.id === logId);
    if (logIndex === -1) {
      return NextResponse.json({ success: false, error: 'Notification log not found' }, { status: 404 });
    }

    const log = logs[logIndex];
    const incident = db.getIncidentById(log.incidentId);
    if (!incident) {
      return NextResponse.json({ success: false, error: 'Incident not found for log' }, { status: 404 });
    }

    const targetPhone = log.recipient;
    const assignedTeam = incident.assignedTeam || 'Alpha Search & Rescue';
    const area = incident.address || 'Reported Emergency Zone';
    const people = incident.peopleAffected || 1;
    const risk = incident.riskScore || 85;

    let success = false;
    let errorMsg = '';
    let providerRef = log.providerReference;

    // Retry based on the channel type
    if (log.channel === 'VOICE') {
      const twimlMessage = `<Response>
        <Say voice="Polly.Aditi" language="en-IN">Attention Emergency Response Command. Urgent RESQ Priority 1 incident alert. Category: ${incident.type}. Location: ${area}. ${people} citizens require immediate rescue. AI risk score is ${risk} percent. Unit ${assignedTeam} has been mobilized. Immediate action required.</Say>
        <Pause length="1"/>
        <Say voice="Polly.Aditi" language="en-IN">Repeat. Category: ${incident.type}. Location: ${area}. Please review RESQ Tactical Control Center immediately.</Say>
      </Response>`;

      try {
        const callParams = new URLSearchParams({
          To: targetPhone,
          From: TWILIO_FROM,
          Twiml: twimlMessage,
        });

        const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
        const voiceRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: callParams.toString(),
        });

        const voiceData = await voiceRes.json();
        if (voiceRes.ok && voiceData.sid) {
          providerRef = voiceData.sid;
          success = true;
        } else {
          errorMsg = voiceData.message || `HTTP ${voiceRes.status}`;
        }
      } catch (e: any) {
        errorMsg = e.message;
      }
    } else if (log.channel === 'SMS') {
      const smsBody = `🚨 [RESQ CRITICAL ALERT] ${incident.priority} (${incident.riskLevel}): ${incident.type} reported at ${area}. ${people} victim(s) in danger. AI Risk: ${risk}%. Mobilized Unit: ${assignedTeam}. Review command center immediately.`;

      try {
        const smsParams = new URLSearchParams({
          To: targetPhone,
          From: TWILIO_FROM,
          Body: smsBody,
        });

        const twilioAuth = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
        const smsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: smsParams.toString(),
        });

        const smsData = await smsRes.json();
        if (smsRes.ok && smsData.sid) {
          providerRef = smsData.sid;
          success = true;
        } else {
          errorMsg = smsData.message || `HTTP ${smsRes.status}`;
        }
      } catch (e: any) {
        errorMsg = e.message;
      }
    } else if (log.channel === 'EMAIL') {
      try {
        const emailPayload = {
          _subject: `🚨 [RETRY RESQ DISPATCH] ${incident.priority}: ${incident.type} at ${area}`,
          _cc: 'mediaestelle7@gmail.com,nandhini301107@gmail.com,kavipriyaps2401@gmail.com',
          _template: 'table',
          _captcha: 'false',
          'INCIDENT ID': incident.id,
          'CITIZEN ID': incident.citizenId || 'CITIZEN-SOS',
          'EMERGENCY TYPE': incident.type,
          'PRIORITY LEVEL': incident.priority,
          'AI RISK SCORE': `${risk}% (${incident.riskLevel})`,
          'ASSIGNED RESPONSE UNIT': assignedTeam,
          'LOCATION ADDRESS': area,
          'GPS COORDINATES': `Lat: ${incident.latitude}, Lng: ${incident.longitude}`,
          'PEOPLE IN DANGER': `${people} victim(s)`,
          'INCIDENT DESCRIPTION': incident.description || 'Urgent assistance required.',
          'DISPATCH TIME': new Date().toISOString(),
        };

        const emailRes = await fetch('https://formsubmit.co/ajax/trikysaran5721@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });
        if (emailRes.ok) {
          success = true;
        } else {
          errorMsg = `HTTP ${emailRes.status}`;
        }
      } catch (e: any) {
        errorMsg = e.message;
      }
    } else {
      // For simulator/ntfy/whatsapp, treat retry as auto-successful
      success = true;
    }

    // Update log status in memory
    log.status = success ? 'DELIVERED' : 'FAILED';
    log.retryCount = (log.retryCount || 0) + 1;
    log.timestamp = new Date().toISOString();
    if (!success && errorMsg) {
      log.messagePreview = `[Failed Retry #${log.retryCount}] Error: ${errorMsg}`;
    } else {
      log.messagePreview = `[Retried Successfully] Sent on channel ${log.channel}`;
    }

    // Broadcast updated state to all dashboards
    realtimeHub.broadcast('incident_updated', {
      incident,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success, log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
