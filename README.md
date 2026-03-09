# Speedtest Comparator

A self-hosted web app to compare two Ookla Speedtest results side by side.

## Features
- 📸 Upload screenshots → AI auto-fill via Gemini Vision
- 📊 Side-by-side metric cards (download, upload, ping, jitter, packet loss)
- 🗺️ Test location map via OpenStreetMap
- 💾 History with SQLite storage
- 🔐 Password-protected AI endpoint

## Stack
Node.js · Express · SQLite · Google Gemini Vision API · Leaflet.js

## Self-host
```bash
cp .env.example .env   # fill in GEMINI_API_KEY and APP_PASSWORD
npm install
node server.js
