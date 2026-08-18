const https = require('https');

const targetEmails = [
  'trikysaran5721@gmail.com',
  'mediaestelle7@gmail.com',
  'nandhini301107@gmail.com',
  'kavipriyaps2401@gmail.com'
];

// Web3Forms public access key for instant multi-email delivery or FormSubmit
async function sendWeb3FormsAlert(email, incident) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      access_key: 'a0b9e248-18e3-4663-875f-fb94e1d6c8b9', // Standard public key or email target
      subject: `🚨 [RESQ EMERGENCY DISPATCH] ${incident.priority}: ${incident.type} - Higher Official Briefing`,
      from_name: 'RESQ Emergency Command System',
      to: email,
      message: `
🚨 RESQ TACTICAL INCIDENT DISPATCH BRIEFING 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident ID: ${incident.id}
Citizen Report ID: ${incident.citizenId || 'CITIZEN-8801'}
Emergency Category: ${incident.type}
Priority Level: ${incident.priority}
AI Risk Assessment Score: ${incident.riskScore}% (${incident.riskLevel})

INCIDENT LOCATION & TELEMETRY:
Location Address: ${incident.address}
GPS Coordinates: ${incident.latitude}, ${incident.longitude}
Affected Citizens / Casualties: ${incident.peopleAffected} Person(s)

SITUATION SUMMARY:
${incident.description}

ASSIGNED TACTICAL TEAM:
Unit: ${incident.assignedTeam || 'Alpha Search & Rescue (Unit 1)'}
Status: DISPATCHED & ACTIVE
Timestamp: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

DIRECTIVE TO HIGHER OFFICIAL:
Please acknowledge receipt and monitor emergency response progress in the RESQ Control Center.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `
    });

    const req = https.request({
      hostname: 'api.web3forms.com',
      port: 443,
      path: '/submit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`WEB3FORMS [${email}] -> STATUS: ${res.statusCode}`, data);
        resolve({ email, status: res.statusCode, response: data });
      });
    });

    req.on('error', err => {
      console.error(`WEB3FORMS Error [${email}]:`, err.message);
      resolve({ email, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function testAll() {
  const dummyIncident = {
    id: 'INC-2026-8801',
    type: 'Flash Flood & Trapped Citizens',
    priority: 'P1 CRITICAL',
    riskScore: 92,
    riskLevel: 'Critical',
    peopleAffected: 4,
    citizenId: 'CITIZEN-8801',
    address: '742 Riverbend Road, North District Flood Basin',
    latitude: 37.7833,
    longitude: -122.4167,
    description: 'Water surged past 1st floor residential structures. 4 individuals stranded on rooftop with power out.',
    assignedTeam: 'Alpha Search & Rescue (Unit 1)'
  };

  for (const email of targetEmails) {
    await sendWeb3FormsAlert(email, dummyIncident);
  }
}

testAll();
