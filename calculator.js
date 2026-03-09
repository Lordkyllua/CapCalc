/**
 * calculator.js
 * Módulo de lógica de cálculo de capacitores.
 * No tiene dependencias del DOM — pura lógica reutilizable.
 */

const Calculator = (() => {

  const CONSTANT = 0.07; // dV/dt asumido

  /**
   * Calcula la capacitancia a partir de la corriente.
   * @param {number} amps - Corriente en Amperes
   * @returns {object} Objeto con todas las conversiones
   */
  function calculate(amps) {
    if (isNaN(amps) || amps <= 0) {
      throw new Error("El valor de corriente debe ser un número mayor a cero.");
    }

    const microfarads  = amps / CONSTANT;
    const millifarads  = microfarads / 1_000;
    const farads       = microfarads / 1_000_000;
    const nanofarads   = microfarads * 1_000;
    const picofarads   = microfarads * 1_000_000;

    return {
      input:       amps,
      microfarads,
      millifarads,
      farads,
      nanofarads,
      picofarads,
      timestamp:   new Date(),
    };
  }

  /**
   * Formatea un número para mostrar, manejando magnitudes extremas.
   * @param {number} n
   * @param {number} decimals
   * @returns {string}
   */
  function format(n, decimals = 4) {
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e9)  return n.toExponential(2);
    if (abs >= 1e6)  return n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
    if (abs < 0.001) return n.toExponential(3);
    // Remove trailing zeros
    const str = parseFloat(n.toPrecision(decimals)).toString();
    return str.replace(".", ",");
  }

  /**
   * Formatea una fecha como HH:MM:SS
   */
  function formatTime(date) {
    return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return { calculate, format, formatTime, CONSTANT };

})();
