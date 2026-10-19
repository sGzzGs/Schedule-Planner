// Created at: 2026-10-16 02:00
/**
 * @fileoverview Algoritmo Canônico de Páscoa (Meeus/Jones/Butcher).
 * Determina o Domingo de Páscoa para qualquer ano no calendário Gregoriano.
 */

/**
 * Calcula a data do Domingo de Páscoa para um determinado ano.
 * @param {number} year - Ano com 4 dígitos (ex: 2026).
 * @returns {Date} Instância de Date ao meio-dia local para evitar problemas de fuso horário.
 */
export function calculateEasterSunday(year) {
  const y = Number(year);
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  // Meio-dia (12:00:00) para garantir estabilidade em fuso horário
  return new Date(y, month - 1, day, 12, 0, 0);
}
