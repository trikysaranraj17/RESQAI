const https = require('https');
const querystring = require('querystring');

const twimlXml = `<Response><Say voice="alice">Attention Higher Official. Priority 1 Emergency Alert from RESQ Command Center. Flash flood emergency in progress at 742 Riverbend Road. 4 citizens trapped on rooftop. AI calculated risk level is 92 percent critical. Alpha Search and Rescue team is dispatched. Please mobilize immediate tactical response.</Say></Response>`;
const twimlUrl = `https://twimlets.com/echo?Twiml=${encodeURIComponent(twimlXml)}`;

const postData = querystring.stringify({
  To: '+918838225583',
  From: '+17372212163',
  Url: twimlUrl,
});

const auth = Buffer.from('AC55deeb28ea81530d98623bdf3dbb956f:3de79206f9a2dcfa1f0ba3c0844733bf').toString('base64');

const req = https.request({
  hostname: 'api.twilio.com',
  port: 443,
  path: '/2010-04-01/Accounts/AC55deeb28ea81530d98623bdf3dbb956f/Calls.json',
  method: 'POST',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
}, (res) => {
  let d = '';
  res.on('data', chunk => { d += chunk; });
  res.on('end', () => {
    console.log('VOICE CALL STATUS:', res.statusCode);
    console.log(d);
  });
});

req.on('error', console.error);
req.write(postData);
req.end();
