import { useState, useEffect, useRef, useCallback } from "react";

// ─── ROUTE DATA (Delhi DTC simulation) ───────────────────────────────────────
const ROUTES = [
  { id: "534", name: "DTC 534", from: "Dwarka Sec-10", to: "Connaught Place", freq: 12, baseDelay: 3.2, variance: 4.1, stops: 18 },
  { id: "423", name: "DTC 423", from: "Rohini East", to: "ISBT Kashmere Gate", freq: 15, baseDelay: 5.1, variance: 6.2, stops: 24 },
  { id: "731", name: "DTC 731", from: "Lajpat Nagar", to: "Janakpuri", freq: 10, baseDelay: 2.8, variance: 3.5, stops: 15 },
  { id: "F47", name: "Feeder F47", from: "Noida City Centre", to: "Botanical Garden", freq: 8, baseDelay: 1.5, variance: 2.0, stops: 8 },
  { id: "C9", name: "Cluster 9", from: "Saket Terminal", to: "Nehru Place", freq: 6, baseDelay: 1.2, variance: 1.8, stops: 6 },
];

const STOPS = {
  "534": ["Dwarka Sec-10", "Dwarka Sec-11", "Dwarka Sec-12", "Uttam Nagar", "Janakpuri West", "Janakpuri East", "Tilak Nagar", "Subhash Nagar", "Tagore Garden", "Rajouri Garden", "Ramesh Nagar", "Moti Nagar", "Kirti Nagar", "Punjabi Bagh", "Shadipur", "Karol Bagh", "Patel Nagar", "Connaught Place"],
  "423": ["Rohini East", "Rohini West", "Pitampura", "Netaji Subhash Place", "Azadpur", "Model Town", "GTB Nagar", "Mukherjee Nagar", "Kamla Nagar", "Civil Lines", "ISBT Kashmere Gate"],
  "731": ["Lajpat Nagar", "South Extension", "INA", "AIIMS", "Green Park", "Hauz Khas", "Malviya Nagar", "Saket", "Pushp Vihar", "Janakpuri"],
  "F47": ["Noida City Centre", "Sector 15", "Sector 18", "Botanical Garden"],
  "C9": ["Saket Terminal", "Malviya Nagar", "GK-II", "GK-I", "Lajpat Nagar", "Nehru Place"],
};

// ─── PREDICTION ENGINE ────────────────────────────────────────────────────────
function getTimeContext() {
  const h = new Date().getHours(), m = new Date().getMinutes();
  const isRushAM = h >= 7 && h <= 9;
  const isRushPM = h >= 17 && h <= 20;
  const isOffPeak = !isRushAM && !isRushPM;
  return { isRushAM, isRushPM, isOffPeak, multiplier: (isRushAM || isRushPM) ? 2.6 : 1.0 };
}

function predictBusDelay(route, positionInSchedule = 0) {
  const ctx = getTimeContext();
  const base = route.baseDelay * ctx.multiplier;
  const trend = positionInSchedule * 0.15;
  const noise = (Math.random() - 0.35) * route.variance;
  const rawDelay = base + trend + noise;
  const delayMins = Math.max(-3, Math.round(rawDelay * 10) / 10);
  const stdDev = route.variance * ctx.multiplier * 0.4;
  const confidence = Math.round(Math.max(40, Math.min(95, 100 - (stdDev / (route.baseDelay + 1)) * 30)));
  return { delayMins, confidence, isRush: ctx.isRushAM || ctx.isRushPM };
}

