const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const DB_FILE = path.join(__dirname, 'data', 'results.json');

if (!fs.existsSync(path.dirname(DB_FILE))) fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const readDB  = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = data => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

app.get('/api/results', (_, res) => res.json(readDB()));
app.post('/api/results', (req, res) => {
  const db = readDB();
  db.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...req.body });
  writeDB(db);
  res.json({ success: true });
});
app.delete('/api/results/:id', (req, res) => {
  writeDB(readDB().filter(r => String(r.id) !== req.params.id));
  res.json({ success: true });
});
const MTR_FILE = path.join(__dirname, 'data', 'mtr_results.json');
if (!fs.existsSync(MTR_FILE)) fs.writeFileSync(MTR_FILE, '[]');
const readMTR  = () => JSON.parse(fs.readFileSync(MTR_FILE, 'utf8'));
const writeMTR = data => fs.writeFileSync(MTR_FILE, JSON.stringify(data, null, 2));

app.get('/api/mtr', (_, res) => res.json(readMTR()));
app.post('/api/mtr', (req, res) => {
  const db = readMTR();
  db.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...req.body });
  writeMTR(db);
  res.json({ success: true });
});
app.delete('/api/mtr/:id', (req, res) => {
  writeMTR(readMTR().filter(r => String(r.id) !== req.params.id));
  res.json({ success: true });
});

const IPERF_FILE = path.join(__dirname, 'data', 'iperf_results.json');
if (!fs.existsSync(IPERF_FILE)) fs.writeFileSync(IPERF_FILE, '[]');
const readIperf  = () => JSON.parse(fs.readFileSync(IPERF_FILE, 'utf8'));
const writeIperf = data => fs.writeFileSync(IPERF_FILE, JSON.stringify(data, null, 2));

app.get('/api/iperf', (_, res) => res.json(readIperf()));
app.post('/api/iperf', (req, res) => {
  const db = readIperf();
  db.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...req.body });
  writeIperf(db);
  res.json({ success: true });
});
app.delete('/api/iperf/:id', (req, res) => {
  writeIperf(readIperf().filter(r => String(r.id) !== req.params.id));
  res.json({ success: true });
});

const IPERFMAN_FILE = path.join(__dirname, 'data', 'iperfman.json');
if (!fs.existsSync(IPERFMAN_FILE)) fs.writeFileSync(IPERFMAN_FILE, '[]');
const readIperfman  = () => JSON.parse(fs.readFileSync(IPERFMAN_FILE, 'utf8'));
const writeIperfman = data => fs.writeFileSync(IPERFMAN_FILE, JSON.stringify(data, null, 2));

app.get('/api/iperfman', (_, res) => res.json(readIperfman()));
app.post('/api/iperfman', (req, res) => {
  const db = readIperfman();
  db.unshift({ id: Date.now(), savedAt: new Date().toISOString(), ...req.body });
  writeIperfman(db);
  res.json({ success: true });
});
app.delete('/api/iperfman/:id', (req, res) => {
  writeIperfman(readIperfman().filter(r => String(r.id) !== req.params.id));
  res.json({ success: true });
});

function checkAuth(req, res) {
  const pw = process.env.APP_PASSWORD;
  if (pw && req.headers['x-app-password'] !== pw) {
    res.status(401).json({ error: 'Invalid password' });
    return false;
  }
  return true;
}

function geminiRequest(base64data, mimeType, prompt, cb) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return cb(new Error('GEMINI_API_KEY not set'), null);

  const body = JSON.stringify({
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64data } }
      ]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 800 }
  });

  const opts = {
    hostname: 'generativelanguage.googleapis.com',
    path: '/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + apiKey,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = https.request(opts, apiRes => {
    let data = '';
    apiRes.on('data', c => data += c);
    apiRes.on('end', () => {
      console.log('[gemini] HTTP ' + apiRes.statusCode + ' | ' + data.slice(0, 300));
      try {
        const j = JSON.parse(data);
        if (j.error) {
          const msg = j.error.message || JSON.stringify(j.error);
          // Log the model used so we can track issues
          console.log('[gemini] model: gemini-2.5-flash-lite | error: ' + msg.slice(0, 120));
          return cb(new Error(msg.slice(0, 200)), null);
        }
        const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
        cb(null, text);
      } catch (e) {
        cb(new Error('Response parse error: ' + data.slice(0, 200)), null);
      }
    });
  });
  req.on('error', cb);
  req.write(body);
  req.end();
}

const PROMPT = [
  'Extract all data from this Ookla Speedtest screenshot. Return ONLY a raw JSON object, no markdown fences.',
  '',
  'LAYOUT:',
  '- TOP BAR: date "MM/DD/YYYY H:MM AM/PM" and "Test ID XXXXXXXXXX"',
  '- SPEED: large DOWNLOAD Mbps number; "Data Used X,XXX.X MB" below it = dataDown; large UPLOAD Mbps number; "Data Used X.X MB" below it = dataUp. Strip commas: 1,268.2 → 1268.2',
  '- PING section (Idle | Download | Upload columns): each column has one BIG central number = ping. Below it: Low, High, Jitter. Use BIG number as ping, Jitter value as jitter. Ignore Low/High.',
  '- CONNECTIONS panel: "Connection" = carrier + network badge (5G/4G/WiFi). "Device" = FULL name every word (e.g. iPhone 17 Pro Max). "User Location" = Lat X.XXX and Lon X.XXX. City name shown.',
  '- SERVER section: shows the speedtest server used. "location" = server provider name + " (" + server city + ")". Example: "Wingo SA (Zurich)". If only city visible, use "Unknown (City)".',
  '',
  'Date conversion: MM/DD/YYYY H:MM AM/PM → DD.MM.YYYY HH:MM (24h). Example: 03/06/2026 4:25 PM → 06.03.2026 16:25',
  '',
  'Return (null if not visible):',
  '{"date":"DD.MM.YYYY HH:MM","testId":"string","download":number,"upload":number,"dataDown":number,"dataUp":number,"idlePing":number,"idleJitter":number,"downloadPing":number,"downloadJitter":number,"uploadPing":number,"uploadJitter":number,"packetLoss":number,"carrier":"string","connectionType":"string","device":"full name","lat":number_or_null,"lon":number_or_null,"location":"Provider (City) or null"}'
].join('\n');

app.post('/api/parse', (req, res) => {
  if (!checkAuth(req, res)) return;
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  // Strip data URL prefix → base64 + mime
  const match = image.match(/^data:([a-z/]+);base64,(.+)$/s);
  if (!match) return res.status(400).json({ error: 'Invalid image format' });
  const [, mimeType, base64] = match;

  geminiRequest(base64, mimeType, PROMPT, (err, text) => {
    if (err) return res.status(500).json({ error: err.message });
    console.log('[gemini] output:', text.slice(0, 600));
    try {
      const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response: ' + clean.slice(0, 200));
      res.json({ success: true, data: JSON.parse(jsonMatch[0]) });
    } catch (e) {
      res.status(500).json({ error: e.message, raw: text.slice(0, 500) });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('SpeedTest running on port ' + PORT));

