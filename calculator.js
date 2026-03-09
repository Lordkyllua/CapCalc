/**
 * calculator.js — Lógica de cálculo de capacitores
 * DC Electricista · CapCalc PWA
 */

const Calculator = (() => {

  // ── Constantes ──────────────────────────────────────
  const FORMULA_CONSTANT = 0.07; // dV/dt estándar

  // Tabla de colores de bandas de capacitores
  const COLOR_CODES = {
    negro:   { value: 0, color: "#000000", text: "#fff" },
    marrón:  { value: 1, color: "#8B4513", text: "#fff" },
    rojo:    { value: 2, color: "#FF0000", text: "#fff" },
    naranja: { value: 3, color: "#FF8C00", text: "#000" },
    amarillo:{ value: 4, color: "#FFD700", text: "#000" },
    verde:   { value: 5, color: "#228B22", text: "#fff" },
    azul:    { value: 6, color: "#0000FF", text: "#fff" },
    violeta: { value: 7, color: "#8B008B", text: "#fff" },
    gris:    { value: 8, color: "#808080", text: "#fff" },
    blanco:  { value: 9, color: "#FFFFFF", text: "#000" },
  };

  // Series estándar de capacitores (E12)
  const E12_SERIES = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

  // ── Cálculo principal ────────────────────────────────
  function fromAmps(amps) {
    if (isNaN(amps) || amps <= 0) throw new Error("Ingresá un valor mayor a cero");
    const microfarads = amps / FORMULA_CONSTANT;
    return buildResult(microfarads, amps);
  }

  function fromMicrofarads(uF) {
    if (isNaN(uF) || uF <= 0) throw new Error("Ingresá un valor mayor a cero");
    const amps = uF * FORMULA_CONSTANT;
    return buildResult(uF, amps);
  }

  function buildResult(uF, amps) {
    return {
      input_amps:   amps,
      microfarads:  uF,
      millifarads:  uF / 1e3,
      farads:       uF / 1e6,
      nanofarads:   uF * 1e3,
      picofarads:   uF * 1e6,
      nearest_e12:  nearestE12(uF),
      voltage_energy: computeEnergy(uF),
      timestamp:    new Date(),
    };
  }

  // ── Conversión directa entre unidades ────────────────
  function convert(value, fromUnit) {
    if (isNaN(value) || value <= 0) throw new Error("Valor inválido");
    const toUF = { "F": 1e6, "mF": 1e3, "uF": 1, "nF": 1e-3, "pF": 1e-6 };
    if (!toUF[fromUnit]) throw new Error("Unidad desconocida");
    const uF = value * toUF[fromUnit];
    return buildResult(uF, uF * FORMULA_CONSTANT);
  }

  // ── Carga y descarga RC ──────────────────────────────
  function rcTime(resistance_ohms, capacitance_uF) {
    if (isNaN(resistance_ohms) || resistance_ohms <= 0) throw new Error("Resistencia inválida");
    if (isNaN(capacitance_uF)  || capacitance_uF  <= 0) throw new Error("Capacitancia inválida");
    const C_farads = capacitance_uF / 1e6;
    const tau = resistance_ohms * C_farads; // segundos
    return {
      tau_s:   tau,
      tau_ms:  tau * 1e3,
      tau_us:  tau * 1e6,
      t_63:    tau,
      t_86:    tau * 2,
      t_95:    tau * 3,
      t_98:    tau * 4,
      t_99:    tau * 5,
    };
  }

  // ── Energía almacenada E = ½ C V² ────────────────────
  function computeEnergy(uF, voltages = [5, 12, 24, 48, 110, 220]) {
    const C = uF / 1e6;
    return voltages.map(v => ({
      voltage: v,
      joules:  0.5 * C * v * v,
      mJ:      0.5 * C * v * v * 1000,
    }));
  }

  // ── Capacitores en serie y paralelo ─────────────────
  function series(values_uF) {
    if (!values_uF.length) return 0;
    const inv = values_uF.reduce((acc, c) => acc + (c > 0 ? 1/c : 0), 0);
    return inv > 0 ? 1 / inv : 0;
  }

  function parallel(values_uF) {
    return values_uF.reduce((acc, c) => acc + (c > 0 ? c : 0), 0);
  }

  // ── Valor E12 más cercano ────────────────────────────
  function nearestE12(uF) {
    const exp = Math.floor(Math.log10(uF));
    const mantissa = uF / Math.pow(10, exp);
    let closest = E12_SERIES[0], minDiff = Infinity;
    for (const v of E12_SERIES) {
      const diff = Math.abs(v - mantissa);
      if (diff < minDiff) { minDiff = diff; closest = v; }
    }
    const result = closest * Math.pow(10, exp);
    return { value: result, label: formatE12(result), error_pct: Math.abs((result - uF)/uF*100) };
  }

  function formatE12(uF) {
    if (uF >= 1e6) return `${(uF/1e6).toPrecision(3)} F`;
    if (uF >= 1e3) return `${(uF/1e3).toPrecision(3)} mF`;
    if (uF >= 1)   return `${uF.toPrecision(3)} μF`;
    if (uF >= 1e-3) return `${(uF*1e3).toPrecision(3)} nF`;
    return `${(uF*1e6).toPrecision(3)} pF`;
  }

  // ── Reactancia capacitiva Xc = 1/(2πfC) ─────────────
  function reactance(uF, freq_hz = 50) {
    const C = uF / 1e6;
    const Xc = 1 / (2 * Math.PI * freq_hz * C);
    return { ohms: Xc, kohms: Xc/1000, freq: freq_hz };
  }

  // ── Formateo ─────────────────────────────────────────
  function fmt(n, sig = 5) {
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e10) return n.toExponential(2);
    if (abs >= 1e6)  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
    if (abs < 1e-6)  return n.toExponential(3);
    if (abs < 0.01)  return n.toExponential(3);
    const p = parseFloat(n.toPrecision(sig));
    return p.toString().replace(".", ",");
  }

  function fmtTime(d) {
    return d.toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("es-AR", { day:"2-digit", month:"2-digit", year:"numeric" });
  }

  return {
    fromAmps, fromMicrofarads, convert,
    rcTime, computeEnergy, series, parallel,
    reactance, nearestE12,
    COLOR_CODES, E12_SERIES, FORMULA_CONSTANT,
    fmt, fmtTime, fmtDate,
  };

})();
