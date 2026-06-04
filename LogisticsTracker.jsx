import { useState, useEffect, useRef } from "react";

const CARRIERS = [
  { id: "dhl", name: "DHL Express", color: "#FFCC00", bg: "#222", logo: "DHL" },
  { id: "fedex", name: "FedEx", color: "#FF6600", bg: "#4D148C", logo: "FedEx" },
  { id: "ups", name: "UPS", color: "#FFB500", bg: "#351C15", logo: "UPS" },
  { id: "dpd", name: "DPD", color: "#DC0032", bg: "#fff", logo: "DPD" },
  { id: "inpost", name: "InPost", color: "#FFD100", bg: "#1A1A1A", logo: "InPost" },
  { id: "gls", name: "GLS", color: "#009BDE", bg: "#fff", logo: "GLS" },
];

const ZONES = ["Poland", "EU Zone 1", "EU Zone 2", "International", "USA", "Asia"];
const SERVICES = ["Standard", "Express", "Next Day", "Economy", "Same Day"];

function generatePrices(weight, zone, service) {
  const base = {
    dhl: 12, fedex: 14, ups: 13, dpd: 9, inpost: 7, gls: 10
  };
  const zoneMulti = { "Poland": 1, "EU Zone 1": 1.4, "EU Zone 2": 1.8, "International": 2.5, "USA": 3.2, "Asia": 3.8 };
  const serviceMulti = { "Standard": 1, "Express": 1.6, "Next Day": 2.1, "Economy": 0.8, "Same Day": 2.8 };
  const w = parseFloat(weight) || 1;
  return CARRIERS.map(c => {
    const price = (base[c.id] + w * 1.8) * (zoneMulti[zone] || 1) * (serviceMulti[service] || 1);
    const days = {
      dhl: { Standard: 3, Express: 1, "Next Day": 1, Economy: 5, "Same Day": 0 },
      fedex: { Standard: 3, Express: 1, "Next Day": 1, Economy: 6, "Same Day": 0 },
      ups: { Standard: 4, Express: 2, "Next Day": 1, Economy: 7, "Same Day": 0 },
      dpd: { Standard: 3, Express: 2, "Next Day": 1, Economy: 5, "Same Day": 1 },
      inpost: { Standard: 2, Express: 1, "Next Day": 1, Economy: 4, "Same Day": 0 },
      gls: { Standard: 4, Express: 2, "Next Day": 2, Economy: 6, "Same Day": 0 },
    };
    const variance = (Math.random() - 0.5) * 2;
    return {
      ...c,
      price: Math.max(5, price + variance).toFixed(2),
      days: days[c.id][service] || 3,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      available: Math.random() > 0.15,
    };
  }).sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
}

const SHIPMENTS = [
  { id: "SHP-001", carrier: "DHL Express", status: "In Transit", from: "Warsaw", to: "Berlin", eta: "Jun 5", weight: "2.5kg", price: "€24.50", progress: 65, color: "#FFCC00" },
  { id: "SHP-002", carrier: "FedEx", status: "Delivered", from: "Kraków", to: "Paris", eta: "Jun 3", weight: "1.2kg", price: "€31.20", progress: 100, color: "#FF6600" },
  { id: "SHP-003", carrier: "InPost", status: "Processing", from: "Gdańsk", to: "Warsaw", eta: "Jun 6", weight: "0.8kg", price: "€8.90", progress: 20, color: "#FFD100" },
  { id: "SHP-004", carrier: "UPS", status: "Out for Delivery", from: "Wrocław", to: "London", eta: "Jun 4", weight: "5.0kg", price: "€52.10", progress: 85, color: "#FFB500" },
];