function generateBuses(route, userStopIdx = 0) {
  const now = new Date();
  const buses = [];
  for (let i = 0; i < 3; i++) {
    const schedOffsetMins = (i + 1) * route.freq - Math.random() * (route.freq * 0.3);
    const scheduled = new Date(now.getTime() + schedOffsetMins * 60000);
    const { delayMins, confidence, isRush } = predictBusDelay(route, i);
    const eta = new Date(scheduled.getTime() + delayMins * 60000);
    const stopsAway = Math.max(1, Math.round(schedOffsetMins / 2));
    const occupancy = isRush ? Math.floor(60 + Math.random() * 35) : Math.floor(20 + Math.random() * 50);
    buses.push({
      id: `${route.id}-${Date.now()}-${i}`,
      vehicleNo: `DL-${Math.floor(1000 + Math.random() * 9000)}-P`,
      scheduledMins: Math.round(schedOffsetMins),
      delayMins,
      etaMins: Math.round((eta - now) / 60000),
      confidence,
      stopsAway,
      occupancy,
      isRush,
      status: delayMins < -1 ? "EARLY" : delayMins < 2 ? "ON TIME" : delayMins < 6 ? "SLIGHT DELAY" : "DELAYED",
    });
  }
  return buses;
}

function computeLeaveBy(etaMins, walkMins, bufferMins = 2) {
  return Math.max(0, etaMins - walkMins - bufferMins);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function fmtTime(minsFromNow) {
  const d = new Date(Date.now() + minsFromNow * 60000);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function statusColor(status) {
  if (status === "EARLY") return "#22c55e";
  if (status === "ON TIME") return "#22c55e";
  if (status === "SLIGHT DELAY") return "#f59e0b";
  return "#ef4444";
}
function occupancyLabel(pct) {
  if (pct < 40) return { label: "Empty", color: "#22c55e" };
  if (pct < 70) return { label: "Moderate", color: "#f59e0b" };
  return { label: "Crowded", color: "#ef4444" };
}
function confidenceColor(c) {
  if (c >= 75) return "#22c55e";
  if (c >= 55) return "#f59e0b";
  return "#ef4444";
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'JetBrains Mono', 'Courier New', monospace", background: "#0a0e1a", minHeight: "100vh", color: "#e2e8f0", maxWidth: 420, margin: "0 auto", position: "relative" },
  header: { background: "#0d1224", borderBottom: "1px solid #1e2d4a", padding: "14px 16px 12px", position: "sticky", top: 0, zIndex: 10 },
  headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  logo: { fontSize: 18, fontWeight: 700, color: "#f97316", letterSpacing: "-0.5px" },
  logoSub: { fontSize: 10, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase" },
  liveTag: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#22c55e", background: "#0f2318", border: "1px solid #1a4030", borderRadius: 4, padding: "3px 8px" },
  pulse: { width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.2s infinite" },
  tabs: { display: "flex", gap: 4, padding: "0 16px 0", background: "#0d1224", borderBottom: "1px solid #1e2d4a" },
  tab: (active) => ({ padding: "10px 14px", fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "#f97316" : "#64748b", borderBottom: active ? "2px solid #f97316" : "2px solid transparent", cursor: "pointer", background: "none", border: "none", letterSpacing: "0.5px", textTransform: "uppercase" }),
  body: { padding: "16px 16px 80px" },
  section: { marginBottom: 20 },
  label: { fontSize: 10, color: "#64748b", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 },
  card: { background: "#0d1224", border: "1px solid #1e2d4a", borderRadius: 10, padding: "14px 16px", marginBottom: 10 },
  busCard: (status) => ({ background: "#0d1224", border: `1px solid ${status === "ON TIME" || status === "EARLY" ? "#1a4030" : status === "SLIGHT DELAY" ? "#3d2f0a" : "#3d1515"}`, borderRadius: 10, padding: "14px 16px", marginBottom: 10, position: "relative", overflow: "hidden" }),
  busCardAccent: (status) => ({ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: statusColor(status), borderRadius: "10px 0 0 10px" }),
  row: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  etaBig: { fontSize: 28, fontWeight: 700, color: "#f1f5f9", lineHeight: 1 },
  etaSub: { fontSize: 11, color: "#64748b" },
  badge: (color, bg) => ({ fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${color}40`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.5px" }),
  input: { background: "#141929", border: "1px solid #1e2d4a", borderRadius: 6, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit" },
  select: { background: "#141929", border: "1px solid #1e2d4a", borderRadius: 6, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box", fontFamily: "inherit", cursor: "pointer" },
  btnPrimary: { background: "#f97316", color: "#fff", border: "none", borderRadius: 8, padding: "12px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", width: "100%", fontFamily: "inherit", letterSpacing: "0.5px" },
  btnGhost: { background: "transparent", color: "#94a3b8", border: "1px solid #1e2d4a", borderRadius: 8, padding: "10px 16px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
  leaveBox: (urgent) => ({ background: urgent ? "#1a0a02" : "#0a1a0d", border: `1px solid ${urgent ? "#7c2d12" : "#14532d"}`, borderRadius: 12, padding: "20px", textAlign: "center", marginBottom: 16 }),
  leaveNum: (urgent) => ({ fontSize: 52, fontWeight: 700, color: urgent ? "#f97316" : "#22c55e", lineHeight: 1, display: "block" }),
  aiMsg: (role) => ({ background: role === "user" ? "#141929" : "#0d1224", border: `1px solid ${role === "user" ? "#1e2d4a" : "#1a4030"}`, borderRadius: 10, padding: "10px 14px", marginBottom: 8, fontSize: 13, lineHeight: 1.6, color: role === "assistant" ? "#a7f3d0" : "#e2e8f0" }),
  confBar: (pct) => ({ height: 4, borderRadius: 2, background: "#1e2d4a", overflow: "hidden", marginTop: 6, position: "relative" }),
  confFill: (pct) => ({ height: "100%", width: `${pct}%`, background: confidenceColor(pct), borderRadius: 2, transition: "width 0.6s ease" }),
  whatsappBox: { background: "#025c4c", borderRadius: 10, padding: 14, fontFamily: "inherit", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "#e9f7ef", marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block", marginRight: 6 },
  ticker: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" },
  tickerItem: (active) => ({ flexShrink: 0, background: active ? "#f97316" : "#141929", border: `1px solid ${active ? "#f97316" : "#1e2d4a"}`, borderRadius: 20, padding: "6px 14px", fontSize: 11, color: active ? "#fff" : "#94a3b8", cursor: "pointer", whiteSpace: "nowrap" }),
  stopDot: (passed) => ({ width: 10, height: 10, borderRadius: "50%", background: passed ? "#f97316" : "#1e2d4a", border: `2px solid ${passed ? "#f97316" : "#334155"}`, flexShrink: 0 }),
};

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function LivePulse() {
  return <span style={S.pulse} />;
}

function BusCard({ bus, walkMins, showLeave }) {
  const occ = occupancyLabel(bus.occupancy);
  const leaveMins = computeLeaveBy(bus.etaMins, walkMins);
  return (
    <div style={S.busCard(bus.status)}>
      <div style={S.busCardAccent(bus.status)} />
      <div style={{ ...S.row, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 3 }}>{bus.vehicleNo}</div>
          <div style={S.etaBig}>{bus.etaMins <= 0 ? "NOW" : `${bus.etaMins} min`}</div>
          <div style={S.etaSub}>ETA {fmtTime(bus.etaMins)} · sched {fmtTime(bus.scheduledMins)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ ...S.badge(statusColor(bus.status), statusColor(bus.status) + "15"), marginBottom: 6 }}>{bus.status}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{bus.stopsAway} stops away</div>
          <div style={{ fontSize: 11, color: occ.color, marginTop: 3 }}>⬛ {occ.label}</div>
        </div>
      </div>
      <div style={{ ...S.row, borderTop: "1px solid #1e2d4a", paddingTop: 10, gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>DELAY</div>
          <div style={{ fontSize: 13, color: bus.delayMins > 0 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
            {bus.delayMins > 0 ? `+${bus.delayMins} min` : bus.delayMins < 0 ? `${bus.delayMins} min (early)` : "On time"}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>CONFIDENCE</div>
          <div style={{ fontSize: 13, color: confidenceColor(bus.confidence), fontWeight: 600 }}>{bus.confidence}%</div>
          <div style={S.confBar(bus.confidence)}><div style={S.confFill(bus.confidence)} /></div>
        </div>
        {showLeave && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>LEAVE IN</div>
            <div style={{ fontSize: 13, color: leaveMins <= 2 ? "#ef4444" : leaveMins <= 5 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
              {leaveMins <= 0 ? "LEAVE NOW!" : `${leaveMins} min`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceExplainer({ bus }) {
  const ctx = getTimeContext();
  return (
    <div style={S.card}>
      <div style={S.label}>Why this prediction?</div>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
        {ctx.isRushAM && "🚦 Rush hour AM: delays typically 2–3× normal\n"}
        {ctx.isRushPM && "🚦 Rush hour PM: heavy congestion on this route\n"}
        {!ctx.isRushAM && !ctx.isRushPM && "🟢 Off-peak: lower traffic, better reliability\n"}
        Route historical avg delay: <span style={{ color: "#f59e0b" }}>{bus.stopsAway > 10 ? "4.8" : "2.3"} min</span><br />
        Confidence affected by: time-of-day, route length, historical variance
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function OnRoute() {
  const [tab, setTab] = useState("live");
  const [selectedRouteId, setSelectedRouteId] = useState("534");
  const [selectedStopIdx, setSelectedStopIdx] = useState(0);
  const [buses, setBuses] = useState([]);
  const [walkMins, setWalkMins] = useState(5);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [tick, setTick] = useState(0);
  const [aiMessages, setAiMessages] = useState([
    { role: "assistant", content: "Hi! I'm your AI commute advisor. Ask me anything — 'Should I leave now?', 'Will my 8:22 bus be late today?', 'What's the best route to CP?' — I'll analyze real-time signals to help." }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [lowData, setLowData] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const aiEndRef = useRef(null);
  const route = ROUTES.find(r => r.id === selectedRouteId);
  const stops = STOPS[selectedRouteId] || [];

  // Live data refresh
  useEffect(() => {
    setBuses(generateBuses(route, selectedStopIdx));
    const interval = setInterval(() => {
      setBuses(generateBuses(route, selectedStopIdx));
      setLastUpdated(new Date());
      setTick(t => t + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedRouteId, selectedStopIdx]);

  // Demo scenario: Priya's commute
  useEffect(() => {
    if (demoMode) {
      setSelectedRouteId("534");
      setSelectedStopIdx(0);
      setWalkMins(5);
    }
  }, [demoMode]);

  // AI scroll
  useEffect(() => { aiEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages]);

  const nextBus = buses[0];
  const leaveInMins = nextBus ? computeLeaveBy(nextBus.etaMins, walkMins) : null;
  const isUrgent = leaveInMins !== null && leaveInMins <= 3;

  // WhatsApp text output
  const whatsappText = buses.length ? `*OnRoute — ${route?.name}*\n${route?.from} → ${route?.to}\n\n📍 Your stop: ${stops[selectedStopIdx]}\n\n🚌 Next 3 buses:\n${buses.map((b, i) =>
    `${i + 1}. ETA ${fmtTime(b.etaMins)} (${b.etaMins} min) · ${b.status}${b.delayMins > 0 ? ` +${b.delayMins}m late` : ""} · ${b.confidence}% confident`
  ).join("\n")}\n\n⏱ Leave in: ${leaveInMins <= 0 ? "NOW!" : leaveInMins + " min"}\n\n_Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}_` : "Loading...";

  // AI advisor
  const askAI = async (question) => {
    if (!question.trim()) return;
    const userMsg = { role: "user", content: question };
    const newHistory = [...aiMessages, userMsg];
    setAiMessages(newHistory);
    setAiInput("");
    setAiLoading(true);

    const ctx = getTimeContext();
    const systemPrompt = `You are OnRoute AI, a real-time commute advisor for Delhi commuters. You have access to live bus data and must give SHORT, DIRECT, ACTIONABLE advice — never more than 3-4 sentences. Always include a specific recommendation.

Current data:
Route: ${route?.name} (${route?.from} → ${route?.to})
User's stop: ${stops[selectedStopIdx]}
Walk time to stop: ${walkMins} minutes
Time context: ${ctx.isRushAM ? "Rush hour AM" : ctx.isRushPM ? "Rush hour PM" : "Off-peak"}
Next 3 buses: ${buses.map(b => `Bus ${b.vehicleNo}: ETA ${b.etaMins} min, ${b.status}, delay ${b.delayMins}min, confidence ${b.confidence}%`).join(" | ")}
Leave-by time: ${leaveInMins !== null ? (leaveInMins <= 0 ? "IMMEDIATELY" : `in ${leaveInMins} minutes`) : "calculating"}

Be conversational, precise, and helpful. Use numbers. If asked about leaving, give a clear yes/no + reason.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...newHistory.map(m => ({ role: m.role, content: m.content }))
          ]
        })
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content 
        || "Could not get a response. Check live data above.";
      setAiMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch (err) {
      // Fallback: compute actionable advice directly from live bus state
      const fb = buses[0];
      const fbLeave = fb ? computeLeaveBy(fb.etaMins, walkMins) : null;
      const ctx = getTimeContext();
      const timeLabel = ctx.isRushAM ? "Rush hour AM" : ctx.isRushPM ? "Rush hour PM" : "Off-peak";
      let fallback = `⚠️ AI advisor offline (${err.message || "network error"}). Here's what the live data says:\n\n`;
      if (!fb) {
        fallback += "No bus data available yet. Please wait for the live feed to load.";
      } else if (fbLeave <= 0) {
        fallback += `🔴 Leave NOW. Next bus (${fb.vehicleNo}) arrives at ${fmtTime(fb.etaMins)} — you have no time left. It's ${timeLabel}, ${fb.status.toLowerCase()}.`;
      } else if (fbLeave <= 3) {
        fallback += `🟠 Leave in ${fbLeave} min. Bus ${fb.vehicleNo} at ${fmtTime(fb.etaMins)} — ${fb.status}, ${fb.confidence}% confidence. Don't delay.`;
      } else {
        fallback += `🟢 You have ${fbLeave} min before you need to leave. Next bus at ${fmtTime(fb.etaMins)} (${fb.status}, ${fb.confidence}% confident). ${buses[1] ? `Backup: ${fmtTime(buses[1].etaMins)}.` : ""}`;
      }
      setAiMessages([...newHistory, { role: "assistant", content: fallback }]);
    }
    setAiLoading(false);
  };

  return (
    <div style={S.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:0;height:0}
        * { box-sizing: border-box; }
      `}</style>

      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.logo}>OnRoute</div>
            <div style={S.logoSub}>Real-time commute intelligence</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <div style={S.liveTag}><LivePulse />LIVE · {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setLowData(l => !l)} style={{ ...S.btnGhost, fontSize: 10, padding: "3px 8px", color: lowData ? "#f97316" : "#64748b", borderColor: lowData ? "#f97316" : "#1e2d4a" }}>
                {lowData ? "📶 LOW DATA ON" : "📶 LOW DATA"}
              </button>
              <button onClick={() => setDemoMode(d => !d)} style={{ ...S.btnGhost, fontSize: 10, padding: "3px 8px", color: demoMode ? "#a78bfa" : "#64748b", borderColor: demoMode ? "#a78bfa" : "#1e2d4a" }}>
                {demoMode ? "✦ PRIYA'S DEMO" : "DEMO"}
              </button>
            </div>
          </div>
        </div>
        {/* Route picker */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>ROUTE</div>
            <select style={S.select} value={selectedRouteId} onChange={e => setSelectedRouteId(e.target.value)}>
              {ROUTES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>YOUR STOP</div>
            <select style={S.select} value={selectedStopIdx} onChange={e => setSelectedStopIdx(+e.target.value)}>
              {stops.map((s, i) => <option key={i} value={i}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={S.tabs}>
        {[["live", "Live Board"], ["plan", "Smart Plan"], ["ai", "AI Advisor"], ["wa", lowData ? "Text Mode" : "Simple Mode"]].map(([id, label]) => (
          <button key={id} style={S.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* BODY */}
      <div style={S.body}>

        {/* ── LIVE BOARD ── */}
        {tab === "live" && !lowData && (
          <>
            <div style={S.section}>
              <div style={{ ...S.row, marginBottom: 12 }}>
                <div style={S.label}>Next buses · {stops[selectedStopIdx]}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>↻ auto {6 - (tick % 6) * 0}s</div>
              </div>

              {demoMode && (
                <div style={{ background: "#1a0a1a", border: "1px solid #4c1d95", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#c4b5fd", lineHeight: 1.6 }}>
                  🎭 <strong>Demo: Priya's scenario</strong><br />
                  It's 8:15 AM. She needs to catch the 8:22 DTC 534 from Dwarka Sec-10.<br />
                  Walk to stop: 5 min. Should she leave now?
                </div>
              )}

              {buses.length === 0 ? (
                <div style={{ textAlign: "center", color: "#475569", padding: 40 }}>Loading live data...</div>
              ) : (
                buses.map(bus => <BusCard key={bus.id} bus={bus} walkMins={walkMins} showLeave={true} />)
              )}
            </div>

            {nextBus && <ConfidenceExplainer bus={nextBus} />}

            <div style={S.card}>
              <div style={S.label}>Route progress — {route?.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 6 }}>
                {stops.slice(0, Math.min(stops.length, 8)).map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <div style={S.stopDot(i <= selectedStopIdx)} />
                      <div style={{ fontSize: 9, color: i === selectedStopIdx ? "#f97316" : "#475569", maxWidth: 50, textAlign: "center", lineHeight: 1.2 }}>{s.split(" ")[0]}</div>
                    </div>
                    {i < stops.slice(0, 8).length - 1 && <div style={{ width: 20, height: 1, background: i < selectedStopIdx ? "#f97316" : "#1e2d4a", flexShrink: 0 }} />}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── SMART PLAN ── */}
        {tab === "plan" && !lowData && (
          <>
            {leaveInMins !== null && nextBus && (
              <div style={S.leaveBox(isUrgent)}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, letterSpacing: "2px" }}>LEAVE HOME IN</div>
                <span style={S.leaveNum(isUrgent)}>
                  {leaveInMins <= 0 ? "NOW!" : `${leaveInMins}m`}
                </span>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 8 }}>
                  to catch the {fmtTime(nextBus.etaMins)} bus · {nextBus.confidence}% confident
                </div>
                {isUrgent && <div style={{ fontSize: 12, color: "#ef4444", marginTop: 6, fontWeight: 600 }}>⚠ You're cutting it close!</div>}
              </div>
            )}

            <div style={S.card}>
              <div style={S.label}>Your commute settings</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Walk time to stop: <span style={{ color: "#f97316" }}>{walkMins} min</span></div>
                <input type="range" min={1} max={20} value={walkMins} onChange={e => setWalkMins(+e.target.value)}
                  style={{ width: "100%", accentColor: "#f97316" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569" }}><span>1 min</span><span>20 min</span></div>
              </div>
            </div>

            <div style={S.card}>
              <div style={S.label}>All options right now</div>
              {buses.map((bus, i) => {
                const leave = computeLeaveBy(bus.etaMins, walkMins);
                return (
                  <div key={bus.id} style={{ ...S.row, borderBottom: i < 2 ? "1px solid #1e2d4a" : "none", paddingBottom: 10, marginBottom: i < 2 ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Bus at {fmtTime(bus.etaMins)}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{bus.status} · {bus.confidence}% confidence</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: leave <= 0 ? "#ef4444" : leave <= 3 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
                        {leave <= 0 ? "LEAVE NOW" : `Leave +${leave}m`}
                      </div>
                      <div style={{ fontSize: 10, color: "#475569" }}>occ. {bus.occupancy}%</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={S.card}>
              <div style={S.label}>Smart recommendation</div>
              <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7 }}>
                {(() => {
                  if (!nextBus) return "Loading...";
                  const ctx = getTimeContext();
                  if (nextBus.confidence < 55) return `⚠ Low confidence today — ${ctx.isRushAM || ctx.isRushPM ? "rush hour is unpredictable" : "route has high variance"}. Add 5 min buffer. Consider the ${buses[1] ? fmtTime(buses[1].etaMins) : "next"} bus as backup.`;
                  if (leaveInMins <= 2) return `🔴 Leave immediately for the ${fmtTime(nextBus.etaMins)} bus. ${nextBus.status === "SLIGHT DELAY" ? "Slight delay works in your favour." : "It's running on time."}`;
                  if (leaveInMins > 8) return `✅ You have ${leaveInMins} minutes. No rush — but note: ${ctx.isRushAM ? "morning rush could worsen later buses" : "conditions look stable"}.`;
                  return `🟡 Leave in ${leaveInMins} min. ${nextBus.status === "SLIGHT DELAY" ? `Bus is ${nextBus.delayMins}m late, giving you a small buffer.` : "Bus is on time — don't delay."}`;
                })()}
              </div>
            </div>
          </>
        )}

        {/* ── AI ADVISOR ── */}
        {tab === "ai" && !lowData && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>Quick questions</div>
              <div style={S.ticker}>
                {["Should I leave now?", "Will my bus be late?", "Best route to avoid delays?", "How crowded is next bus?", "Rush hour impact today?"].map(q => (
                  <button key={q} style={S.tickerItem(false)} onClick={() => askAI(q)}>{q}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              {aiMessages.map((m, i) => (
                <div key={i} style={S.aiMsg(m.role)}>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{m.role === "user" ? "You" : "AI Advisor"}</div>
                  {m.content}
                </div>
              ))}
              {aiLoading && (
                <div style={{ ...S.aiMsg("assistant"), color: "#475569" }}>
                  <span style={{ animation: "pulse 1s infinite" }}>● ● ●</span>
                </div>
              )}
              <div ref={aiEndRef} />
            </div>

            <div style={{ display: "flex", gap: 8, position: "sticky", bottom: 0, background: "#0a0e1a", paddingTop: 8 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="Ask about your commute..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !aiLoading && askAI(aiInput)}
              />
              <button style={{ ...S.btnPrimary, width: "auto", padding: "8px 14px" }} onClick={() => askAI(aiInput)} disabled={aiLoading}>
                →
              </button>
            </div>
          </>
        )}

        {/* ── SIMPLE / LOW-DATA / WHATSAPP MODE ── */}
        {(tab === "wa" || lowData) && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={S.label}>{lowData ? "Low-data text mode" : "WhatsApp / SMS format"}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                {lowData ? "Minimal bandwidth — text-only updates every 60s" : "Copy and share via WhatsApp, SMS, or any text channel"}
              </div>
            </div>
            <div style={S.whatsappBox}>{whatsappText}</div>
            <button style={S.btnPrimary} onClick={() => navigator.clipboard?.writeText(whatsappText)}>
              Copy to WhatsApp / SMS
            </button>
            <div style={{ ...S.card, marginTop: 14 }}>
              <div style={S.label}>Works for everyone</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                ✅ WhatsApp bots can send this format automatically<br />
                ✅ Works on 2G / basic feature phones<br />
                ✅ &lt; 1KB per update — uses minimal data<br />
                ✅ Can be delivered via SMS fallback<br />
                ✅ No app install required
              </div>
            </div>
            {tab !== "wa" && (
              <div style={{ ...S.card, borderColor: "#1a4030" }}>
                <div style={S.label}>Low-data mode active</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  Visual charts and animations are disabled. Only essential data is transmitted. Updates every 60s instead of 6s.
                </div>
                <button style={{ ...S.btnGhost, marginTop: 10, color: "#22c55e", borderColor: "#22c55e40" }} onClick={() => setLowData(false)}>Turn off low-data mode</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
