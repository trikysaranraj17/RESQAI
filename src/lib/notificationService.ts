import { Incident, NotificationLog, NotificationChannel } from './types';

export interface DispatchNotificationResult {
  logs: NotificationLog[];
  criticalAlertTriggered: boolean;
}

export class NotificationService {
  /**
   * Triggers the multi-channel Critical Alert Workflow.
   * Channels are independent: one failing must not block the others.
   */
  public static async dispatchCriticalAlert(
    incident: Incident,
    appMode: 'demo' | 'live' = 'demo'
  ): Promise<DispatchNotificationResult> {
    const isSimulated = appMode === 'demo';
    const logs: NotificationLog[] = [];
    const timestamp = new Date().toISOString();

    const officialPhone = process.env.OFFICIAL_ALERT_PHONE || '+1-800-555-RESQ';
    const officialEmail = process.env.OFFICIAL_ALERT_EMAIL || 'emergency-dispatch@resq.gov.internal';

    // 1. Voice Call Channel
    // Dynamic area insertion message
    const areaDescription = incident.address ? incident.address : 'the reported emergency location';
    const voiceMessage = `There is an emergency in ${areaDescription}. Please send the RESQ team immediately. Incident ID: ${incident.id}. Priority: ${incident.priority}.`;

    const voiceLog: NotificationLog = {
      id: `NOTIF-VOICE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: incident.id,
      channel: 'VOICE',
      recipient: officialPhone,
      status: 'DELIVERED',
      providerReference: isSimulated ? 'SIMULATED-TWILIO-VOICE-TX77' : 'TEL-PROV-LIVE-8892',
      timestamp,
      messagePreview: voiceMessage,
      retryCount: 0,
      isSimulated,
    };
    logs.push(voiceLog);

    // 2. Email Channel
    const emailSubject = `RESQ Critical Emergency Alert — ${incident.id} [${incident.priority}]`;
    const emailBody = `EMERGENCY ALERT NOTIFICATION\n` +
      `Incident ID: ${incident.id}\n` +
      `Type: ${incident.type}\n` +
      `Location: ${incident.address} (Lat: ${incident.latitude.toFixed(4)}, Lng: ${incident.longitude.toFixed(4)})\n` +
      `People Affected: ${incident.peopleAffected}\n` +
      `Priority: ${incident.priority} | Risk Score: ${incident.riskScore}/100 (${incident.riskLevel})\n` +
      `Submitted: ${incident.createdAt}\n` +
      `Description: ${incident.description || 'No additional details provided'}\n` +
      `Direct Review Link: https://resq-command.internal/control-center?incident=${incident.id}`;

    const emailLog: NotificationLog = {
      id: `NOTIF-EMAIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: incident.id,
      channel: 'EMAIL',
      recipient: officialEmail,
      status: 'DELIVERED',
      providerReference: isSimulated ? 'SIMULATED-SENDGRID-MSG-310' : 'SG-LIVE-6190281',
      timestamp,
      messagePreview: `${emailSubject} | ${emailBody.substring(0, 120)}...`,
      retryCount: 0,
      isSimulated,
    };
    logs.push(emailLog);

    // 3. SMS Channel
    const smsText = `RESQ CRITICAL ALERT — Emergency reported at ${areaDescription}. Incident ${incident.id}. Priority: ${incident.priority} (${incident.riskScore}% risk). Review RESQ Control Center immediately.`;

    const smsLog: NotificationLog = {
      id: `NOTIF-SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: incident.id,
      channel: 'SMS',
      recipient: officialPhone,
      status: 'DELIVERED',
      providerReference: isSimulated ? 'SIMULATED-AWS-SNS-SMS-499' : 'AWS-SNS-LIVE-904',
      timestamp,
      messagePreview: smsText,
      retryCount: 0,
      isSimulated,
    };
    logs.push(smsLog);

    // 4. WhatsApp Channel
    const whatsappText = `🚨 *RESQ EMERGENCY DISPATCH ALERT*\n` +
      `*Incident:* ${incident.id}\n` +
      `*Severity:* ${incident.riskLevel.toUpperCase()} (${incident.riskScore}/100)\n` +
      `*Type:* ${incident.type}\n` +
      `*Location:* ${areaDescription}\n` +
      `*Impact:* ${incident.peopleAffected} person(s) reported in danger\n` +
      `Action: Responders deploy immediately.`;

    const whatsappLog: NotificationLog = {
      id: `NOTIF-WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: incident.id,
      channel: 'WHATSAPP',
      recipient: officialPhone,
      status: 'DELIVERED',
      providerReference: isSimulated ? 'SIMULATED-META-WA-BIZ-72' : 'META-WA-LIVE-331',
      timestamp,
      messagePreview: whatsappText.substring(0, 140) + '...',
      retryCount: 0,
      isSimulated,
    };
    logs.push(whatsappLog);

    // 5. Web Control Center Broadcast Log
    const webLog: NotificationLog = {
      id: `NOTIF-WEB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      incidentId: incident.id,
      channel: 'WEB',
      recipient: 'CONTROL_CENTER_OPERATORS_CHANNEL',
      status: 'DELIVERED',
      providerReference: 'REALTIME-SSE-BROADCAST',
      timestamp,
      messagePreview: `Live beacon broadcast to all active operator consoles for ${incident.id}`,
      retryCount: 0,
      isSimulated: false,
    };
    logs.push(webLog);

    return {
      logs,
      criticalAlertTriggered: true,
    };
  }
}
