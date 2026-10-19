// Created at: 2026-10-16 02:00
/**
 * @fileoverview Utilitários puros para manipulação e formatação de datas e horários escolares.
 */

export const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MONTH_NAMES_PT_LOWER = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

/**
 * Formata um objeto Date para ISO YYYY-MM-DD.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateISO(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formata um objeto Date para DD/MM/AAAA.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateBR(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Formata um objeto Date para DD/MM.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateShort(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}`;
}

/**
 * Converte string ISO YYYY-MM-DD para DD/MM/AAAA.
 * @param {string} isoStr
 * @returns {string}
 */
export function isoToDDMMAAAA(isoStr) {
  if (!isoStr || typeof isoStr !== "string" || !isoStr.includes("-")) return isoStr || "";
  const [y, m, d] = isoStr.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/**
 * Analisa uma entrada de data nos formatos DD/MM/AAAA ou YYYY-MM-DD para YYYY-MM-DD.
 * @param {string} str
 * @returns {string|null}
 */
export function parseDateInputToISO(str) {
  if (!str || typeof str !== "string") return null;
  const s = str.trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const dia = dmyMatch[1].padStart(2, "0");
    const mes = dmyMatch[2].padStart(2, "0");
    const ano = dmyMatch[3];
    return `${ano}-${mes}-${dia}`;
  }
  const ymdMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const ano = ymdMatch[1];
    const mes = ymdMatch[2].padStart(2, "0");
    const dia = ymdMatch[3].padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

/**
 * Cria uma data com hora segura ao meio-dia para evitar deslocamentos de fuso.
 * @param {string} isoDateKey - String YYYY-MM-DD.
 * @returns {Date}
 */
export function parseDateKey(isoDateKey) {
  const [y, m, d] = isoDateKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/**
 * Verifica se um ano é bissexto.
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  const y = Number(year);
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Calcula a semana ISO-8601 (1 a 53).
 * @param {Date} date
 * @returns {number}
 */
export function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

/**
 * Deriva semestre e ano no formato "1º Sem / YYYY".
 * @param {Date} date
 * @returns {string}
 */
export function deriveSemesterYear(date) {
  const month = date.getMonth() + 1;
  const sem = month <= 6 ? "1º Sem" : "2º Sem";
  return `${sem} / ${date.getFullYear()}`;
}

/**
 * Deriva semestre e ano no código "01/YYYY" ou "02/YYYY".
 * @param {Date} date
 * @returns {string}
 */
export function deriveSemesterCode(date) {
  const month = date.getMonth() + 1;
  const sem = month <= 6 ? "01" : "02";
  return `${sem}/${date.getFullYear()}`;
}

/**
 * Converte string no formato "HH:MM" para minutos inteiros.
 * @param {string} timeStr
 * @returns {number}
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Converte minutos inteiros para string "HH:MM".
 * @param {number} totalMinutes
 * @returns {string}
 */
export function minutesToHHMM(totalMinutes) {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Interpreta uma carga horária em horas (ex: 40, "40", "40h", "33:50") e converte para minutos.
 * @param {number|string} cargaHoraria
 * @returns {number} Minutos totais.
 */
export function parseCargaHorariaToMinutes(cargaHoraria) {
  if (typeof cargaHoraria === "number") {
    return Math.round(cargaHoraria * 60);
  }
  if (!cargaHoraria || typeof cargaHoraria !== "string") return 0;

  const raw = cargaHoraria.trim().toLowerCase().replace("h", "").trim();
  if (raw.includes(":")) {
    const [h, m] = raw.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const parsedNum = parseFloat(raw);
  return isNaN(parsedNum) ? 0 : Math.round(parsedNum * 60);
}

/**
 * Formata data por extenso: "São Paulo, DD de MMMM de AAAA".
 * @param {Date} [dateObj]
 * @returns {string}
 */
export function formatDateExtensoBR(dateObj) {
  const d = dateObj || new Date();
  const dia = String(d.getDate()).padStart(2, "0");
  const mesNome = MONTH_NAMES_PT_LOWER[d.getMonth()] || "janeiro";
  const ano = d.getFullYear();
  return `São Paulo, ${dia} de ${mesNome} de ${ano}`;
}
