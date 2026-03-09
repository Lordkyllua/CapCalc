/**
 * app.js — CapCalc PWA · DC Electricista
 * UI, eventos, historial, herramientas, canvas, PWA install
 */

// ── Helpers ───────────────────────────────────────────
const $  = id => document.getElementById(id);
const QA = sel => document.querySelectorAll(sel);

// ── Estado ────────────────────────────────────────────
const State = {
  currentResult: null,
  currentMode:   "amps",
  history:       JSON.parse(localStorage.getItem("cc_hist") || "[]"),
};

// ── Service Worker ────────────────────────────────────
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(() => {
    console.log("[CapCalc] SW registrado");
  }).catch(err => console.warn("[CapCalc] SW error:", err));
}

// ── Offline detection ─────────────────────────────────
function updateOnlineStatus() {
  const badge = $("offlineBadge");
  if (!navigator.onLine) badge.classList.add("show");
  else badge.classList.remove("show");
}
window.addEventListener("online",  updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

// ── PWA Install prompt ────────────────────────────────
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
  $("installBanner").classList.add("show");
});

$("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") showToast("✓ App instalada correctamente", "ok");
  deferredPrompt = null;
  $("installBanner").classList.remove("show");
});

$("installClose").addEventListener("click", () => {
  $("installBanner").classList.remove("show");
});

window.addEventListener("appinstalled", () => {
  $("installBanner").classList.remove("show");
  showToast("⚡ CapCalc instalada", "ok");
});

