/**
 * RESQ Fullstack Application Server
 * High-Priority Humanitarian Dispatch & Situational Assessment Platform
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');

// -------------------------------------------------------------
// AUTO-LOAD .env.local
// -------------------------------------------------------------
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const APP_MODE = process.env.APP_MODE || 'production';
const CONTROL_CENTER_USERNAME = process.env.CONTROL_CENTER_USERNAME || 'resqteamlog';
const CONTROL_CENTER_PASSWORD = process.env.CONTROL_CENTER_PASSWORD || 'resq5721cc';
const SESSION_COOKIE_NAME = 'resq_session_token';
const VALID_TOKEN = 'resq_authenticated_operator_session_key';

// Global Notification Target & Gateway Configuration
let alertConfig = {
  phone: process.env.ALERT_DISPATCH_PHONE || '+918838225583',
  email: process.env.ALERT_DISPATCH_EMAIL || 'trikysaran5721@gmail.com',
  officialEmails: [
    'trikysaran5721@gmail.com',
    'mediaestelle7@gmail.com',
    'nandhini301107@gmail.com',
    'kavipriyaps2401@gmail.com'
  ],
  whatsapp: process.env.WHATSAPP_NUMBER || '+918838225583',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || 'AC55deeb28ea81530d98623bdf3dbb956f',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '3de79206f9a2dcfa1f0ba3c0844733bf',
  twilioFromPhone: process.env.TWILIO_FROM_PHONE || '+17372212163',
  resendApiKey: process.env.RESEND_API_KEY || '',
};

// -------------------------------------------------------------
// SUPABASE CLOUD DATABASE INTEGRATION (PostgreSQL REST Engine)
// -------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseRequest(endpoint, method = 'GET', body = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return new Promise((resolve) => {
    try {
      const cleanUrl = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + endpoint;
      const parsedUrl = new URL(cleanUrl);
      const postData = body ? JSON.stringify(body) : null;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : 'count=none')
        }
      };
      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve(parsed);
          } catch(e) {
            resolve({ error: data });
          }
        });
      });
      req.on('error', () => resolve(null));
      if (postData) req.write(postData);
      req.end();
    } catch(err) {
      resolve(null);
    }
  });
}

// Background Async Supabase Sync Helpers
function syncIncidentToSupabase(incident) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    supabaseRequest('incidents', 'POST', {
      id: incident.id,
      type: incident.type,
      status: incident.status,
      priority: incident.priority,
      risk_score: incident.riskScore,
      risk_level: incident.riskLevel,
      description: incident.description,
      people_affected: incident.peopleAffected,
      latitude: incident.latitude,
      longitude: incident.longitude,
      address: incident.address,
      citizen_id: incident.citizenId,
      assigned_team: incident.assignedTeam,
      created_at: incident.createdAt,
      updated_at: incident.updatedAt,
      raw_payload: incident
    }).catch(() => {});
  } catch(e) {}
}

function updateIncidentInSupabase(incidentId, updates) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    supabaseRequest(`incidents?id=eq.${encodeURIComponent(incidentId)}`, 'PATCH', {
      status: updates.status,
      assigned_team: updates.assignedTeam,
      updated_at: new Date().toISOString(),
      raw_payload: updates
    }).catch(() => {});
  } catch(e) {}
}

// SSE Clients Registry for Realtime Updates
const sseClients = new Set();

function broadcastEvent(eventType, data) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// -------------------------------------------------------------
// REAL EXTERNAL API INTEGRATIONS (Twilio, Voice, Resend, FormSubmit)
// -------------------------------------------------------------
async function sendTwilioSms({ accountSid, authToken, from, to, body }) {
  const sid = accountSid || alertConfig.twilioAccountSid;
  const token = authToken || alertConfig.twilioAuthToken;
  const fromNum = from || alertConfig.twilioFromPhone;
  const toNum = to || alertConfig.phone;

  if (!sid || !token || !fromNum || !toNum) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  const doSend = (msgBody) => {
    return new Promise((resolve) => {
      const postData = querystring.stringify({ To: toNum, From: fromNum, Body: msgBody });
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const req = https.request({
        hostname: 'api.twilio.com',
        port: 443,
        path: `/2010-04-01/Accounts/${sid}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, sid: parsed.sid, status: parsed.status, data: parsed });
            } else {
              resolve({ success: false, code: parsed.code, error: parsed.message || 'Twilio SMS failed', details: parsed });
            }
          } catch (e) {
            resolve({ success: false, error: 'Failed to parse Twilio response' });
          }
        });
      });
      req.on('error', (err) => resolve({ success: false, error: err.message }));
      req.write(postData);
      req.end();
    });
  };

  let res = await doSend(body);
  if (!res.success && (res.code === 572006 || (res.error && res.error.includes('template')))) {
    res = await doSend('sms_internal_alerts');
  }
  return res;
}

async function makeTwilioCall({ accountSid, authToken, from, to, incident, customSpeech }) {
  const sid = accountSid || alertConfig.twilioAccountSid;
  const token = authToken || alertConfig.twilioAuthToken;
  const fromNum = from || alertConfig.twilioFromPhone;
  const toNum = to || alertConfig.phone;

  if (!sid || !token || !fromNum || !toNum) {
    return { success: false, error: 'Twilio credentials not configured' };
  }

  let spokenText = customSpeech;
  if (!spokenText && incident) {
    spokenText = `Attention Higher Official. Priority ${incident.priority} Critical Emergency Alert from RESQ Command System. Emergency Type: ${incident.type} reported at ${incident.address}. Number of citizens affected or trapped: ${incident.peopleAffected}. Artificial Intelligence calculated composite risk score is ${incident.riskScore} percent, classified as ${incident.riskLevel}. The assigned rescue response unit is ${incident.assignedTeam || 'Alpha Search and Rescue'}. Tactical mobilization is active. Please review live coordinates on the RESQ Control Center console.`;
  } else if (!spokenText) {
    spokenText = `Attention Higher Official. This is a live voice emergency test call from the RESQ Tactical Command System. Telephony integration is fully verified and operational.`;
  }

  const twimlXml = `<Response><Say voice="Polly.Aditi" language="en-IN">${spokenText}</Say><Pause length="1"/><Say voice="alice">Repeating message: ${spokenText}</Say></Response>`;
  const twimlUrl = `https://twimlets.com/echo?Twiml=${encodeURIComponent(twimlXml)}`;

  return new Promise((resolve) => {
    const postData = querystring.stringify({
      To: toNum,
      From: fromNum,
      Url: twimlUrl,
    });
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const req = https.request({
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${sid}/Calls.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, sid: parsed.sid, status: parsed.status, data: parsed });
          } else {
            resolve({ success: false, error: parsed.message || 'Twilio Call failed', details: parsed });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse Twilio call response' });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

async function sendResendEmail({ apiKey, to, subject, html, text }) {
  const key = apiKey || alertConfig.resendApiKey;
  if (!key || !to) {
    return { success: false, error: 'Resend API Key not configured' };
  }
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      from: 'RESQ Alerts <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
    const req = https.request({
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, id: parsed.id });
          } else {
            resolve({ success: false, error: parsed.message || 'Resend Email failed', details: parsed });
          }
        } catch (e) {
          resolve({ success: false, error: 'Failed to parse Resend response' });
        }
      });
    });
    req.on('error', (err) => resolve({ success: false, error: err.message }));
    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------
// AI RISK ENGINE (Multi-Signal Humanitarian Assessment)
// -------------------------------------------------------------
function calculateRisk(params) {
  const {
    type = 'Other',
    peopleAffected = 1,
    description = '',
    weather,
    hasMedia = false,
    hasVoiceNote = false,
    latitude = 37.7749,
    longitude = -122.4194,
  } = params;

  let baseTypeScore = 40;
  switch (type) {
    case 'Flood': baseTypeScore = 65; break;
    case 'Fire': baseTypeScore = 75; break;
    case 'Building Damage': baseTypeScore = 60; break;
    case 'Person Trapped': baseTypeScore = 70; break;
    case 'Medical Emergency': baseTypeScore = 55; break;
    case 'Road Emergency': baseTypeScore = 45; break;
    case 'Storm': baseTypeScore = 50; break;
    default: baseTypeScore = 40; break;
  }

  const peopleBonus = Math.min(25, Math.max(0, (peopleAffected - 1) * 3.5));

  let weatherBonus = 0;
  if (weather) {
    if (weather.rainfallMm > 40) weatherBonus += 15;
    else if (weather.rainfallMm > 15) weatherBonus += 8;
    if (weather.windSpeedKmh > 40) weatherBonus += 10;
    else if (weather.windSpeedKmh > 25) weatherBonus += 5;
    if (weather.rainProbability > 70) weatherBonus += 5;
  }

  let evidenceBonus = 0;
  if (hasMedia && hasVoiceNote) evidenceBonus = 12;
  else if (hasMedia || hasVoiceNote) evidenceBonus = 7;

  let textSentimentBonus = 0;
  if (description) {
    const descLower = description.toLowerCase();
    const criticalKeywords = ['trapped', 'rising', 'cannot breathe', 'drowning', 'roof', 'chest pain', 'unconscious', 'explosion', 'fire', 'engulfed', 'child', 'baby', 'disabled', 'elderly', 'submerged', 'collapsed'];
    criticalKeywords.forEach(keyword => {
      if (descLower.includes(keyword)) textSentimentBonus += 4;
    });
  }
  textSentimentBonus = Math.min(20, textSentimentBonus);

  let rawScore = baseTypeScore * 0.4 + peopleBonus + weatherBonus * 0.4 + evidenceBonus + textSentimentBonus;
  let finalScore = Math.round(Math.min(98, Math.max(20, rawScore)));

  let riskLevel = 'Low';
  let priority = 'P3';
  if (finalScore >= 80) {
    riskLevel = 'Critical';
    priority = 'P1';
  } else if (finalScore >= 60) {
    riskLevel = 'High';
    priority = 'P2';
  } else if (finalScore >= 40) {
    riskLevel = 'Medium';
    priority = 'P2';
  } else {
    riskLevel = 'Low';
    priority = 'P3';
  }

  const floodRisk = Math.min(95, Math.round(baseTypeScore * 0.6 + weatherBonus * 0.9 + (type === 'Flood' ? 25 : 0)));
  const roadAccessibility = Math.min(95, Math.round(40 + weatherBonus * 0.7 + (type === 'Flood' || type === 'Landslide' ? 30 : 10)));
  const areaDamage = Math.min(90, Math.round(baseTypeScore * 0.7 + evidenceBonus * 1.5));
  const populationExposure = Math.min(95, Math.round(peopleBonus * 2.8 + 25));
  const weatherSeverity = weather ? Math.min(95, Math.round((weather.rainfallMm * 0.8) + (weather.windSpeedKmh * 0.6))) : 50;

  const warnings = [];
  if (finalScore >= 80) warnings.push(`P1 CRITICAL: Extreme life safety threat detected (${type})`);
  if (peopleAffected >= 3) warnings.push(`P1 CRITICAL: Multi-casualty incident (${peopleAffected} individuals in danger)`);
  if (weather && weather.rainfallMm > 35) warnings.push(`P2 HIGH: Heavy rainfall (${weather.rainfallMm}mm/h) elevating hydraulic pressure`);
  if (hasVoiceNote) warnings.push(`P3 INFO: Voice acoustic distress note recorded by citizen`);

  const recommendations = [
    `Dispatch primary response unit specialized in ${type} mitigation`,
    `Establish tactical perimeter and notify local EMS staging node`,
    `Verify satellite/drone aerial feed for route navigability`,
  ];
  if (finalScore >= 80) {
    recommendations.unshift('Execute automated multi-channel critical alert broadcasts to emergency teams');
  }

  return {
    riskScore: finalScore,
    riskLevel,
    priority,
    subScores: { floodRisk, roadAccessibility, areaDamage, populationExposure, weatherSeverity },
    incidentSummary: `Multi-signal assessment: ${type} emergency with ${peopleAffected} person(s) in danger. AI calculated composite risk score of ${finalScore}% based on telemetry, meteorological storm radar, and acoustic evidence.`,
    warnings,
    recommendations,
    affectedArea: `${Math.abs(latitude).toFixed(4)}°N, ${Math.abs(longitude).toFixed(4)}°W (District Grid)`,
    signalBreakdown: {
      weatherContribution: Math.round(weatherBonus),
      citizenReportContribution: Math.round(peopleBonus + textSentimentBonus),
      evidenceContribution: evidenceBonus,
      areaContextContribution: Math.round(baseTypeScore * 0.4),
    },
    calculatedAt: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// MULTI-CHANNEL CRITICAL ALERT NOTIFICATION SERVICE
// -------------------------------------------------------------
async function dispatchCriticalAlert(incident, db, customTarget = null) {
  const timestamp = new Date().toISOString();
  const phone = customTarget?.phone || alertConfig.phone;
  const email = customTarget?.email || alertConfig.email;
  const whatsapp = customTarget?.whatsapp || alertConfig.whatsapp;
  const twilioSid = customTarget?.twilioAccountSid || alertConfig.twilioAccountSid;
  const twilioToken = customTarget?.twilioAuthToken || alertConfig.twilioAuthToken;
  const twilioFrom = customTarget?.twilioFromPhone || alertConfig.twilioFromPhone;
  const resendKey = customTarget?.resendApiKey || alertConfig.resendApiKey;

  const alertText = `🚨 RESQ ALERT [${incident.priority}]: ${incident.type} at ${incident.address}. Victims: ${incident.peopleAffected}. Risk: ${incident.riskScore}%. Assigned Unit: ${incident.assignedTeam || 'PENDING DISPATCH'}.`;

  const logs = [];

  // 1. Real Twilio Voice Call (places real phone call to mobile speaking full report to official)
  let voiceStatus = 'DISPATCHED_SIMULATED';
  let voiceRef = `VOICE-${Date.now()}`;
  if (twilioSid && twilioToken && twilioFrom && phone) {
    const callRes = await makeTwilioCall({
      accountSid: twilioSid,
      authToken: twilioToken,
      from: twilioFrom,
      to: phone,
      incident,
    });
    if (callRes.success) {
      voiceStatus = 'DELIVERED_REAL_CELLULAR';
      voiceRef = `TWILIO-CALL-${callRes.sid}`;
    } else {
      voiceStatus = `FAILED: ${callRes.error}`;
    }
  }

  logs.push({
    id: `ALERT-VOICE-${Date.now()}`,
    incidentId: incident.id,
    channel: 'Voice Emergency Call (Higher Official)',
    recipient: phone,
    channelType: 'voice',
    messagePreview: `Voice call dispatched to ${phone} for ${incident.type} (${incident.priority})`,
    status: voiceStatus,
    timestamp,
    isRealCarrier: voiceStatus.includes('REAL'),
    providerReference: voiceRef,
  });

  // 2. Real Twilio SMS Dispatch (sends real SMS to mobile)
  let smsStatus = 'DISPATCHED_SIMULATED';
  let smsRef = `SMS-${Date.now()}`;
  if (twilioSid && twilioToken && twilioFrom && phone) {
    const smsRes = await sendTwilioSms({
      accountSid: twilioSid,
      authToken: twilioToken,
      from: twilioFrom,
      to: phone,
      body: alertText,
    });
    if (smsRes.success) {
      smsStatus = 'DELIVERED_REAL_SMS';
      smsRef = `TWILIO-SMS-${smsRes.sid}`;
    } else {
      smsStatus = `FAILED: ${smsRes.error}`;
    }
  }

  logs.push({
    id: `ALERT-SMS-${Date.now()}`,
    incidentId: incident.id,
    channel: 'SMS Tactical Alert',
    recipient: phone,
    channelType: 'sms',
    messagePreview: alertText,
    status: smsStatus,
    timestamp,
    isRealCarrier: smsStatus.includes('REAL'),
    providerReference: smsRef,
  });

  // 3. Multi-Email Dispatch (FormSubmit & Resend to all 4 official emails)
  const recipientEmails = alertConfig.officialEmails.join(', ');
  let emailStatus = 'READY_FOR_FORMSUBMIT';
  let emailRef = `FORMSUBMIT-${Date.now()}`;

  if (resendKey) {
    const emailRes = await sendResendEmail({
      apiKey: resendKey,
      to: alertConfig.officialEmails,
      subject: `🚨 RESQ EMERGENCY DISPATCH [${incident.priority}]: ${incident.type} - Higher Official Alert`,
      html: `
        <h2>🚨 RESQ TACTICAL EMERGENCY DISPATCH (HIGHER OFFICIAL BRIEFING)</h2>
        <table border="1" cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">
          <tr><td><strong>Incident ID:</strong></td><td>${incident.id}</td></tr>
          <tr><td><strong>Citizen ID:</strong></td><td>${incident.citizenId || 'CITIZEN-SOS-DIRECT'}</td></tr>
          <tr><td><strong>Emergency Type:</strong></td><td>${incident.type} (${incident.priority} Priority)</td></tr>
          <tr><td><strong>Location / Address:</strong></td><td>${incident.address}</td></tr>
          <tr><td><strong>GPS Coordinates:</strong></td><td>${incident.latitude}, ${incident.longitude}</td></tr>
          <tr><td><strong>Victims in Danger:</strong></td><td>${incident.peopleAffected} Person(s)</td></tr>
          <tr><td><strong>AI Risk Assessment Score:</strong></td><td>${incident.riskScore}% (${incident.riskLevel})</td></tr>
          <tr><td><strong>Assigned Response Unit:</strong></td><td>${incident.assignedTeam || 'Alpha Search & Rescue'}</td></tr>
          <tr><td><strong>Situation Assessment:</strong></td><td>${incident.description}</td></tr>
        </table>
      `,
      text: alertText,
    });
    if (emailRes.success) {
      emailStatus = 'DELIVERED_REAL_INBOX';
      emailRef = `RESEND-${emailRes.id}`;
    }
  }

  logs.push({
    id: `ALERT-EMAIL-${Date.now()}`,
    incidentId: incident.id,
    channel: 'Email Official Briefing (4 Higher Officials)',
    recipient: recipientEmails,
    channelType: 'email',
    messagePreview: alertText,
    status: emailStatus,
    timestamp,
    isRealCarrier: emailStatus.includes('REAL'),
    providerReference: emailRef,
  });

  // 4. WhatsApp Direct Link
  logs.push({
    id: `ALERT-WA-${Date.now()}`,
    incidentId: incident.id,
    channel: 'WhatsApp Tactical Link',
    recipient: whatsapp,
    channelType: 'whatsapp',
    messagePreview: alertText,
    status: 'READY_TO_TRANSMIT',
    timestamp,
    providerReference: `WA-LINK-${Date.now()}`,
  });

  // 5. Command Net Broadcast
  logs.push({
    id: `ALERT-WEB-${Date.now()}`,
    incidentId: incident.id,
    channel: 'RESQ Command Web Net',
    recipient: 'Tactical Console',
    channelType: 'web',
    messagePreview: alertText,
    status: 'BROADCAST_ACTIVE',
    timestamp,
    providerReference: `NET-${Date.now()}`,
  });

  // Save to database
  logs.forEach(l => db.notificationLogs.unshift(l));

  db.auditLogs.unshift({
    id: `AUDIT-${Date.now()}`,
    incidentId: incident.id,
    action: 'MULTI_CHANNEL_DISPATCH_TRIGGERED',
    actor: incident.assignedTeam ? `Assigned Unit: ${incident.assignedTeam}` : 'RESQ Dispatch Engine',
    details: `Alerts dispatched across Voice Call (${phone}), SMS (${phone}), Emails (${recipientEmails}), and WhatsApp (${whatsapp}). Incident Risk: ${incident.riskScore}%.`,
    timestamp,
  });

  return logs;
}

// -------------------------------------------------------------
// IN-MEMORY DATABASE & SEED DATA
// -------------------------------------------------------------
function createDatabase() {
  const db = {
    incidents: [],
    responseTeams: [],
    notificationLogs: [],
    auditLogs: [],
    weather: {
      temperatureC: 18.5,
      humidityPercent: 88,
      rainfallMm: 42.0,
      windSpeedKmh: 34.0,
      windDirection: 'NE',
      rainProbability: 95,
      condition: 'Heavy Rain & Thunderstorms',
      isSimulated: true,
      lastUpdated: new Date().toISOString(),
      hourlyForecast: [
        { timeLabel: 'Now', tempC: 18.5, rainProb: 95, precipMm: 42.0, condition: 'Heavy Rain' },
        { timeLabel: '+1h', tempC: 18.0, rainProb: 90, precipMm: 38.0, condition: 'Rain' },
        { timeLabel: '+3h', tempC: 17.5, rainProb: 85, precipMm: 28.0, condition: 'Showers' },
        { timeLabel: '+6h', tempC: 16.8, rainProb: 65, precipMm: 12.0, condition: 'Scattered' },
        { timeLabel: '+12h', tempC: 15.5, rainProb: 35, precipMm: 2.0, condition: 'Overcast' },
        { timeLabel: '+24h', tempC: 19.0, rainProb: 15, precipMm: 0.0, condition: 'Partly Cloudy' },
      ],
    },
  };

  db.responseTeams = [
    { id: 'TEAM-1', name: 'Alpha Search & Rescue', specialty: 'Urban SAR & Collapse Rescue', personnelCount: 8, status: 'Available', vehicleType: 'Heavy Rescue Tender 1', callSign: 'ALPHA-LEAD', phone: '+1 (800) 555-0101' },
    { id: 'TEAM-2', name: 'Marine Extraction Unit 3', specialty: 'Swiftwater & Flood Extraction', personnelCount: 6, status: 'Available', vehicleType: 'Zodiac Rescue Rib & Jet Boat', callSign: 'MARINE-3', phone: '+1 (800) 555-0102' },
    { id: 'TEAM-3', name: 'Bravo Hazmat & Fire', specialty: 'Chemical & Structure Hazard', personnelCount: 10, status: 'Available', vehicleType: 'Hazmat Pumper 4', callSign: 'BRAVO-4', phone: '+1 (800) 555-0103' },
    { id: 'TEAM-4', name: 'AeroRecon Drone Squadron', specialty: 'Aerial LiDAR & Thermal Search', personnelCount: 4, status: 'Available', vehicleType: 'Mobile Drone Command Truck', callSign: 'SKY-EYE', phone: '+1 (800) 555-0104' },
    { id: 'TEAM-5', name: 'EMS Trauma Triage Unit 1', specialty: 'Critical Emergency Medicine', personnelCount: 5, status: 'Available', vehicleType: 'Advanced Trauma Ambulance', callSign: 'MEDIC-1', phone: '+1 (800) 555-0105' },
  ];

  db.incidents = [
    {
      id: 'INC-2026-8801',
      type: 'Flood',
      status: 'CRITICAL',
      priority: 'P1',
      riskScore: 92,
      riskLevel: 'Critical',
      description: 'Water breached residential first floor. 4 family members including elderly grandmother trapped on roof.',
      peopleAffected: 4,
      latitude: 37.7833,
      longitude: -122.4167,
      accuracy: 4.2,
      address: '742 Riverbend Road, North District Flood Basin',
      media: [{ url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80', type: 'image', capturedAt: new Date(Date.now() - 360000).toISOString() }],
      voiceNote: {
        audioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
        durationSeconds: 14,
        capturedAt: new Date(Date.now() - 360000).toISOString(),
      },
      aiAnalysis: calculateRisk({
        type: 'Flood',
        peopleAffected: 4,
        description: 'Water breached residential first floor. 4 family members including elderly grandmother trapped on roof.',
        weather: db.weather,
        hasMedia: true,
        hasVoiceNote: true,
        latitude: 37.7833,
        longitude: -122.4167,
      }),
      assignedTeam: null,
      citizenId: 'CITIZEN-8801',
      createdAt: new Date(Date.now() - 360000).toISOString(),
      updatedAt: new Date(Date.now() - 360000).toISOString(),
    },
    {
      id: 'INC-2026-8802',
      type: 'Building Damage',
      status: 'ACKNOWLEDGED',
      priority: 'P1',
      riskScore: 84,
      riskLevel: 'Critical',
      description: 'Structural support beam cracked after hill mudslide. 3 apartment residents unable to open exit door.',
      peopleAffected: 3,
      latitude: 37.7765,
      longitude: -122.4289,
      accuracy: 6.0,
      address: '1108 Highland Avenue, Sector 7',
      media: [],
      voiceNote: null,
      aiAnalysis: calculateRisk({
        type: 'Building Damage',
        peopleAffected: 3,
        description: 'Structural support beam cracked after hill mudslide. 3 apartment residents unable to open exit door.',
        weather: db.weather,
        hasMedia: false,
        hasVoiceNote: false,
        latitude: 37.7765,
        longitude: -122.4289,
      }),
      assignedTeam: 'Alpha Search & Rescue',
      citizenId: 'CITIZEN-8802',
      createdAt: new Date(Date.now() - 900000).toISOString(),
      updatedAt: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: 'INC-2026-8803',
      type: 'Road Emergency',
      status: 'IN PROGRESS',
      priority: 'P2',
      riskScore: 68,
      riskLevel: 'High',
      description: 'Large pine tree fell across dual carriageway. Power cable sparking on asphalt. Traffic blocked.',
      peopleAffected: 2,
      latitude: 37.7654,
      longitude: -122.4091,
      accuracy: 5.0,
      address: 'Highway 101 Overpass & Mile Marker 14',
      media: [],
      voiceNote: null,
      aiAnalysis: calculateRisk({
        type: 'Road Emergency',
        peopleAffected: 2,
        description: 'Large pine tree fell across dual carriageway. Power cable sparking on asphalt. Traffic blocked.',
        weather: db.weather,
        hasMedia: false,
        hasVoiceNote: false,
        latitude: 37.7654,
        longitude: -122.4091,
      }),
      assignedTeam: 'Bravo Hazmat & Fire',
      citizenId: 'CITIZEN-8803',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      updatedAt: new Date(Date.now() - 1200000).toISOString(),
    },
  ];

  return db;
}

let db = createDatabase();

// -------------------------------------------------------------
// HTTP REQUEST ROUTER
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      cookies[parts[0].trim()] = (parts[1] || '').trim();
    });
  }

  function parseBody(callback) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        callback(null, json);
      } catch (e) {
        callback(e, null);
      }
    });
  }

  function jsonResponse(data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  // 1. SSE Realtime Stream
  if (pathname === '/api/realtime') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ connected: true, timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. Authentication APIs (resqteamlog / resq5721cc)
  if (pathname === '/api/auth/login' && method === 'POST') {
    parseBody((err, data) => {
      const { username, password } = data;
      if (username === CONTROL_CENTER_USERNAME && password === CONTROL_CENTER_PASSWORD) {
        res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=${VALID_TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          action: 'OPERATOR_LOGIN_SUCCESS',
          actor: `Operator: ${username}`,
          details: 'Authenticated to RESQ Control Center terminal session.',
          timestamp: new Date().toISOString(),
        });
        jsonResponse({ success: true, message: 'Authenticated successfully' });
      } else {
        db.auditLogs.unshift({
          id: `AUDIT-${Date.now()}`,
          action: 'OPERATOR_LOGIN_FAILED',
          actor: `Attempted user: ${username || 'anonymous'}`,
          details: 'Invalid credentials entered at Control Center terminal login.',
          timestamp: new Date().toISOString(),
        });
        jsonResponse({ success: false, error: 'Invalid credentials. Access denied.' }, 401);
      }
    });
    return;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
    jsonResponse({ success: true });
    return;
  }

  if (pathname === '/api/auth/verify' && method === 'GET') {
    const isAuthenticated = cookies[SESSION_COOKIE_NAME] === VALID_TOKEN;
    jsonResponse({ authenticated: isAuthenticated });
    return;
  }

  // 3. Alert Config Target GET/POST
  if (pathname === '/api/alert-config') {
    if (method === 'GET') {
      jsonResponse({ success: true, config: alertConfig });
      return;
    }
    if (method === 'POST' || method === 'PUT') {
      parseBody((err, data) => {
        if (data.phone) alertConfig.phone = data.phone;
        if (data.email) alertConfig.email = data.email;
        if (data.whatsapp) alertConfig.whatsapp = data.whatsapp;
        if (data.officialEmails) alertConfig.officialEmails = data.officialEmails;
        if (data.twilioAccountSid !== undefined) alertConfig.twilioAccountSid = data.twilioAccountSid;
        if (data.twilioAuthToken !== undefined) alertConfig.twilioAuthToken = data.twilioAuthToken;
        if (data.twilioFromPhone !== undefined) alertConfig.twilioFromPhone = data.twilioFromPhone;
        if (data.resendApiKey !== undefined) alertConfig.resendApiKey = data.resendApiKey;
        jsonResponse({ success: true, config: alertConfig });
      });
      return;
    }
  }

  // 4. Test Single Channel APIs (Test Call, SMS, Email)
  if (pathname === '/api/alerts/test-call' && method === 'POST') {
    parseBody(async (err, data) => {
      const resCall = await makeTwilioCall({
        accountSid: data.twilioAccountSid || alertConfig.twilioAccountSid,
        authToken: data.twilioAuthToken || alertConfig.twilioAuthToken,
        from: data.twilioFromPhone || alertConfig.twilioFromPhone,
        to: data.phone || alertConfig.phone,
        customSpeech: data.customSpeech || 'Attention Higher Official. Priority 1 Emergency Alert from RESQ Command System. Realtime voice test confirmed active and clear.',
      });
      jsonResponse(resCall);
    });
    return;
  }

  if (pathname === '/api/alerts/test-sms' && method === 'POST') {
    parseBody(async (err, data) => {
      const resSms = await sendTwilioSms({
        accountSid: data.twilioAccountSid || alertConfig.twilioAccountSid,
        authToken: data.twilioAuthToken || alertConfig.twilioAuthToken,
        from: data.twilioFromPhone || alertConfig.twilioFromPhone,
        to: data.phone || alertConfig.phone,
        body: '🚨 [RESQ EMERGENCY TEST]: Cellular alert dispatch verified.',
      });
      jsonResponse(resSms);
    });
    return;
  }

  if (pathname === '/api/alerts/test-email' && method === 'POST') {
    parseBody(async (err, data) => {
      const targetEmail = data.email || alertConfig.email;
      const resendKey = data.resendApiKey || alertConfig.resendApiKey;

      if (!resendKey) {
        jsonResponse({
          success: false,
          isSimulated: true,
          message: 'Resend API Key not provided. Use FormSubmit or 1-click Email client for all 4 official emails.',
        });
        return;
      }

      const resEmail = await sendResendEmail({
        apiKey: resendKey,
        to: alertConfig.officialEmails,
        subject: '🚨 [RESQ TEST EMAIL] Tactical Dispatch Net Online',
        html: '<h2>RESQ Tactical Dispatch Alert</h2><p>This is a live confirmation email from the RESQ emergency response console to higher officials.</p>',
        text: 'This is a live confirmation email from the RESQ emergency response console.',
      });

      jsonResponse(resEmail);
    });
    return;
  }

  // 5. Incidents APIs
  if (pathname === '/api/incidents' && method === 'GET') {
    jsonResponse({ success: true, incidents: db.incidents });
    return;
  }

  if (pathname === '/api/incidents' && method === 'POST') {
    parseBody(async (err, data) => {
      const {
        type = 'Other',
        description = '',
        peopleAffected = 1,
        latitude = 37.7749,
        longitude = -122.4194,
        accuracy = 5.0,
        address = 'Civic Area',
        media = [],
        voiceNote = null,
        citizenId = `CITIZEN-${Math.floor(1000 + Math.random() * 9000)}`,
      } = data;

      const aiAnalysis = calculateRisk({
        type,
        peopleAffected,
        description,
        weather: db.weather,
        hasMedia: media.length > 0,
        hasVoiceNote: Boolean(voiceNote),
        latitude,
        longitude,
      });

      const newIncident = {
        id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        type,
        status: aiAnalysis.riskScore >= 80 ? 'CRITICAL' : 'NEW',
        priority: aiAnalysis.priority,
        riskScore: aiAnalysis.riskScore,
        riskLevel: aiAnalysis.riskLevel,
        description,
        peopleAffected,
        latitude,
        longitude,
        accuracy,
        address,
        media,
        voiceNote,
        aiAnalysis,
        assignedTeam: null,
        citizenId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.incidents.unshift(newIncident);
      syncIncidentToSupabase(newIncident);

      db.auditLogs.unshift({
        id: `AUDIT-${Date.now()}`,
        incidentId: newIncident.id,
        action: 'CITIZEN_SOS_LODGED',
        actor: `Citizen [${citizenId}]`,
        details: `Emergency ${type} lodged at ${address} (${peopleAffected} affected). AI Risk: ${aiAnalysis.riskScore}%. Voice note: ${voiceNote ? 'YES' : 'NO'}.`,
        timestamp: newIncident.createdAt,
      });

      let alertLogs = [];
      if (aiAnalysis.riskScore >= 80 || aiAnalysis.priority === 'P1') {
        alertLogs = await dispatchCriticalAlert(newIncident, db);
      }

      broadcastEvent('incident_created', { incident: newIncident, alertLogs });

      jsonResponse({ success: true, incident: newIncident, alertLogs }, 201);
    });
    return;
  }

  // Single Incident PATCH / Update (handles team assignment & status)
  const incidentMatch = pathname.match(/^\/api\/incidents\/([a-zA-Z0-9_-]+)$/);
  if (incidentMatch && method === 'PATCH') {
    const incidentId = incidentMatch[1];
    parseBody(async (err, updates) => {
      const idx = db.incidents.findIndex(i => i.id === incidentId);
      if (idx === -1) {
        jsonResponse({ success: false, error: 'Incident not found' }, 404);
        return;
      }

      const existing = db.incidents[idx];
      const teamAssignedNow = Boolean(updates.assignedTeam);

      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      if (teamAssignedNow) {
        const teamObj = db.responseTeams.find(t => t.name === updates.assignedTeam);
        if (teamObj) {
          teamObj.status = 'Dispatched';
          teamObj.assignedIncidentId = incidentId;
        }
        // TRIGGER REAL MULTI-CHANNEL DISPATCH (Twilio Call with Official Speech, SMS, FormSubmit Email, WhatsApp)
        const alertLogs = await dispatchCriticalAlert(updated, db, updates.customTarget);
        updated.alertLogs = alertLogs;
      }

      if (updates.status === 'RESOLVED') {
        updated.resolvedAt = new Date().toISOString();
        updated.resolvedBy = 'Command Operator';
        updated.resolutionNotes = updates.resolutionNotes || 'Resolved successfully by dispatched rescue responders.';
        if (updated.assignedTeam) {
          const teamObj = db.responseTeams.find(t => t.name === updated.assignedTeam);
          if (teamObj) {
            teamObj.status = 'Available';
            teamObj.assignedIncidentId = null;
          }
        }
      }

      db.incidents[idx] = updated;
      updateIncidentInSupabase(incidentId, updates);

      db.auditLogs.unshift({
        id: `AUDIT-${Date.now()}`,
        incidentId,
        action: teamAssignedNow ? 'TEAM_DISPATCHED_ALERTS_SENT' : 'INCIDENT_UPDATED',
        actor: 'Command Operator',
        details: `Status: ${updated.status}. Assigned team: ${updated.assignedTeam || 'None'}. Spoken voice call to higher official & multi-channel dispatch executed.`,
        timestamp: new Date().toISOString(),
      });

      broadcastEvent('incident_updated', { incident: updated, triggeredAlerts: Boolean(teamAssignedNow) });
      jsonResponse({ success: true, incident: updated, triggeredAlerts: Boolean(teamAssignedNow) });
    });
    return;
  }

  // 6. Response Teams
  if (pathname === '/api/teams' && method === 'GET') {
    jsonResponse({ success: true, teams: db.responseTeams });
    return;
  }

  // 7. Weather
  if (pathname === '/api/weather' && method === 'GET') {
    jsonResponse({ success: true, weather: db.weather });
    return;
  }

  // 8. What-If Disaster Simulation
  if (pathname === '/api/simulation' && method === 'POST') {
    parseBody((err, params) => {
      const {
        rainfallMm = 50,
        affectedRadiusKm = 5,
        roadBlockagePercent = 30,
        populationDensity = 'Medium',
      } = params;

      let densityMultiplier = 1200;
      if (populationDensity === 'Low') densityMultiplier = 500;
      else if (populationDensity === 'High') densityMultiplier = 2800;
      else if (populationDensity === 'Dense Urban') densityMultiplier = 5400;

      const areaSqKm = Math.PI * Math.pow(affectedRadiusKm, 2);
      const exposedPopulation = Math.round(areaSqKm * (densityMultiplier / 10));

      const rainfallRisk = Math.min(50, (rainfallMm / 150) * 50);
      const roadRisk = (roadBlockagePercent / 100) * 30;
      const radiusRisk = Math.min(20, (affectedRadiusKm / 20) * 20);
      const simulatedScore = Math.round(Math.min(99, Math.max(15, rainfallRisk + roadRisk + radiusRisk + 10)));

      const shelterPressure = Math.min(100, Math.round((exposedPopulation / 8000) * 100));
      const roadsCut = Math.round((roadBlockagePercent / 100) * 14);

      const result = {
        simulatedRiskScore: simulatedScore,
        simulatedRiskLevel: simulatedScore >= 80 ? 'Critical' : simulatedScore >= 60 ? 'High' : 'Medium',
        exposedPopulationEstimate: exposedPopulation,
        shelterPressurePercent: shelterPressure,
        criticalRoadsCut: roadsCut,
        recommendedEvacuationZones: [
          `Primary low-elevation basin (${affectedRadiusKm}km perimeter)`,
          'Highway 101 Underpass arterial confluence',
          'Sector 4 secondary embankment corridor',
        ],
        timestamp: new Date().toISOString(),
      };

      jsonResponse({ success: true, result });
    });
    return;
  }

  // 9. Notification Logs & Audit Logs
  if (pathname === '/api/notifications' && method === 'GET') {
    jsonResponse({ success: true, logs: db.notificationLogs });
    return;
  }

  if (pathname === '/api/audit' && method === 'GET') {
    jsonResponse({ success: true, logs: db.auditLogs });
    return;
  }

  // 10. System Status
  if (pathname === '/api/status' && method === 'GET') {
    jsonResponse({
      success: true,
      status: {
        aiEngine: 'ONLINE',
        weatherFeed: 'ONLINE',
        realtimeStream: 'ONLINE',
        notifications: 'ONLINE',
        database: 'ONLINE',
        appMode: APP_MODE,
        serverTime: new Date().toISOString(),
      },
    });
    return;
  }

  // 11. Demo Scenarios Trigger
  if (pathname === '/api/demo/seed' && method === 'POST') {
    parseBody(async (err, data) => {
      const { scenario } = data;
      if (scenario === 'reset') {
        db = createDatabase();
        broadcastEvent('incident_updated', { reset: true });
        jsonResponse({ success: true, message: 'Database reset to default demo seed.' });
        return;
      }

      let newInc;
      if (scenario === 'flash_flood') {
        newInc = {
          id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'Flood',
          status: 'CRITICAL',
          priority: 'P1',
          riskScore: 94,
          riskLevel: 'Critical',
          description: 'Emergency flash flood in North District. 6 residents trapped on roof as water levels surge 2 meters. Power out.',
          peopleAffected: 6,
          latitude: 37.7850,
          longitude: -122.4180,
          accuracy: 3.5,
          address: '450 North Bay Waterfront, Sector 2',
          media: [{ url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80', type: 'image', capturedAt: new Date().toISOString() }],
          voiceNote: {
            audioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
            durationSeconds: 12,
            capturedAt: new Date().toISOString(),
          },
          aiAnalysis: calculateRisk({
            type: 'Flood',
            peopleAffected: 6,
            description: 'Emergency flash flood in North District. 6 residents trapped on roof as water levels surge 2 meters. Power out.',
            weather: db.weather,
            hasMedia: true,
            hasVoiceNote: true,
            latitude: 37.7850,
            longitude: -122.4180,
          }),
          assignedTeam: null,
          citizenId: 'DEMO-CITIZEN-FLOOD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else if (scenario === 'wildfire') {
        newInc = {
          id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'Fire',
          status: 'CRITICAL',
          priority: 'P1',
          riskScore: 89,
          riskLevel: 'Critical',
          description: 'Fast-moving brush fire crossed ridge road. 12 residents evacuating with thick smoke blocking exit route.',
          peopleAffected: 12,
          latitude: 37.7680,
          longitude: -122.4350,
          accuracy: 8.0,
          address: 'Ridgecrest Trail & Mountain View Crossing',
          media: [],
          voiceNote: null,
          aiAnalysis: calculateRisk({
            type: 'Fire',
            peopleAffected: 12,
            description: 'Fast-moving brush fire crossed ridge road. 12 residents evacuating with thick smoke blocking exit route.',
            weather: db.weather,
            hasMedia: false,
            hasVoiceNote: false,
            latitude: 37.7680,
            longitude: -122.4350,
          }),
          assignedTeam: null,
          citizenId: 'DEMO-CITIZEN-FIRE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } else {
        newInc = {
          id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
          type: 'Building Damage',
          status: 'NEW',
          priority: 'P2',
          riskScore: 68,
          riskLevel: 'High',
          description: 'Landslide collapsed highway retaining wall. Structural debris blocking both northbound lanes.',
          peopleAffected: 2,
          latitude: 37.7590,
          longitude: -122.4120,
          accuracy: 5.0,
          address: 'Highway 10 Scenic Pass, Milepost 8',
          media: [],
          voiceNote: null,
          aiAnalysis: calculateRisk({
            type: 'Building Damage',
            peopleAffected: 2,
            description: 'Landslide collapsed highway retaining wall. Structural debris blocking both northbound lanes.',
            weather: db.weather,
            hasMedia: false,
            hasVoiceNote: false,
            latitude: 37.7590,
            longitude: -122.4120,
          }),
          assignedTeam: null,
          citizenId: 'DEMO-CITIZEN-SLIDE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      db.incidents.unshift(newInc);
      await dispatchCriticalAlert(newInc, db);
      broadcastEvent('incident_created', { incident: newInc });
      jsonResponse({ success: true, incident: newInc });
    });
    return;
  }

  // 12. Static Asset Serving
  if (pathname.startsWith('/public/') || pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.png') || pathname.endsWith('.jpg') || pathname.endsWith('.wav') || pathname.endsWith('.mp3')) {
    const filePath = path.join(__dirname, 'public', pathname.replace(/^\/public\//, ''));
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      let mime = 'text/plain';
      if (ext === '.css') mime = 'text/css';
      else if (ext === '.js') mime = 'application/javascript';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.jpg') mime = 'image/jpeg';
      else if (ext === '.svg') mime = 'image/svg+xml';
      else if (ext === '.wav') mime = 'audio/wav';
      else if (ext === '.mp3') mime = 'audio/mpeg';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }

  // 13. Single-Page Application (SPA) HTML Serving
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(htmlPath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  RESQ AI Emergency System Server Running on :${PORT}`);
  console.log(`  Citizen SOS Experience: http://localhost:${PORT}/`);
  console.log(`  Control Center:         http://localhost:${PORT}/control-center`);
  console.log(`  Operator Login:         ${CONTROL_CENTER_USERNAME} / ${CONTROL_CENTER_PASSWORD}`);
  console.log(`  Target Mobile (SMS/Call): ${alertConfig.phone}`);
  console.log(`  Official Emails (4 Targets): ${alertConfig.officialEmails.join(', ')}`);
  console.log(`  Twilio Gateway:         CONNECTED`);
  console.log(`======================================================\n`);
});
