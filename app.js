/**
 * app.js
 * Lógica principal de la UI: eventos, historial, tabs, canvas animado.
 */

// ── Estado global ─────────────────────────────────────
const State = {
  history: JSON.parse(localStorage.getItem("capcalc_history") || "[]"),
  currentResult: null,
};

// ── Elementos del DOM ─────────────────────────────────
const $ = (id) => document.getElementById(id);

const els = {
  ampInput:    $("ampInput"),
  calcBtn:     $("calcBtn"),
  errorMsg:    $("errorMsg"),
  resultEmpty: $("resultEmpty"),
  resultData:  $("resultData"),
  inputEcho:   $("inputEcho"),
  mainResult:  $("mainResult"),
  mfResult:    $("mfResult"),
  fResult:     $("fResult"),
  nfResult:    $("nfResult"),
  pfResult:    $("pfResult"),
  saveBtn:     $("saveBtn"),
  copyBtn:     $("copyBtn"),
  resetBtn:    $("resetBtn"),
  historyList: $("historyList"),
  clearHistory:$("clearHistory"),
  toast:       $("toast"),
};

// ── Canvas animado ────────────────────────────────────
function initCanvas() {
  const canvas = $("bgCanvas");
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  // Partículas flotantes tipo componentes electrónicos
  class Particle {
    constructor() { this.reset(true); }
    reset(random = false) {
      this.x  = Math.random() * W;
      this.y  = random ? Math.random() * H : H + 10;
      this.vy = -(0.15 + Math.random() * 0.3);
      this.vx = (Math.random() - 0.5) * 0.15;
      this.size   = 1 + Math.random() * 2;
      this.alpha  = 0.1 + Math.random() * 0.25;
      this.color  = Math.random() > 0.5 ? "#00e5ff" : "#ffab00";
      this.type   = Math.floor(Math.random() * 3); // 0=dot, 1=cross, 2=square
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < -20) this.reset();
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.strokeStyle = this.color;
      ctx.fillStyle   = this.color;
      ctx.lineWidth   = 0.8;
      const s = this.size;
      if (this.type === 0) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, s, 0, Math.PI * 2);
        ctx.fill();
      } else if (this.type === 1) {
        ctx.beginPath();
        ctx.moveTo(this.x - s, this.y);
        ctx.lineTo(this.x + s, this.y);
        ctx.moveTo(this.x, this.y - s);
        ctx.lineTo(this.x, this.y + s);
        ctx.stroke();
      } else {
        ctx.strokeRect(this.x - s, this.y - s, s * 2, s * 2);
      }
      ctx.restore();
    }
  }

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  // Líneas de circuito
  const lines = Array.from({ length: 8 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    len: 40 + Math.random() * 120,
    angle: Math.floor(Math.random() * 4) * (Math.PI / 2),
    alpha: 0.04 + Math.random() * 0.06,
    color: Math.random() > 0.5 ? "#00e5ff" : "#1c2e45",
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Líneas estáticas tipo PCB
    lines.forEach(l => {
      ctx.save();
      ctx.globalAlpha = l.alpha;
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + Math.cos(l.angle) * l.len, l.y + Math.sin(l.angle) * l.len);
      ctx.stroke();
      // nodo
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Toast ─────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "info") {
  const t = els.toast;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

// ── Tabs ──────────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
    if (btn.dataset.tab === "history") renderHistory();
  });
});

// ── Calcular ──────────────────────────────────────────
function runCalculation() {
  const raw = parseFloat(els.ampInput.value);
  els.errorMsg.classList.remove("show");

  let result;
  try {
    result = Calculator.calculate(raw);
  } catch {
    els.errorMsg.classList.add("show");
    els.ampInput.focus();
    return;
  }

  State.currentResult = result;

  // Actualizar UI
  els.inputEcho.textContent = `Entrada: ${Calculator.format(result.input, 6)} A`;
  els.mainResult.textContent = Calculator.format(result.microfarads);
  els.mfResult.textContent   = Calculator.format(result.millifarads);
  els.fResult.textContent    = Calculator.format(result.farads);
  els.nfResult.textContent   = Calculator.format(result.nanofarads);
  els.pfResult.textContent   = Calculator.format(result.picofarads);

  els.resultEmpty.style.display = "none";
  els.resultData.classList.add("show");
  els.calcBtn.disabled      = true;
  els.ampInput.disabled     = true;
}

els.calcBtn.addEventListener("click", runCalculation);
els.ampInput.addEventListener("keydown", e => { if (e.key === "Enter") runCalculation(); });
els.ampInput.addEventListener("input", () => els.errorMsg.classList.remove("show"));

// ── Presets ───────────────────────────────────────────
document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    resetUI();
    els.ampInput.value = btn.dataset.val;
    els.ampInput.focus();
  });
});

// ── Reset ─────────────────────────────────────────────
function resetUI() {
  els.ampInput.value        = "";
  els.ampInput.disabled     = false;
  els.calcBtn.disabled      = false;
  els.resultData.classList.remove("show");
  els.resultEmpty.style.display = "";
  State.currentResult       = null;
  els.ampInput.focus();
}
els.resetBtn.addEventListener("click", resetUI);

// ── Guardar ───────────────────────────────────────────
els.saveBtn.addEventListener("click", () => {
  if (!State.currentResult) return;
  State.history.unshift(State.currentResult);
  if (State.history.length > 50) State.history.pop(); // max 50
  localStorage.setItem("capcalc_history", JSON.stringify(State.history));
  showToast("✓ Cálculo guardado", "success");
});

// ── Copiar ────────────────────────────────────────────
els.copyBtn.addEventListener("click", () => {
  if (!State.currentResult) return;
  const r = State.currentResult;
  const text =
    `Entrada: ${r.input} A\n` +
    `Resultado: ${Calculator.format(r.microfarads)} μF\n` +
    `= ${Calculator.format(r.millifarads)} mF\n` +
    `= ${Calculator.format(r.farads)} F\n` +
    `= ${Calculator.format(r.nanofarads)} nF\n` +
    `= ${Calculator.format(r.picofarads)} pF`;
  navigator.clipboard.writeText(text)
    .then(() => showToast("📋 Copiado al portapapeles", "info"))
    .catch(() => showToast("No se pudo copiar", ""));
});

// ── Historial ─────────────────────────────────────────
function renderHistory() {
  const list = els.historyList;
  if (State.history.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <p>No hay cálculos guardados aún.</p>
      <p class="empty-sub">Realizá un cálculo y presioná "Guardar".</p>
    </div>`;
    return;
  }
  list.innerHTML = State.history.map((r, i) => `
    <div class="history-item">
      <span class="hi-num">${i + 1}</span>
      <div class="hi-body">
        <div class="hi-main">${r.input} A → <span>${Calculator.format(r.microfarads)} μF</span></div>
        <div class="hi-sub">${Calculator.format(r.millifarads)} mF · ${Calculator.format(r.farads)} F · ${Calculator.format(r.nanofarads)} nF</div>
      </div>
      <div class="hi-time">${Calculator.formatTime(new Date(r.timestamp))}</div>
    </div>
  `).join("");
}

els.clearHistory.addEventListener("click", () => {
  State.history = [];
  localStorage.removeItem("capcalc_history");
  renderHistory();
  showToast("Historial eliminado", "");
});

// ── Init ──────────────────────────────────────────────
initCanvas();
els.ampInput.focus();
