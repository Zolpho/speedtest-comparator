# Speedtest Comparator

A self-hosted web app to compare two [Ookla Speedtest](https://www.speedtest.net) results side by side, with AI-powered auto-fill via Google Gemini Vision.

---

## Features

- 📸 **Screenshot upload** — drag & drop or click to upload Ookla Speedtest screenshots for Test A and Test B
- 🤖 **AI Auto-fill** — powered by Gemini 2.5 Flash Lite; extracts all metrics automatically from the screenshot (speeds, ping, jitter, packet loss, carrier, device, server location, GPS coordinates)
- 📊 **Side-by-side comparison** — metric cards with winner highlighting, progress bars, and overall score
- 🗺️ **Map view** — plots both test locations on OpenStreetMap via Leaflet.js (when GPS is available)
- 📍 **GPS detection** — browser geolocation on HTTPS, or IP-based fallback on HTTP
- 💾 **History** — all comparisons saved to a local JSON file (`data/results.json`); viewable and deletable from the History tab
- 🔐 **Password-protected** — AI parse endpoint requires `APP_PASSWORD` via `x-app-password` header
- 📖 **Docs** — links to internal Confluence wiki

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js · Express |
| AI | Google Gemini 2.5 Flash Lite (Vision) |
| Storage | JSON flat file (`data/results.json`) |
| Frontend | Vanilla JS · HTML/CSS (single file) |
| Map | Leaflet.js · OpenStreetMap |
| Reverse proxy | Nginx + Let's Encrypt (production) |

---

## Project Structure

```
speedtest-comparator/
├── public/
│   └── index.html        # Single-page frontend (all JS/CSS inline)
├── data/
│   └── results.json      # Auto-created on first run
├── server.js             # Express backend + Gemini API integration
├── .env                  # Local secrets (not committed)
└── package.json
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/results` | No | Fetch all saved comparisons |
| `POST` | `/api/results` | No | Save a comparison result |
| `DELETE` | `/api/results/:id` | No | Delete a comparison by ID |
| `POST` | `/api/parse` | `x-app-password` | Parse a screenshot with Gemini Vision |

---

## Self-Host

### Requirements

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)

### Setup

```bash
git clone https://github.com/Zolpho/speedtest-comparator.git
cd speedtest-comparator
npm install
```

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
APP_PASSWORD=your_secret_password_here
PORT=3000
```

Run:

```bash
node server.js
# → SpeedTest running on port 3000
```

### Production (Nginx + HTTPS)

```nginx
server {
    listen 443 ssl;
    server_name speedtest.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/speedtest.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/speedtest.yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

> **Note:** Running over HTTPS enables browser GPS (`navigator.geolocation`). On plain HTTP, the app falls back to IP-based geolocation automatically.

---

## How It Works

1. Upload screenshots of two Ookla Speedtest results (Test A and Test B)
2. Click **🤖 Auto-fill** — the image is sent as base64 to `/api/parse`, which forwards it to Gemini Vision with a structured prompt
3. Gemini returns a JSON object with all extracted metrics, which are auto-populated into the form
4. Click **Compare** to generate the side-by-side view with winner badges and an overall score
5. Click **💾 Save to History** to persist the result locally

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Google Gemini API key |
| `APP_PASSWORD` | ⚠️ Recommended | Password for the `/api/parse` endpoint |
| `PORT` | No | HTTP port (default: `3000`) |