export default function App() {
  const [tab, setTab] = useState("compare");
  const [weight, setWeight] = useState("2");
  const [zone, setZone] = useState("EU Zone 1");
  const [service, setService] = useState("Standard");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [savedShipments] = useState(SHIPMENTS);
  const [selectedResult, setSelectedResult] = useState(null);
  const [mounted, setMounted] = useState(false);
  const aiRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setSearched(false);
    setSelectedResult(null);
    setTimeout(() => {
      setResults(generatePrices(weight, zone, service));
      setLoading(false);
      setSearched(true);
    }, 1200);
  };

  const handleAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const context = searched && results.length
        ? `Current search: ${weight}kg package, ${zone}, ${service} service. Best price: ${results[0]?.name} at €${results[0]?.price}. All results: ${results.map(r => `${r.name}: €${r.price} (${r.days} days)`).join(", ")}.`
        : "No search performed yet.";

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are an expert logistics advisor for European shipping, especially Poland. Help users choose the best shipping carrier based on price, speed, and reliability. Be concise, practical, and data-driven. Always respond in the same language the user writes in. Current data: ${context}`,
          messages: [{ role: "user", content: aiQuery }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "No response.";
      setAiResponse(text);
    } catch (e) {
      setAiResponse("⚠️ Connection error. Please try again.");
    }
    setAiLoading(false);
  };

  const cheapest = results[0];
  const fastest = [...results].sort((a, b) => a.days - b.days)[0];

  const statusColor = (s) => ({
    "Delivered": "#00E5A0", "In Transit": "#3B9EFF", "Processing": "#FFD100", "Out for Delivery": "#FF8C42"
  }[s] || "#aaa");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080C14",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      color: "#E8EDF5",
      overflowX: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #0D1117; }
        ::-webkit-scrollbar-thumb { background: #3B9EFF44; border-radius: 2px; }
        .fade-in { animation: fadeIn 0.5s ease forwards; opacity: 0; }
        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } from { opacity: 0; transform: translateY(16px); } }
        .card { background: #0D1520; border: 1px solid #1E2D42; border-radius: 12px; transition: border-color 0.2s; }
        .card:hover { border-color: #3B9EFF44; }
        .btn-primary { background: #3B9EFF; color: #000; border: none; border-radius: 8px; padding: 12px 28px; font-family: inherit; font-weight: 700; font-size: 13px; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; text-transform: uppercase; }
        .btn-primary:hover { background: #62B3FF; transform: translateY(-1px); box-shadow: 0 8px 24px #3B9EFF44; }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .tab-btn { background: none; border: none; font-family: inherit; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 10px 20px; border-radius: 6px; transition: all 0.2s; }
        .result-row { background: #0D1520; border: 1px solid #1E2D42; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; transition: all 0.2s; cursor: pointer; }
        .result-row:hover { border-color: #3B9EFF55; background: #111D2E; transform: translateX(4px); }
        .result-row.selected { border-color: #3B9EFF; background: #0F1E35; }
        .badge { font-size: 10px; font-weight: 700; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; }
        .input-field { background: #0D1520; border: 1px solid #1E2D42; border-radius: 8px; color: #E8EDF5; font-family: inherit; font-size: 13px; padding: 11px 16px; width: 100%; outline: none; transition: border-color 0.2s; }
        .input-field:focus { border-color: #3B9EFF; }
        select.input-field option { background: #0D1520; }
        .progress-bar { height: 4px; background: #1E2D42; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .grid-bg { background-image: linear-gradient(#1E2D4211 1px, transparent 1px), linear-gradient(90deg, #1E2D4211 1px, transparent 1px); background-size: 40px 40px; }
        .glow-line { height: 1px; background: linear-gradient(90deg, transparent, #3B9EFF66, transparent); }
        textarea.input-field { resize: vertical; min-height: 80px; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E2D42", padding: "0 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, background: "#3B9EFF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 800, letterSpacing: 2, color: "#fff" }}>LOGISTRACK</div>
              <div style={{ fontSize: 9, color: "#3B9EFF", letterSpacing: 2 }}>SMART PRICE INTELLIGENCE</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "compare", label: "⬡ Compare", icon: "⬡" },
              { id: "tracking", label: "◎ Tracking", icon: "◎" },
              { id: "ai", label: "✦ AI Advisor", icon: "✦" },
            ].map(t => (
              <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)}
                style={{ color: tab === t.id ? "#3B9EFF" : "#4A6080", background: tab === t.id ? "#3B9EFF11" : "none", fontWeight: tab === t.id ? 600 : 400 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glow-line" />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* COMPARE TAB */}
        {tab === "compare" && (
          <div className={mounted ? "fade-in" : ""}>
            {/* Search Panel */}
            <div className="card grid-bg" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: "#3B9EFF", letterSpacing: 3, marginBottom: 20, textTransform: "uppercase" }}>
                ▸ Shipment Parameters
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 10, color: "#4A6080", letterSpacing: 1, display: "block", marginBottom: 6 }}>WEIGHT (KG)</label>
                  <input className="input-field" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 2.5" min="0.1" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4A6080", letterSpacing: 1, display: "block", marginBottom: 6 }}>DESTINATION ZONE</label>
                  <select className="input-field" value={zone} onChange={e => setZone(e.target.value)}>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4A6080", letterSpacing: 1, display: "block", marginBottom: 6 }}>SERVICE TYPE</label>
                  <select className="input-field" value={service} onChange={e => setService(e.target.value)}>
                    {SERVICES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <button className="btn-primary" onClick={handleSearch} disabled={loading}>
                  {loading ? <span className="spin" style={{ display: "inline-block" }}>◌</span> : "Search"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: 48, color: "#3B9EFF" }}>
                <div className="spin" style={{ fontSize: 32, display: "block", marginBottom: 16 }}>◌</div>
                <div style={{ fontSize: 11, letterSpacing: 2 }}>QUERYING CARRIER NETWORKS...</div>
              </div>
            )}

            {/* Results */}
            {searched && !loading && (
              <div className="fade-in">
                {/* Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Best Price", value: `€${cheapest?.price}`, sub: cheapest?.name, accent: "#00E5A0" },
                    { label: "Fastest", value: `${fastest?.days}d`, sub: fastest?.name, accent: "#3B9EFF" },
                    { label: "Carriers Found", value: results.filter(r => r.available).length, sub: "available now", accent: "#FFD100" },
                  ].map((s, i) => (
                    <div key={i} className="card" style={{ padding: "20px 24px", borderColor: s.accent + "33" }}>
                      <div style={{ fontSize: 10, color: "#4A6080", letterSpacing: 2, marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: s.accent }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: "#4A6080", marginTop: 4 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Results List */}
                <div style={{ fontSize: 10, color: "#4A6080", letterSpacing: 2, marginBottom: 12 }}>▸ CARRIER COMPARISON — {weight}KG · {zone} · {service}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {results.map((r, i) => (
                    <div key={r.id} className={`result-row${selectedResult?.id === r.id ? " selected" : ""}`}
                      style={{ opacity: r.available ? 1 : 0.4, animationDelay: `${i * 80}ms` }}
                      onClick={() => r.available && setSelectedResult(selectedResult?.id === r.id ? null : r)}>

                      {/* Rank */}
                      <div style={{ width: 28, textAlign: "center", fontSize: 11, color: i === 0 ? "#00E5A0" : "#2A3D55", fontWeight: 700 }}>
                        {i === 0 ? "★" : `#${i + 1}`}
                      </div>

                      {/* Logo */}
                      <div style={{ width: 52, height: 28, background: r.bg, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: r.color, border: `1px solid ${r.color}33`, flexShrink: 0 }}>
                        {r.logo}
                      </div>

                      {/* Name */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: 10, color: "#4A6080" }}>Rating: {r.rating}/5.0</div>
                      </div>

                      {/* Delivery */}
                      <div style={{ textAlign: "center", minWidth: 70 }}>
                        <div style={{ fontSize: 13, color: "#3B9EFF" }}>{r.days === 0 ? "Today" : `${r.days}d`}</div>
                        <div style={{ fontSize: 9, color: "#4A6080" }}>DELIVERY</div>
                      </div>

                      {/* Badges */}
                      <div style={{ display: "flex", gap: 6, minWidth: 130 }}>
                        {i === 0 && <span className="badge" style={{ background: "#00E5A011", color: "#00E5A0", border: "1px solid #00E5A033" }}>Cheapest</span>}
                        {r.days === fastest?.days && <span className="badge" style={{ background: "#3B9EFF11", color: "#3B9EFF", border: "1px solid #3B9EFF33" }}>Fastest</span>}
                        {!r.available && <span className="badge" style={{ background: "#FF4A4A11", color: "#FF4A4A", border: "1px solid #FF4A4A33" }}>Unavail.</span>}
                      </div>

                      {/* Price */}
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: i === 0 ? "#00E5A0" : "#E8EDF5" }}>€{r.price}</div>
                        <div style={{ fontSize: 9, color: "#4A6080" }}>TOTAL</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Detail Panel */}
                {selectedResult && (
                  <div className="card fade-in" style={{ padding: 24, marginTop: 16, borderColor: "#3B9EFF44" }}>
                    <div style={{ fontSize: 10, color: "#3B9EFF", letterSpacing: 2, marginBottom: 16 }}>▸ {selectedResult.name.toUpperCase()} — DETAILS</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                      {[
                        { label: "Base Price", value: `€${selectedResult.price}` },
                        { label: "Est. Delivery", value: selectedResult.days === 0 ? "Today" : `${selectedResult.days} day(s)` },
                        { label: "Rating", value: `${selectedResult.rating} / 5.0` },
                        { label: "Tracking", value: "Included" },
                      ].map((d, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 9, color: "#4A6080", letterSpacing: 1, marginBottom: 4 }}>{d.label.toUpperCase()}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EDF5" }}>{d.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1E2D42" }}>
                      <button className="btn-primary" style={{ fontSize: 11 }}>▸ Book This Carrier</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!searched && !loading && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#2A3D55" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⬡</div>
                <div style={{ fontSize: 11, letterSpacing: 3 }}>ENTER SHIPMENT DETAILS TO COMPARE CARRIERS</div>
              </div>
            )}
          </div>
        )}

        {/* TRACKING TAB */}
        {tab === "tracking" && (
          <div className={mounted ? "fade-in" : ""}>
            <div style={{ fontSize: 10, color: "#3B9EFF", letterSpacing: 3, marginBottom: 20 }}>▸ ACTIVE SHIPMENTS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {savedShipments.map((s, i) => (
                <div key={s.id} className="card" style={{ padding: "20px 24px", animationDelay: `${i * 80}ms` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, color: "#3B9EFF" }}>{s.id}</div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, color: "#E8EDF5" }}>{s.carrier}</span>
                      <span style={{ fontSize: 10, color: "#4A6080", marginLeft: 8 }}>{s.from} → {s.to}</span>
                    </div>
                    <span className="badge" style={{ background: statusColor(s.status) + "22", color: statusColor(s.status), border: `1px solid ${statusColor(s.status)}44` }}>
                      {s.status}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.price}</div>
                      <div style={{ fontSize: 9, color: "#4A6080" }}>ETA: {s.eta}</div>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.progress}%`, background: `linear-gradient(90deg, ${s.color}88, ${s.color})` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 9, color: "#2A3D55" }}>
                    <span>ORDER PLACED</span><span>PROCESSING</span><span>IN TRANSIT</span><span>DELIVERED</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 24 }}>
              {[
                { label: "Total Spent", value: "€116.70", color: "#E8EDF5" },
                { label: "On Time Rate", value: "94.2%", color: "#00E5A0" },
                { label: "Avg. Delivery", value: "2.8d", color: "#3B9EFF" },
              ].map((s, i) => (
                <div key={i} className="card" style={{ padding: "20px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#4A6080", letterSpacing: 2, marginBottom: 10 }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI TAB */}
        {tab === "ai" && (
          <div className={mounted ? "fade-in" : ""}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div className="card" style={{ padding: 24, borderColor: "#3B9EFF33" }}>
                <div style={{ fontSize: 10, color: "#3B9EFF", letterSpacing: 2, marginBottom: 12 }}>✦ AI LOGISTICS ADVISOR</div>
                <div style={{ fontSize: 12, color: "#4A6080", lineHeight: 1.7 }}>
                  Ask anything about shipping strategies, carrier selection, cost optimization, or EU logistics regulations.
                </div>
              </div>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ fontSize: 10, color: "#4A6080", letterSpacing: 2, marginBottom: 12 }}>QUICK QUESTIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Which carrier is best for Poland → Germany?",
                    "How to reduce shipping costs by 30%?",
                    "What's the cheapest option for heavy packages?",
                  ].map((q, i) => (
                    <button key={i} onClick={() => setAiQuery(q)}
                      style={{ background: "#1A2535", border: "1px solid #1E2D42", borderRadius: 6, padding: "8px 12px", color: "#8AA4C0", fontFamily: "inherit", fontSize: 10, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                      onMouseEnter={e => e.target.style.borderColor = "#3B9EFF44"}
                      onMouseLeave={e => e.target.style.borderColor = "#1E2D42"}>
                      ▸ {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 10, color: "#4A6080", letterSpacing: 2, marginBottom: 12 }}>YOUR QUESTION</div>
              <textarea className="input-field" ref={aiRef} value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                placeholder="e.g. What is the best carrier for fragile items from Warsaw to Paris under €20?"
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAI(); }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontSize: 9, color: "#2A3D55" }}>CTRL+ENTER TO SEND</div>
                <button className="btn-primary" onClick={handleAI} disabled={aiLoading || !aiQuery.trim()}>
                  {aiLoading ? <span className="spin" style={{ display: "inline-block" }}>◌</span> : "✦ Ask AI"}
                </button>
              </div>
            </div>

            {aiLoading && (
              <div style={{ textAlign: "center", padding: 32, color: "#3B9EFF" }}>
                <div className="pulse" style={{ fontSize: 11, letterSpacing: 3 }}>✦ ANALYZING LOGISTICS DATA...</div>
              </div>
            )}

            {aiResponse && !aiLoading && (
              <div className="card fade-in" style={{ padding: 24, marginTop: 16, borderColor: "#3B9EFF33" }}>
                <div style={{ fontSize: 10, color: "#3B9EFF", letterSpacing: 2, marginBottom: 16 }}>✦ AI RESPONSE</div>
                <div style={{ fontSize: 13, color: "#C8D8E8", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{aiResponse}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="glow-line" style={{ marginTop: 40 }} />
      <div style={{ textAlign: "center", padding: "16px 24px", fontSize: 9, color: "#1E2D42", letterSpacing: 2 }}>
        LOGISTRACK v1.0 · SMART LOGISTICS INTELLIGENCE · POLAND & EU SHIPPING
      </div>
    </div>
  );
}