// ── Canvas background ─────────────────────────────────
(function initCanvas() {
  const canvas = $("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H;
  const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
  window.addEventListener("resize", resize); resize();

  class Particle {
    constructor() { this.reset(true); }
    reset(init = false) {
      this.x    = Math.random() * W;
      this.y    = init ? Math.random() * H : H + 10;
      this.vy   = -(0.1 + Math.random() * 0.25);
      this.vx   = (Math.random() - .5) * .1;
      this.size = .8 + Math.random() * 1.6;
      this.alpha= .07 + Math.random() * .18;
      this.cyan = Math.random() > .5;
      this.type = Math.floor(Math.random() * 3);
    }
    update() { this.x += this.vx; this.y += this.vy; if (this.y < -20) this.reset(); }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      const col = this.cyan ? "#00e5ff" : "#ffab00";
      ctx.strokeStyle = ctx.fillStyle = col;
      ctx.lineWidth = .7;
      const s = this.size;
      if (this.type === 0) { ctx.beginPath(); ctx.arc(this.x, this.y, s, 0, Math.PI*2); ctx.fill(); }
      else if (this.type === 1) { ctx.beginPath(); ctx.moveTo(this.x-s, this.y); ctx.lineTo(this.x+s, this.y); ctx.moveTo(this.x, this.y-s); ctx.lineTo(this.x, this.y+s); ctx.stroke(); }
      else { ctx.strokeRect(this.x-s, this.y-s, s*2, s*2); }
      ctx.restore();
    }
  }

  const particles = Array.from({ length: 60 }, () => new Particle());
  const lines = Array.from({ length: 12 }, () => ({
    x: Math.random() * 1600, y: Math.random() * 900,
    len: 30 + Math.random() * 100,
    angle: Math.floor(Math.random() * 4) * (Math.PI / 2),
    alpha: .025 + Math.random() * .04,
    cyan: Math.random() > .5,
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    lines.forEach(l => {
      ctx.save(); ctx.globalAlpha = l.alpha;
      ctx.strokeStyle = l.cyan ? "#00e5ff" : "#1c2e45"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + Math.cos(l.angle)*l.len, l.y + Math.sin(l.angle)*l.len);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(l.x, l.y, 1.8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ── Toast ─────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "info") {
  const t = $("toast");
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ── Tabs ──────────────────────────────────────────────
QA(".bn-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    QA(".bn-btn").forEach(b => b.classList.remove("active"));
    QA(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "history") renderHistory();
  });
});

// ── Mode toggle ───────────────────────────────────────
QA(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    QA(".mode-btn").forEach(b => b.classList.remove("active"));
    QA(".mode-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(`mode-${btn.dataset.mode}`).classList.add("active");
    State.currentMode = btn.dataset.mode;
    resetResult();
  });
});

// ── Presets ───────────────────────────────────────────
QA(".preset").forEach(btn => {
  btn.addEventListener("click", () => {
    resetResult();
    $("ampInput").value = btn.dataset.val;
    $("ampInput").focus();
  });
});

// ── Enter key ─────────────────────────────────────────
["ampInput", "ufInput", "convInput"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") runCalc(); });
});

// ── Main Calc button ──────────────────────────────────
$("calcBtn").addEventListener("click", runCalc);

function runCalc() {
  $("errorMsg").classList.remove("show");
  let result;
  try {
    if (State.currentMode === "amps") {
      result = Calculator.fromAmps(parseFloat($("ampInput").value));
    } else if (State.currentMode === "uf") {
      result = Calculator.fromMicrofarads(parseFloat($("ufInput").value));
    } else {
      const val  = parseFloat($("convInput").value);
      const unit = $("convUnit").value;
      result = Calculator.convert(val, unit);
    }
  } catch (e) {
    $("errorMsg").textContent = "⚠ " + e.message;
    $("errorMsg").classList.add("show");
    return;
  }
  State.currentResult = result;
  renderResult(result);
}

function renderResult(r) {
  // Echo
  $("resultEcho").textContent = `Entrada: ${Calculator.fmt(r.input_amps, 6)} A`;
  if (State.currentMode === "uf")      $("resultEcho").textContent = `Entrada: ${Calculator.fmt(r.microfarads, 6)} μF`;
  if (State.currentMode === "convert") $("resultEcho").textContent = `Entrada: ${Calculator.fmt(parseFloat($("convInput").value))} ${$("convUnit").value}`;

  // Main
  $("resultBig").textContent     = Calculator.fmt(r.microfarads);
  $("resultUnitBig").textContent = "microfaradios (μF)";

  // Conversiones
  $("convGrid").innerHTML = [
    { sym: "mF", val: r.millifarads, name: "Millifaradios" },
    { sym: "F",  val: r.farads,      name: "Faradios" },
    { sym: "nF", val: r.nanofarads,  name: "Nanofaradios" },
    { sym: "pF", val: r.picofarads,  name: "Picofaradios" },
  ].map(c => `
    <div class="conv-item">
      <div class="ci-symbol">${c.sym}</div>
      <div class="ci-value">${Calculator.fmt(c.val)}</div>
      <div class="ci-name">${c.name}</div>
    </div>`).join("");

  // E12
  const e = r.nearest_e12;
  $("e12Row").innerHTML = `
    <span class="e12-label">VALOR E12 MÁS CERCANO</span>
    <strong>${e.label}</strong>
    <span style="font-size:10px;color:var(--text2)">(error: ${e.error_pct.toFixed(1)}%)</span>`;

  // Energía
  $("rtab-energy").innerHTML = `<div class="energy-grid">
    ${r.voltage_energy.map(e => `
      <div class="energy-item">
        <div class="ei-volt">${e.voltage} V</div>
        <div class="ei-val">${e.mJ < 1 ? (e.mJ*1000).toFixed(2) + ' μJ' : e.mJ < 1000 ? e.mJ.toFixed(3) + ' mJ' : e.joules.toFixed(4) + ' J'}</div>
        <div class="ei-unit">energía</div>
      </div>`).join("")}
  </div>`;

  // Reactancia a 50Hz
  const xc = Calculator.reactance(r.microfarads, 50);
  $("rtab-reactance").innerHTML = `
    <div class="xc-single">
      <div class="xc-val">${xc.ohms > 1e6 ? xc.ohms.toExponential(3) : xc.ohms < 1 ? xc.ohms.toFixed(4) : xc.ohms.toFixed(2)} Ω</div>
      <div class="xc-unit">a 50 Hz · ${Calculator.fmt(r.microfarads)} μF</div>
    </div>`;

  $("resultCard").style.display  = "block";
  $("resultCard").scrollIntoView({ behavior: "smooth", block: "nearest" });

  // Disable inputs
  ["ampInput","ufInput","convInput"].forEach(id => { const el = $(id); if(el) el.disabled = true; });
  $("calcBtn").disabled = true;
}

function resetResult() {
  State.currentResult = null;
  $("resultCard").style.display = "none";
  ["ampInput","ufInput","convInput"].forEach(id => { const el = $(id); if(el) { el.disabled = false; el.value = ""; } });
  $("calcBtn").disabled = false;
  $("errorMsg").classList.remove("show");
}

$("resetBtn").addEventListener("click", resetResult);

// Result sub-tabs
QA(".rtab").forEach(btn => {
  btn.addEventListener("click", () => {
    QA(".rtab").forEach(b => b.classList.remove("active"));
    QA(".rtab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(`rtab-${btn.dataset.rtab}`).classList.add("active");
  });
});

// ── Save / Copy ───────────────────────────────────────
$("saveBtn").addEventListener("click", () => {
  if (!State.currentResult) return;
  State.history.unshift(State.currentResult);
  if (State.history.length > 100) State.history.pop();
  localStorage.setItem("cc_hist", JSON.stringify(State.history));
  showToast("✓ Guardado en historial", "ok");
});

$("copyBtn").addEventListener("click", () => {
  if (!State.currentResult) return;
  const r = State.currentResult;
  const text = [
    `DC Electricista — CapCalc`,
    `Entrada: ${r.input_amps} A`,
    `= ${Calculator.fmt(r.microfarads)} μF`,
    `= ${Calculator.fmt(r.millifarads)} mF`,
    `= ${Calculator.fmt(r.farads)} F`,
    `= ${Calculator.fmt(r.nanofarads)} nF`,
    `= ${Calculator.fmt(r.picofarads)} pF`,
    `E12: ${r.nearest_e12.label}`,
  ].join("\n");
  navigator.clipboard.writeText(text)
    .then(() => showToast("📋 Copiado al portapapeles", "info"))
    .catch(() => showToast("No se pudo copiar", "warn"));
});

// ── RC Tool ───────────────────────────────────────────
$("rcCalcBtn").addEventListener("click", () => {
  const R = parseFloat($("rcR").value);
  const C = parseFloat($("rcC").value);
  try {
    const rc = Calculator.rcTime(R, C);
    const res = $("rcResult");
    res.innerHTML = [
      ["τ (tau)",        `${Calculator.fmt(rc.tau_s)} s = ${Calculator.fmt(rc.tau_ms)} ms`],
      ["Carga al 63%",   `${Calculator.fmt(rc.t_63 * 1000)} ms`],
      ["Carga al 86%",   `${Calculator.fmt(rc.t_86 * 1000)} ms`],
      ["Carga al 95%",   `${Calculator.fmt(rc.t_95 * 1000)} ms`],
      ["Carga al 98%",   `${Calculator.fmt(rc.t_98 * 1000)} ms`],
      ["Carga al 99%",   `${Calculator.fmt(rc.t_99 * 1000)} ms`],
    ].map(([l, v]) => `<div class="tr-row"><span class="tr-label">${l}</span><span class="tr-value">${v}</span></div>`).join("");
    res.classList.add("show");
  } catch(e) {
    showToast("⚠ " + e.message, "warn");
  }
});

// ── Serie / Paralelo ──────────────────────────────────
let capCount = 3;
$("addCapBtn").addEventListener("click", () => {
  if (capCount >= 6) { showToast("Máximo 6 capacitores", "warn"); return; }
  capCount++;
  const row = document.createElement("div");
  row.className = "cap-row";
  row.innerHTML = `<span class="cap-lbl">C${capCount}</span><input class="cap-in" type="number" placeholder="μF" min="0" step="any" inputmode="decimal"/>`;
  $("capInputs").appendChild(row);
});

function getCapValues() {
  return [...QA(".cap-in")].map(el => parseFloat(el.value)).filter(v => !isNaN(v) && v > 0);
}

function showSpResult(vals, total, type) {
  const res = $("spResult");
  const label = type === "series" ? "En serie" : "En paralelo";
  const color = type === "series" ? "" : "amber";
  res.innerHTML = `
    <div class="tr-row"><span class="tr-label">${label} (${vals.length} caps)</span></div>
    <div class="tr-row"><span class="tr-label">Total</span><span class="tr-value ${color}">${Calculator.fmt(total)} μF</span></div>
    <div class="tr-row"><span class="tr-label">= F</span><span class="tr-value">${Calculator.fmt(total/1e6)} F</span></div>
    <div class="tr-row"><span class="tr-label">= nF</span><span class="tr-value">${Calculator.fmt(total*1e3)} nF</span></div>`;
  res.classList.add("show");
}

$("seriesBtn").addEventListener("click", () => {
  const vals = getCapValues();
  if (vals.length < 2) { showToast("Ingresá al menos 2 valores", "warn"); return; }
  showSpResult(vals, Calculator.series(vals), "series");
});

$("parallelBtn").addEventListener("click", () => {
  const vals = getCapValues();
  if (vals.length < 2) { showToast("Ingresá al menos 2 valores", "warn"); return; }
  showSpResult(vals, Calculator.parallel(vals), "parallel");
});

// ── Reactancia Tool ───────────────────────────────────
QA(".freq-preset").forEach(btn => {
  btn.addEventListener("click", () => {
    QA(".freq-preset").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    $("xcF").value = btn.dataset.f;
  });
});

$("xcCalcBtn").addEventListener("click", () => {
  const C = parseFloat($("xcC").value);
  const F = parseFloat($("xcF").value);
  try {
    if (isNaN(C)||C<=0) throw new Error("Capacitancia inválida");
    if (isNaN(F)||F<=0) throw new Error("Frecuencia inválida");
    const xc = Calculator.reactance(C, F);
    const res = $("xcResult");
    const fmtOhm = v => v > 1e6 ? v.toExponential(3)+" Ω" : v >= 1000 ? Calculator.fmt(v/1000)+" kΩ" : Calculator.fmt(v)+" Ω";
    res.innerHTML = `
      <div class="tr-row"><span class="tr-label">Xc</span><span class="tr-value">${fmtOhm(xc.ohms)}</span></div>
      <div class="tr-row"><span class="tr-label">Frecuencia</span><span class="tr-value amber">${F} Hz</span></div>
      <div class="tr-row"><span class="tr-label">Capacitancia</span><span class="tr-value">${C} μF</span></div>`;
    res.classList.add("show");
  } catch(e) {
    showToast("⚠ " + e.message, "warn");
  }
});

// ── History ───────────────────────────────────────────
function renderHistory(filter = "") {
  const list = $("historyList");
  let items = State.history;
  if (filter) {
    items = items.filter(r =>
      String(r.input_amps).includes(filter) ||
      String(r.microfarads).includes(filter)
    );
  }
  if (!items.length) {
    list.innerHTML = `<div class="history-empty">
      ${filter ? "Sin resultados para esa búsqueda." : "No hay cálculos guardados.\nRealizá un cálculo y presioná Guardar."}
    </div>`;
    return;
  }
  list.innerHTML = items.map((r, i) => `
    <div class="history-item">
      <div class="hi-badge">${(i+1).toString().padStart(2,"0")}</div>
      <div class="hi-body">
        <div class="hi-main">${Calculator.fmt(r.input_amps,6)} A → <b>${Calculator.fmt(r.microfarads)} μF</b></div>
        <div class="hi-sub">${Calculator.fmt(r.millifarads)} mF · ${Calculator.fmt(r.farads)} F · ${Calculator.fmt(r.nanofarads)} nF</div>
      </div>
      <div class="hi-meta">
        <span class="hi-time">${Calculator.fmtTime(new Date(r.timestamp))}</span>
        <span class="hi-date">${Calculator.fmtDate(new Date(r.timestamp))}</span>
      </div>
    </div>`).join("");
}

$("histSearch").addEventListener("input", e => renderHistory(e.target.value.trim()));

$("clearHistBtn").addEventListener("click", () => {
  if (!State.history.length) return;
  State.history = [];
  localStorage.removeItem("cc_hist");
  renderHistory();
  showToast("Historial limpiado", "warn");
});

// ── Export CSV ────────────────────────────────────────
$("exportBtn").addEventListener("click", () => {
  if (!State.history.length) { showToast("No hay datos para exportar", "warn"); return; }
  const header = "Fecha,Hora,Amperes,microF,milliF,F,nF,pF";
  const rows = State.history.map(r => {
    const d = new Date(r.timestamp);
    return [
      Calculator.fmtDate(d), Calculator.fmtTime(d),
      r.input_amps, r.microfarads, r.millifarads, r.farads, r.nanofarads, r.picofarads,
    ].join(",");
  });
  const csv  = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `capcalc_historial_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast("📥 CSV exportado", "ok");
});

// ── Init ──────────────────────────────────────────────
$("ampInput").focus();
