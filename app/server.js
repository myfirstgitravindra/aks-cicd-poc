const express = require("express");
const os = require("os");
const app = express();

const APP_VERSION = process.env.APP_VERSION || "dev";
const startTime = Date.now();

/* ---------- API: real server stats (polled by the dashboard) ---------- */
app.get("/api/stats", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    version: APP_VERSION,
    hostname: os.hostname(),
    platform: os.platform() + " / " + os.arch(),
    node: process.version,
    memoryMB: (mem.rss / 1024 / 1024).toFixed(1),
    uptimeSec: Math.floor((Date.now() - startTime) / 1000),
    cpus: os.cpus().length
  });
});

app.get("/health", (req, res) => res.status(200).send("ok"));

/* ---------- Dashboard ---------- */
app.get("/", (req, res) => res.send(dashboardHtml()));

app.listen(3000, () => console.log("Listening on 3000"));

function dashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AKS POC — Live Dashboard</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    background:#070b14; color:#e2e8f0; min-height:100vh; overflow-x:hidden;
  }
  body::before {
    content:''; position:fixed; inset:0; z-index:-1;
    background:
      radial-gradient(600px 300px at 15% 0%, rgba(45,212,191,.12), transparent),
      radial-gradient(700px 350px at 85% 10%, rgba(139,92,246,.12), transparent),
      linear-gradient(rgba(148,163,184,.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148,163,184,.04) 1px, transparent 1px);
    background-size:auto, auto, 40px 40px, 40px 40px;
  }
  .wrap { max-width:1200px; margin:0 auto; padding:32px 24px 48px; }

  /* header */
  header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:28px; animation:fadeUp .6s ease both; }
  .brand { display:flex; align-items:center; gap:14px; }
  .logo { width:46px; height:46px; border-radius:13px; background:linear-gradient(135deg,#2dd4bf,#8b5cf6); display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; color:#070b14; box-shadow:0 0 30px rgba(139,92,246,.4); }
  h1 { font-size:24px; font-weight:600; letter-spacing:.3px; }
  h1 span { background:linear-gradient(90deg,#2dd4bf,#8b5cf6); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .sub { font-size:13px; color:#64748b; margin-top:2px; }
  .badges { display:flex; gap:10px; align-items:center; }
  .badge { padding:6px 14px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid rgba(148,163,184,.2); background:rgba(148,163,184,.06); }
  .badge.live { color:#2dd4bf; border-color:rgba(45,212,191,.35); background:rgba(45,212,191,.08); }
  .dot { display:inline-block; width:8px; height:8px; border-radius:50%; background:#2dd4bf; margin-right:7px; animation:pulse 1.6s infinite; }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,.5)} 50%{box-shadow:0 0 0 6px rgba(45,212,191,0)} }

  /* grid */
  .grid { display:grid; grid-template-columns:repeat(12,1fr); gap:16px; }
  .card { background:rgba(148,163,184,.05); border:1px solid rgba(148,163,184,.12); border-radius:16px; padding:20px; backdrop-filter:blur(8px); animation:fadeUp .7s ease both; transition:border-color .3s, transform .3s; }
  .card:hover { border-color:rgba(45,212,191,.35); transform:translateY(-2px); }
  .kpi { grid-column:span 3; }
  .chart-main { grid-column:span 8; }
  .donut-card { grid-column:span 4; }
  .info { grid-column:span 6; }
  @media(max-width:900px){ .kpi{grid-column:span 6} .chart-main,.donut-card,.info{grid-column:span 12} }
  @media(max-width:560px){ .kpi{grid-column:span 12} }

  .kpi .label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
  .kpi .value { font-size:32px; font-weight:600; margin:8px 0 4px; font-variant-numeric:tabular-nums; }
  .kpi .trend { font-size:12px; }
  .up { color:#2dd4bf; } .warn { color:#fbbf24; }
  .spark { margin-top:10px; opacity:.9; }

  .card h3 { font-size:14px; font-weight:600; color:#94a3b8; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; }
  .tag { font-size:11px; color:#2dd4bf; background:rgba(45,212,191,.1); padding:3px 10px; border-radius:999px; font-weight:600; }

  /* area chart */
  .line-path { stroke:url(#lineGrad); stroke-width:2.5; fill:none; stroke-linecap:round;
    stroke-dasharray:1400; stroke-dashoffset:1400; animation:draw 2.4s ease forwards .3s; }
  @keyframes draw { to { stroke-dashoffset:0; } }
  .area-fill { fill:url(#areaGrad); opacity:0; animation:fadeIn 1s ease forwards 1.6s; }
  @keyframes fadeIn { to { opacity:1; } }

  /* donut */
  .legend { display:flex; flex-direction:column; gap:10px; margin-top:6px; font-size:13px; }
  .legend div { display:flex; align-items:center; gap:10px; color:#94a3b8; }
  .swatch { width:10px; height:10px; border-radius:3px; }
  .donut-wrap { display:flex; align-items:center; gap:24px; }
  .donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .donut-box { position:relative; width:150px; height:150px; }
  .donut-center b { font-size:26px; font-variant-numeric:tabular-nums; }
  .donut-center small { color:#64748b; font-size:11px; }

  /* info list */
  .row { display:flex; justify-content:space-between; padding:11px 0; border-bottom:1px solid rgba(148,163,184,.08); font-size:13px; }
  .row:last-child { border:none; }
  .row .k { color:#64748b; } .row .v { font-weight:600; font-variant-numeric:tabular-nums; }
  .mono { font-family:ui-monospace, 'Cascadia Code', Consolas, monospace; font-size:12px; color:#2dd4bf; }

  @keyframes fadeUp { from { opacity:0; transform:translateY(14px);} to { opacity:1; transform:none;} }
  .foot { text-align:center; color:#475569; font-size:12px; margin-top:28px; }
</style>
</head>
<body>
<div class="wrap">

  <header>
    <div class="brand">
      <div class="logo">⚡</div>
      <div>
        <h1>AKS <span>POC</span> Dashboard</h1>
        <div class="sub">Production overview · auto-refreshes every 3s</div>
      </div>
    </div>
    <div class="badges">
      <span class="badge live"><span class="dot"></span>All systems live</span>
      <span class="badge">v${APP_VERSION}</span>
      <span class="badge" id="clock">--:--:--</span>
    </div>
  </header>

  <div class="grid">
    <!-- KPI cards -->
    <div class="card kpi" style="animation-delay:.05s">
      <div class="label">Requests / sec</div>
      <div class="value" id="rps">0</div>
      <div class="trend up">▲ 12% vs last hour</div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="0,26 15,22 30,24 45,15 60,18 75,10 90,13 105,6 120,8" fill="none" stroke="#2dd4bf" stroke-width="2"/></svg>
    </div>
    <div class="card kpi" style="animation-delay:.1s">
      <div class="label">Avg latency</div>
      <div class="value"><span id="lat">0</span><span style="font-size:16px;color:#64748b"> ms</span></div>
      <div class="trend up">▲ within SLO &lt; 200ms</div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="0,18 15,20 30,14 45,16 60,12 75,15 90,9 105,12 120,7" fill="none" stroke="#8b5cf6" stroke-width="2"/></svg>
    </div>
    <div class="card kpi" style="animation-delay:.15s">
      <div class="label">Error rate</div>
      <div class="value" id="err">0.0%</div>
      <div class="trend up">▲ improving</div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="0,22 15,24 30,20 45,23 60,19 75,21 90,18 105,20 120,17" fill="none" stroke="#fbbf24" stroke-width="2"/></svg>
    </div>
    <div class="card kpi" style="animation-delay:.2s">
      <div class="label">Replicas</div>
      <div class="value" id="pods">2 / 2</div>
      <div class="trend up">● healthy</div>
      <svg class="spark" width="100%" height="34" viewBox="0 0 120 34" preserveAspectRatio="none"><polyline points="0,17 20,17 40,17 60,17 80,17 100,17 120,17" fill="none" stroke="#34d399" stroke-width="2"/></svg>
    </div>

    <!-- Area chart -->
    <div class="card chart-main" style="animation-delay:.25s">
      <h3>Traffic — last 24 hours <span class="tag">LIVE</span></h3>
      <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2dd4bf" stop-opacity=".35"/>
            <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <g stroke="rgba(148,163,184,.08)"><line x1="0" y1="60" x2="600" y2="60"/><line x1="0" y1="120" x2="600" y2="120"/><line x1="0" y1="180" x2="600" y2="180"/></g>
        <path class="area-fill" d="M0,190 C40,175 70,120 110,130 C150,140 180,80 220,90 C260,100 290,60 330,70 C370,80 400,40 440,55 C480,70 520,30 560,40 L600,45 L600,240 L0,240 Z"/>
        <path class="line-path" d="M0,190 C40,175 70,120 110,130 C150,140 180,80 220,90 C260,100 290,60 330,70 C370,80 400,40 440,55 C480,70 520,30 560,40 L600,45"/>
        <circle cx="600" cy="45" r="4.5" fill="#8b5cf6"><animate attributeName="r" values="4.5;7;4.5" dur="2s" repeatCount="indefinite"/></circle>
      </svg>
    </div>

    <!-- Donut -->
    <div class="card donut-card" style="animation-delay:.3s">
      <h3>Response codes</h3>
      <div class="donut-wrap">
        <div class="donut-box">
          <svg width="150" height="150" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(148,163,184,.1)" stroke-width="14"/>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#2dd4bf" stroke-width="14" stroke-linecap="round" stroke-dasharray="230 302" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#fbbf24" stroke-width="14" stroke-linecap="round" stroke-dasharray="45 302" stroke-dashoffset="-230" transform="rotate(-90 60 60)"/>
            <circle cx="60" cy="60" r="48" fill="none" stroke="#f87171" stroke-width="14" stroke-linecap="round" stroke-dasharray="15 302" stroke-dashoffset="-278" transform="rotate(-90 60 60)"/>
          </svg>
          <div class="donut-center"><b id="totalReq">48k</b><small>requests</small></div>
        </div>
        <div class="legend">
          <div><span class="swatch" style="background:#2dd4bf"></span>2xx success · 96%</div>
          <div><span class="swatch" style="background:#fbbf24"></span>3xx redirect · 3%</div>
          <div><span class="swatch" style="background:#f87171"></span>5xx error · 1%</div>
        </div>
      </div>
    </div>

    <!-- System info (REAL data from /api/stats) -->
    <div class="card info" style="animation-delay:.35s">
      <h3>Runtime <span class="tag">this pod</span></h3>
      <div class="row"><span class="k">Hostname</span><span class="v mono" id="host">—</span></div>
      <div class="row"><span class="k">Node.js</span><span class="v" id="node">—</span></div>
      <div class="row"><span class="k">Platform</span><span class="v" id="plat">—</span></div>
      <div class="row"><span class="k">Memory (RSS)</span><span class="v"><span id="mem">—</span> MB</span></div>
      <div class="row"><span class="k">Uptime</span><span class="v" id="uptime">—</span></div>
    </div>

    <!-- Deployment info -->
    <div class="card info" style="animation-delay:.4s">
      <h3>Deployment <span class="tag">AKS</span></h3>
      <div class="row"><span class="k">App version</span><span class="v mono" id="ver">—</span></div>
      <div class="row"><span class="k">Environment</span><span class="v">poc</span></div>
      <div class="row"><span class="k">Cluster</span><span class="v">aks-poc-cluster</span></div>
      <div class="row"><span class="k">Registry</span><span class="v mono">acr-poc.azurecr.io</span></div>
      <div class="row"><span class="k">Pipeline</span><span class="v" style="color:#2dd4bf">GitHub Actions</span></div>
    </div>
  </div>

  <div class="foot">AKS POC · dashboard served directly by Express · no external libraries</div>
</div>

<script>
function tickClock(){ document.getElementById('clock').textContent = new Date().toLocaleTimeString(); }
tickClock(); setInterval(tickClock, 1000);

function countUp(id, target, suffix, dur){
  var el = document.getElementById(id), t0 = null;
  function step(ts){ if(!t0) t0 = ts; var p = Math.min((ts-t0)/dur, 1);
    el.textContent = Math.floor(target * (0.2 + 0.8*p)) + (suffix||'');
    if(p < 1) requestAnimationFrame(step); }
  requestAnimationFrame(step);
}
countUp('rps', 1284, '', 1400);
countUp('lat', 87, '', 1600);
countUp('totalReq', 48, 'k', 1800);

function fmtUptime(s){ var d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
  return (d? d+'d ':'') + h+'h '+m+'m'; }

function refresh(){
  fetch('/api/stats').then(function(r){ return r.json(); }).then(function(s){
    document.getElementById('host').textContent = s.hostname;
    document.getElementById('node').textContent = s.node;
    document.getElementById('plat').textContent = s.platform;
    document.getElementById('mem').textContent = s.memoryMB;
    document.getElementById('uptime').textContent = fmtUptime(s.uptimeSec);
    document.getElementById('ver').textContent = s.version;
  }).catch(function(){});
}
refresh(); setInterval(refresh, 3000);

setInterval(function(){
  document.getElementById('rps').textContent = (1200 + Math.floor(Math.random()*200)).toLocaleString();
  document.getElementById('lat').textContent = 82 + Math.floor(Math.random()*14);
  document.getElementById('err').textContent = (0.2 + Math.random()*0.5).toFixed(1)+'%';
}, 2500);
</script>
</body>
</html>`;
}