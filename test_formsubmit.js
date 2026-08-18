const https = require('https');

const targetEmails = [
  'trikysaran5721@gmail.com',
  'mediaestelle7@gmail.com',
  'nandhini301107@gmail.com',
  'kavipriyaps2401@gmail.com'
];

async function sendFormSubmitEmail(email, payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      _subject: `🚨 [RESQ EMERGENCY DISPATCH] ${payload.priority} Priority - ${payload.type}`,
      _template: 'table',
      _captcha: 'false',
      _autoresponse: 'This is an automated tactical emergency dispatch from the RESQ AI Incident Command System.',
      'Emergency Incident ID': payload.id,
      'Disaster Category': payload.type,
      'Priority Classification': payload.priority,
      'AI Risk Score': `${payload.riskScore}% (${payload.riskLevel})`,
      'Casualties / Trapped Citizens': `${payload.peopleAffected} Person(s)`,
      'Citizen ID': payload.citizenId || 'CITIZEN-SOS-DIRECT',
      'Incident Location': payload.address,
      'GPS Coordinates': `${payload.latitude}, ${payload.longitude}`,
      'Situation Assessment': payload.description,
      'Assigned Response Unit': payload.assignedTeam || 'Deploying Immediate Alpha SAR',
      'Weather Condition': payload.weatherCondition || 'Heavy Rain (42mm/h), Wind 34 km/h',
      'Dispatch Timestamp': new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      'Command Center Action Required': 'URGENT - Dispatch commanders and designated officials must verify mobilization of personnel.'
    });

    const options = {
      hostname: 'formsubmit.co',
      port: 443,
      path: `/ajax/${encodeURIComponent(email)}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'RESQ-AI-Command-System'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`FormSubmit [${email}] STATUS: ${res.statusCode} -> ${data}`);
        resolve({ email, status: res.statusCode, response: data });
      });
    });

    req.on('error', (err) => {
      console.error(`FormSubmit error for ${email}:`, err.message);
      resolve({ email, status: 'error', error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  const dummyIncident = {
    id: 'INC-2026-8801',
    type: 'Flood & Rooftop Evacuation',
    priority: 'P1 CRITICAL',
    riskScore: 92,
    riskLevel: 'CRITICAL LIFE SAFETY',
    peopleAffected: 4,
    citizenId: 'CITIZEN-8801',
    address: '742 Riverbend Road, North District Flood Basin',
    latitude: 37.7833,
    longitude: -122.4167,
    description: 'Water breached residential 1st floor. 4 family members including elderly citizen trapped on roof. Power grid disconnected.',
    assignedTeam: 'Alpha Search & Rescue (Unit 1)',
    weatherCondition: 'Torrential Precipitation (42mm/h), 34km/h Gusts'
  };

  for (const email of targetEmails) {
    await sendFormSubmitEmail(email, dummyIncident);
  }
}

run();
