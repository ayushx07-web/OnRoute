# 🚌 OnRoute — Real-Time Commute Intelligence

> *Priya leaves home at 8:15 to catch her 8:22 bus. Some days it comes early. Some days it's late. Most days, she's just guessing. OnRoute fixes that.*

## 🎯 What It Does

OnRoute is a real-time Delhi bus tracker and AI-powered commute advisor. It tells commuters:
- **Exactly when to leave home** — not just when the bus arrives
- **How delayed the bus is** — with a confidence score
- **How crowded** the bus will be
- **What to do** — via an AI advisor that gives short, direct advice

## 🚀 Live Demo

🔗 **[https://on-route-five.vercel.app](https://on-route-five.vercel.app)**

**Demo Mode built-in** → Click `DEMO` in the app header to load Priya's scenario:
- Route: DTC 534 (Dwarka Sec-10 → Connaught Place)
- Time: 8:15 AM rush hour
- Walk time: 5 minutes
- Question: Should she leave now?

## ✨ Features

| Feature | Description |
|---|---|
| 🔴 Live Board | Next 3 buses with ETA, delay, occupancy, confidence bar — refreshes every 6s |
| 📅 Smart Plan | "Leave in X mins" countdown + smart text recommendation |
| 🤖 AI Advisor | Chat with Claude AI using real-time bus data as context |
| 📱 WhatsApp Mode | Plain-text format for sharing via SMS/WhatsApp — works on 2G |
| 📶 Low-Data Mode | Disables animations, 60s refresh, minimal bandwidth |
| 🎭 Demo Mode | Pre-loaded Priya's commute scenario for instant testing |

## 🧠 Prediction Engine

Not just displaying data — **actually predicting delays**:

- **Rush hour detection** — 7–9 AM & 5–8 PM multiply delays by 2.6×
- **Confidence scoring** — 40–95% based on route variance and time-of-day
- **Leave-by calculator** — `ETA − walk time − 2 min buffer`
- **Occupancy forecasting** — rush hour: 60–95%, off-peak: 20–70%

## 📦 Tech Stack

- **React 18** — UI framework
- **Vite 5** — dev server & build tool
- **Groq + Llama 3.3 70B** — AI commute advisor (free tier)
- **Vanilla CSS-in-JS** — zero dependencies for styling

## 🛠️ Run Locally

```bash
git clone https://github.com/ayushx07-web/OnRoute.git
cd OnRoute
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 📱 Low-Data / WhatsApp Support

OnRoute works for **every commuter**, not just smartphone users:

- ✅ WhatsApp bots can send the text format automatically
- ✅ Works on 2G / basic feature phones  
- ✅ < 1KB per update — minimal data usage
- ✅ SMS fallback compatible
- ✅ No app install required for text mode

## 🗺️ Supported Routes (Delhi DTC Simulation)

| Route | From | To | Stops |
|---|---|---|---|
| DTC 534 | Dwarka Sec-10 | Connaught Place | 18 |
| DTC 423 | Rohini East | ISBT Kashmere Gate | 24 |
| DTC 731 | Lajpat Nagar | Janakpuri | 15 |
| Feeder F47 | Noida City Centre | Botanical Garden | 8 |
| Cluster 9 | Saket Terminal | Nehru Place | 6 |

## 💡 Why This Works

Real commuters don't need more data — they need **clarity**. OnRoute answers one question:
> *"Should I leave right now?"*

Every feature is built around that single decision moment.

---

